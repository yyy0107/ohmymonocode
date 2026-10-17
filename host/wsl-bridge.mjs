import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// Hosts split large session syncs below this cap; matches the desktop's limit.
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const credentialFile = (directory) => join(directory, "desktop-credential.json");

/**
 * POST one RPC body to the Host's Unix socket. `delivered` is false only when
 * the socket refused the connection, so the request certainly never ran.
 */
export function postSocket(socket, token, body, timeoutMs) {
  return new Promise((done) => {
    let connected = false;
    const request = httpRequest({
      socketPath: socket, method: "POST", path: "/rpc",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Connection: "close" },
      ...(timeoutMs ? { timeout: timeoutMs } : {}),
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          response.destroy();
          done({ delivered: true, error: "Host response is too large" });
        } else chunks.push(chunk);
      });
      response.on("end", () => done({ delivered: true, status: response.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", () => done({ delivered: true, error: "incomplete" }));
    });
    request.on("socket", (socket) => socket.once("connect", () => { connected = true; }));
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", (error) => done(connected || !["ENOENT", "ECONNREFUSED"].includes(error.code)
      ? { delivered: true, error: "incomplete" }
      : { delivered: false }));
    request.end(body);
  });
}

/** Start or reuse the Host, then make sure this desktop holds a valid credential. Nothing secret is printed. */
export async function prepareWslHost(entry, directory, socket) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const run = (...args) => {
    const result = spawnSync(process.execPath, [entry, ...args, "--data-dir", directory], {
      encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024,
    });
    if (result.error || result.status !== 0) throw new Error(result.stderr?.trim() || "Could not start the WSL Host.");
    return result.stdout.trim();
  };
  try { run("connection-info"); } catch {
    // start uses the Host's existing ownership lock; never stop an active Host.
    try { run("start", "--port", "0", "--socket", socket); } catch {
      // A concurrent desktop can win the startup race. Verify the owner below.
    }
    run("connection-info");
  }
  let credential;
  try { credential = JSON.parse(readFileSync(credentialFile(directory), "utf8")); } catch { /* first pairing */ }
  const describe = async (token) => {
    const response = await postSocket(socket, token, JSON.stringify({ version: 1, method: "environment.describe", params: {} }), 5000);
    if (!response.delivered) throw new Error("The running WSL Host does not accept bridge connections. Stop it and connect again.");
    if (response.status === 401 || response.status === 403) return undefined;
    let body;
    try { body = JSON.parse(response.text ?? ""); } catch { /* reported below */ }
    if (response.status !== 200 || body?.error || body?.result?.protocolVersion !== 1 || !body?.result?.environmentId)
      throw new Error("Could not verify the WSL Host identity.");
    return body.result;
  };
  let descriptor = credential?.token ? await describe(credential.token) : undefined;
  if (!descriptor) {
    credential = JSON.parse(run("pair", "--name", "MonoCode Windows desktop", "--json"));
    descriptor = await describe(credential.token);
    if (!descriptor) throw new Error("Could not pair with the WSL Host.");
    const temporary = `${credentialFile(directory)}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify({ token: credential.token }), { mode: 0o600 });
    renameSync(temporary, credentialFile(directory));
  }
  return { environmentId: descriptor.environmentId };
}

/**
 * Relay newline-delimited frames between the desktop (through wsl.exe stdio)
 * and the Host socket. The credential never leaves Linux. Requests run
 * concurrently; each reply carries its request id.
 */
export function serveBridge(directory, socket, input = process.stdin, output = process.stdout) {
  const { token } = JSON.parse(readFileSync(credentialFile(directory), "utf8"));
  const send = (frame) => output.write(`${JSON.stringify(frame)}\n`);
  send({ ready: 1 });
  const lines = createInterface({ input, crlfDelay: Infinity });
  return new Promise((done) => {
    lines.on("line", async (line) => {
      let frame;
      try { frame = JSON.parse(line); } catch { return; }
      if (!Number.isSafeInteger(frame?.id) || !frame.request || typeof frame.request !== "object") return;
      const response = await postSocket(socket, token, JSON.stringify(frame.request));
      if (!response.delivered) {
        // The Host is gone. Exit so the desktop runs setup again and retries.
        send({ id: frame.id, unreachable: true });
        lines.close();
        return;
      }
      if (response.error) { send({ id: frame.id, error: response.error }); return; }
      let body;
      try { body = JSON.parse(response.text); } catch { send({ id: frame.id, error: "Invalid host response" }); return; }
      send({ id: frame.id, status: response.status, body });
    });
    lines.on("close", () => done());
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, entry, directory, socket] = process.argv.slice(2);
  const task = command === "prepare"
    ? prepareWslHost(entry, directory, socket).then(() => undefined)
    : command === "bridge" ? serveBridge(directory, socket) : Promise.reject(new Error("Use prepare or bridge"));
  task.then(
    () => { if (command === "bridge") process.stdout.end(() => process.exit(0)); },
    (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; },
  );
}
