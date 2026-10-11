import { randomUUID } from "node:crypto";
import type { HostStore } from "../store";
import { checkoutExecutionPrefix, checkoutPath, checkoutPathsOverlap, checkoutResources, initCheckoutGuards, withCheckoutOwner } from "../checkout-guards";

export type HostResourceRequest = { workingDirectory?: string; paths?: string[]; computer?: boolean };
const COMPUTER_RESOURCE = "@host-computer";
export const HOST_RESOURCE_BUSY_MESSAGE = "The requested project or computer is in use by another run. Retry when it finishes.";

export class HostResourceBusyError extends Error {
  readonly code = "RESOURCE_BUSY";
  constructor() { super(HOST_RESOURCE_BUSY_MESSAGE); }
}

/**
 * Active turn leases share the native checkout reservation table. Parked provider
 * processes and open editors retain their `resource` rows for removal safety,
 * but do not count as a busy turn. No timeout can evict a live process's lease.
 */
export class HostResourceGuard {
  private held = new Map<string, { signature: string; ids: string[] }>();
  constructor(private readonly store: HostStore) { initCheckoutGuards(store); }

  acquire(owner: string, request: HostResourceRequest): boolean {
    if (!owner) throw new Error("A Host-owned run identity is required");
    const paths = [...new Set([...(request.paths ?? []), ...(request.workingDirectory ? [request.workingDirectory] : [])].map(checkoutPath))].sort();
    const signature = JSON.stringify([paths, !!request.computer]);
    const existing = this.held.get(owner);
    if (existing) {
      if (existing.signature !== signature) throw new Error("A run cannot change its held resource request");
      return true;
    }
    const prefix = checkoutExecutionPrefix(owner);
    const claims = paths.map((path) => ({ path, kind: "executing" }));
    if (request.computer) claims.push({ path: COMPUTER_RESOURCE, kind: "computer" });
    const ids = claims.map(() => `${prefix}${randomUUID()}`);
    const acquired = this.store.transaction(() => {
      const rows = checkoutResources(this.store);
      if (rows.some((row) => !(row.owner_pid === process.pid && row.id.startsWith(prefix)) && (row.kind === "computer"
        ? request.computer
        : row.kind !== "resource" && paths.some((path) => checkoutPathsOverlap(path, row.path))))) return false;
      claims.forEach((claim, index) => this.store.db.prepare("INSERT INTO checkout_resources VALUES (?, ?, ?, ?)").run(ids[index], claim.path, claim.kind, process.pid));
      return true;
    });
    if (acquired) this.held.set(owner, { signature, ids });
    return acquired;
  }

  release(owner: string): void {
    const lease = this.held.get(owner);
    if (!lease) return;
    this.held.delete(owner);
    this.store.transaction(() => {
      for (const id of lease.ids)
        this.store.db.prepare("DELETE FROM checkout_resources WHERE id=? AND owner_pid=?").run(id, process.pid);
    });
  }

  close(): void { for (const owner of [...this.held.keys()]) this.release(owner); }
}

/** Short Host-controlled writes join the trusted turn's lease and release only their own rows. */
export async function withHostResources<T>(store: HostStore, owner: string, request: HostResourceRequest, action: () => Promise<T>): Promise<T> {
  const guard = new HostResourceGuard(store);
  if (!guard.acquire(owner, request)) throw new HostResourceBusyError();
  try { return await withCheckoutOwner(store, owner, action); }
  finally { guard.release(owner); }
}
