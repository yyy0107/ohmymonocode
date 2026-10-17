import { afterEach, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HostStore } from "./store";

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

it("persists pairing redemption across Host restarts while keeping the phone credential", () => {
  const directory = mkdtempSync(join(tmpdir(), "monocode-pairing-test-"));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "host.db");
  let store = new HostStore(path);
  cleanups.push(() => store.close());
  const first = store.issuePairingDevice("First phone");
  const second = store.issuePairingDevice("Second phone");
  expect(first.token).not.toBe(second.token);
  expect(store.authenticated(first.token)).toBe(false);
  const credential = store.redeemPairingCode(first.token);
  const pairedAt = store.devices().find(device => device.id === first.id)?.pairedAt;
  expect(pairedAt).toEqual(expect.any(Number));
  store.close();
  store = new HostStore(path);
  expect(store.authenticated(credential.token)).toBe(true);
  expect(store.authenticated(first.token)).toBe(false);
  expect(() => store.redeemPairingCode(first.token)).toThrow("Pairing code has already been used");
  expect(store.devices().find(device => device.id === first.id)?.pairedAt).toBe(pairedAt);
  expect(store.redeemPairingCode(second.token).id).toBe(second.id);
});

it("rejects another store connection's attempt after it observed the same pending code", async () => {
  const directory = mkdtempSync(join(tmpdir(), "monocode-pairing-race-test-"));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "host.db");
  const first = new HostStore(path);
  cleanups.push(() => first.close());
  const second = new HostStore(path);
  cleanups.push(() => second.close());
  const issued = first.issuePairingDevice("Phone");
  expect(first.hasPairingCode(issued.token)).toBe(true);
  expect(second.hasPairingCode(issued.token)).toBe(true);
  const attempts = await Promise.allSettled([first, second].map(store =>
    Promise.resolve().then(() => store.redeemPairingCode(issued.token))));
  expect(attempts.filter(attempt => attempt.status === "fulfilled")).toHaveLength(1);
  const rejected = attempts.find(attempt => attempt.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason.message).toContain("already been used");
  const redeemed = attempts.find(attempt => attempt.status === "fulfilled") as PromiseFulfilledResult<{ id: string; token: string }>;
  expect(first.authenticated(redeemed.value.token)).toBe(true);
  expect(second.authenticated(redeemed.value.token)).toBe(true);
});
