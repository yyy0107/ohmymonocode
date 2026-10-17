import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import { prepareWslHost, serveBridge } from "./wsl-bridge.mjs";

let directory: string;
let entry: string;
let socket: string;
let server: Server;
let rejection = 0;
const requests: unknown[] = [];
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "monocode-wsl-test-"));
  entry = join(directory, "fake-host.mjs");
  socket = process.platform === "win32" ? `\\\\.\\pipe\\monocode-wsl-${randomUUID()}` : join(directory, "rpc.sock");
  rejection = 0;
  requests.length = 0;
  // Exercise subprocess argument passing, startup and credential persistence.
  writeFileSync(entry, `
    import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
    import { join } from 'node:path';
    const args = process.argv.slice(2);
    const dir = args[args.indexOf('--data-dir') + 1];
    appendFileSync(join(dir, 'calls'), args.slice(0, args.indexOf('--data-dir')).join(' ') + '\\n');
    if (args[0] === 'start') writeFileSync(join(dir, 'running'), '{}');
    else if (args[0] === 'connection-info') console.log(readFileSync(join(dir, 'running'), 'utf8'));
    else if (args[0] === 'pair') console.log(JSON.stringify({id: 'device', token: 'valid-token', environmentId: 'linux-env'}));
    else process.exit(1);
  `);
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      if (rejection) { response.writeHead(rejection).end("{}"); return; }
      if (request.headers.authorization !== "Bearer valid-token") { response.writeHead(401).end("{}"); return; }
      requests.push(JSON.parse(body));
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ result: { protocolVersion: 1, environmentId: "linux-env" } }));
    });
  });
  await new Promise<void>((resolve) => server.listen(socket, resolve));
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(directory, { recursive: true, force: true });
});
const calls = () => readFileSync(join(directory, "calls"), "utf8").trim().split("\n");

it("starts once on a free port and socket, and reuses the credential", async () => {
  const first = await prepareWslHost(entry, directory, socket);
  const second = await prepareWslHost(entry, directory, socket);
  expect(second).toEqual(first);
  expect(first).toEqual({ environmentId: "linux-env" });
  expect(calls().filter((call) => call.startsWith("start"))).toEqual([`start --port 0 --socket ${socket}`]);
  expect(calls().filter((call) => call === "pair --name MonoCode Windows desktop --json")).toHaveLength(1);
  expect(calls()).not.toContain("stop");
});

it("re-pairs a revoked credential without restarting the running Host", async () => {
  await prepareWslHost(entry, directory, socket);
  writeFileSync(join(directory, "desktop-credential.json"), JSON.stringify({ token: "revoked" }));
  await prepareWslHost(entry, directory, socket);
  expect(JSON.parse(readFileSync(join(directory, "desktop-credential.json"), "utf8"))).toEqual({ token: "valid-token" });
  expect(calls().filter((call) => call.startsWith("start"))).toHaveLength(1);
});

it("does not issue credentials or restart on a Host server failure", async () => {
  await prepareWslHost(entry, directory, socket);
  rejection = 500;
  await expect(prepareWslHost(entry, directory, socket)).rejects.toThrow("Could not verify");
  expect(calls().filter((call) => call.startsWith("pair"))).toHaveLength(1);
  expect(calls().filter((call) => call.startsWith("start"))).toHaveLength(1);
});

it("relays frames with the Linux credential and reports a vanished Host as undelivered", async () => {
  await prepareWslHost(entry, directory, socket);
  const input = new PassThrough();
  const output = new PassThrough();
  const frames: Record<string, unknown>[] = [];
  let pending = "";
  output.on("data", (chunk) => {
    pending += chunk;
    for (let index; (index = pending.indexOf("\n")) >= 0; pending = pending.slice(index + 1))
      frames.push(JSON.parse(pending.slice(0, index)));
  });
  const bridge = serveBridge(directory, socket, input, output);
  const until = async (count: number) => { while (frames.length < count) await new Promise((r) => setTimeout(r, 5)); };
  input.write(`${JSON.stringify({ id: 7, request: { version: 1, method: "environment.describe" } })}\n`);
  await until(2);
  expect(frames[0]).toEqual({ ready: 1 });
  expect(frames[1]).toEqual({ id: 7, status: 200, body: { result: { protocolVersion: 1, environmentId: "linux-env" } } });
  expect(requests.at(-1)).toEqual({ version: 1, method: "environment.describe" });
  expect(JSON.stringify(frames)).not.toContain("valid-token");

  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  input.write(`${JSON.stringify({ id: 8, request: { version: 1, method: "environment.describe" } })}\n`);
  await bridge;
  expect(frames.at(-1)).toEqual({ id: 8, unreachable: true });
  await new Promise<void>((resolve) => server.listen(socket, resolve));
});
