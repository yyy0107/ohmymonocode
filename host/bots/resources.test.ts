import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { HostStore } from "../store";
import { checkoutExecutionPrefix, checkoutPath, claimCheckoutResource, claimCheckoutWrite, withCheckoutIntegration, withCheckoutOwner, withCheckoutRemoval } from "../checkout-guards";
import { HostResourceBusyError, HostResourceGuard, withHostResources } from "./resources";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "bot-resources-"));
  const path = join(root, "project"); mkdirSync(path);
  const database = join(root, "host.db"), store = new HostStore(database);
  cleanups.push(() => { store.close(); rmSync(root, { force: true, recursive: true }); });
  return { root, path, database, store, guard: new HostResourceGuard(store) };
}

it("atomically excludes parent/child paths and a Host-wide computer while keeping separate projects runnable", () => {
  const f = fixture();
  const secondStore = new HostStore(f.database); cleanups.push(() => secondStore.close());
  const second = new HostResourceGuard(secondStore);
  expect(f.guard.acquire("run-a", { workingDirectory: f.path, computer: true })).toBe(true);
  expect(second.acquire("run-b", { workingDirectory: join(f.path, "nested") })).toBe(false);
  expect(second.acquire("run-b", { workingDirectory: f.root })).toBe(false);
  expect(second.acquire("run-b", { workingDirectory: `${f.path}-2`, computer: true })).toBe(false);
  // A failed multi-resource request does not leak its otherwise available path.
  expect(second.acquire("run-c", { workingDirectory: `${f.path}-2` })).toBe(true);
  expect(f.store.db.prepare("SELECT * FROM checkout_resources").all()).toHaveLength(3);
  f.guard.release("run-a");
  expect(second.acquire("run-b", { paths: [join(f.path, "nested")], computer: true })).toBe(true);
  second.close();
  expect(f.store.db.prepare("SELECT * FROM checkout_resources").all()).toEqual([]);
});

it("allows trusted same-run writes without releasing another claim or an untrusted native writer", async () => {
  const f = fixture(), engine = new HostResourceGuard(f.store);
  expect(f.guard.acquire("bot-run", { workingDirectory: f.path })).toBe(true);
  expect(engine.acquire("bot-run", { workingDirectory: f.path })).toBe(true);
  expect(() => claimCheckoutWrite(f.store, "native-write", join(f.path, "file"))).toThrow("another run");
  const read = claimCheckoutResource(f.store, "reader", f.path);
  await expect(withHostResources(f.store, "other", { paths: [f.path] }, async () => true)).rejects.toBeInstanceOf(HostResourceBusyError);
  await withHostResources(f.store, "bot-run", { paths: [f.path] }, async () => {
    await Promise.resolve();
    const release = claimCheckoutWrite(f.store, "control-write", join(f.path, "file"));
    // Reentering during an asynchronous write still belongs to this run.
    await withHostResources(f.store, "bot-run", { paths: [f.path] }, async () => true);
    release();
  });
  await expect(withCheckoutIntegration(f.store, [f.path], async () => true)).rejects.toThrow("being changed");
  engine.release("bot-run"); engine.release("bot-run");
  expect(() => claimCheckoutWrite(f.store, "still-blocked", f.path)).toThrow("another run");
  f.guard.release("bot-run");
  claimCheckoutWrite(f.store, "now-writable", f.path)();
  read();
  expect(f.store.db.prepare("SELECT * FROM checkout_resources").all()).toEqual([]);
});

it("recovers dead owners but keeps parked providers' cleanup protection separate from turn availability", async () => {
  const f = fixture();
  f.store.db.prepare("INSERT INTO checkout_resources VALUES ('dead-turn', ?, 'executing', 0)").run(checkoutPath(f.path));
  f.store.db.prepare("INSERT INTO checkout_resources VALUES ('dead-computer', '@host-computer', 'computer', 0)").run();
  const parked = claimCheckoutResource(f.store, "host-provider:parked", f.path);
  expect(f.guard.acquire("next-turn", { workingDirectory: f.path, computer: true })).toBe(true);
  f.guard.release("next-turn");
  await expect(withCheckoutRemoval(f.store, f.path, async () => true)).rejects.toThrow("Close files and terminals");
  parked();
  await expect(withCheckoutRemoval(f.store, f.path, async () => true)).resolves.toBe(true);
});

it("cleans only this guard's unique claims after failures, late releases, and close", async () => {
  const f = fixture(), other = new HostResourceGuard(f.store);
  expect(f.guard.acquire("same-run", { workingDirectory: f.path })).toBe(true);
  await expect(withHostResources(f.store, "same-run", { paths: [f.path] }, async () => { throw new Error("write failed"); })).rejects.toThrow("write failed");
  expect(f.store.db.prepare("SELECT * FROM checkout_resources").all()).toHaveLength(1);
  expect(other.acquire("same-run", { workingDirectory: f.path })).toBe(true);
  f.guard.close(); f.guard.release("same-run");
  expect(f.store.db.prepare("SELECT * FROM checkout_resources").all()).toHaveLength(1);
  other.close();
  const activeWrite = claimCheckoutWrite(f.store, "ordinary-write", f.path);
  expect(f.guard.acquire("waiting", { workingDirectory: f.path })).toBe(false);
  activeWrite();
  expect(f.guard.acquire("waiting", { workingDirectory: f.path })).toBe(true);
  f.guard.close();
});

it("resolves symlink aliases and still distinguishes sibling path prefixes", () => {
  const f = fixture(), other = new HostResourceGuard(f.store);
  const alias = join(f.root, "alias"); symlinkSync(f.path, alias, process.platform === "win32" ? "junction" : "dir");
  expect(f.guard.acquire("one", { paths: [join(alias, "future")] })).toBe(true);
  expect(other.acquire("two", { paths: [f.path] })).toBe(false);
  expect(other.acquire("two", { paths: [`${f.path}-copy`] })).toBe(true);
  f.guard.close(); other.close();
});

it("lets trusted orchestration integrate its own settled worker without exempting foreign execution or active writes", async () => {
  const f = fixture();
  expect(f.guard.acquire("orchestration:lead", { workingDirectory: f.path })).toBe(true);
  await expect(withCheckoutIntegration(f.store, [f.path], async () => true)).rejects.toThrow("being changed");
  await expect(withCheckoutOwner(f.store, "other-lead", () => withCheckoutIntegration(f.store, [f.path], async () => true))).rejects.toThrow("being changed");
  await withCheckoutOwner(f.store, "orchestration:lead", async () => {
    expect(await withCheckoutIntegration(f.store, [f.path], async () => true)).toBe(true);
    const release = claimCheckoutWrite(f.store, "pending-write", f.path);
    await expect(withCheckoutIntegration(f.store, [f.path], async () => true)).rejects.toThrow("being changed");
    release();
  });
  f.guard.close();
});

it("never treats a surviving process's matching owner identity as local reentry", async () => {
  const f = fixture();
  const id = `${checkoutExecutionPrefix("same-logical-run")}prior-process`;
  f.store.db.prepare("INSERT INTO checkout_resources VALUES (?, ?, 'executing', ?)").run(id, checkoutPath(f.path), process.ppid);
  expect(f.guard.acquire("same-logical-run", { workingDirectory: f.path })).toBe(false);
  await withCheckoutOwner(f.store, "same-logical-run", async () => {
    expect(() => claimCheckoutWrite(f.store, "own-write", f.path)).toThrow("another run");
    await expect(withCheckoutIntegration(f.store, [f.path], async () => true)).rejects.toThrow("being changed");
  });
  f.guard.close();
  expect(f.store.db.prepare("SELECT id FROM checkout_resources WHERE id=?").get(id)).toBeDefined();
});
