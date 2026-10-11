// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  keepSessionChanges,
  notifyReviewChanged,
  sessionCheckpointStatus,
  undoSessionChanges,
  type CheckpointFile,
  type CheckpointStatus,
} from "../model/checkpoint";
import { SessionReview } from "./SessionReview";

vi.mock("../model/checkpoint", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../model/checkpoint")>()),
  sessionCheckpointStatus: vi.fn(),
  keepSessionChanges: vi.fn(async () => ({ files: [] })),
  undoSessionChanges: vi.fn(async () => ({ files: [] })),
}));
vi.mock("../../../platform/tauri/fs", () => ({
  basename: (path: string) => path.split("/").pop()!,
  notifyGitChanged: vi.fn(),
  subscribeGitChanged: () => () => {},
}));
vi.mock("../../files/model/fileIndex", () => ({
  invalidateProjectFiles: vi.fn(),
}));
vi.mock("../../files/model/fileWatch", () => ({
  invalidateWatchedFiles: vi.fn(),
}));
vi.mock("../../files/ui/FileTypeIcon", () => ({ FileTypeIcon: () => null }));

let root: Root;
let container: HTMLDivElement;
const onOpenDiff = vi.fn();
const file = (name: string): CheckpointFile => ({
  path: `/repo/${name}`,
  relative: name,
  status: "modified",
  additions: 2,
  deletions: 1,
  exact: true,
  undoable: true,
});
const files = [file("a.ts")];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function render(
  props: Partial<ComponentProps<typeof SessionReview>> = {},
) {
  await act(async () => {
    root.render(
      createElement(SessionReview, {
        sessionId: "s1",
        cwd: "/repo",
        onOpenDiff,
        ...props,
      }),
    );
  });
}
const button = (label: string) =>
  [...container.querySelectorAll("button")].find(
    (element) => element.textContent === label,
  );
const row = (name: string) =>
  container.querySelector<HTMLButtonElement>(`button[title="${name}"]`);
const fold = () => container.querySelector<HTMLElement>(".zen-fold-item");
async function advance(ms = 200) {
  await act(async () => vi.advanceTimersByTimeAsync(ms));
}
async function changed(id = "s1") {
  await act(async () => notifyReviewChanged(id));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  vi.mocked(sessionCheckpointStatus).mockReset().mockResolvedValue({ files });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("waits for the turn to finish before loading and showing captured changes", async () => {
  await render({ busy: true });
  await changed();
  await advance();
  expect(sessionCheckpointStatus).not.toHaveBeenCalled();
  expect(container.querySelector("[data-session-review]")).toBeNull();

  await render();
  expect(sessionCheckpointStatus).toHaveBeenCalledExactlyOnceWith("s1", "/repo");
  expect(row("a.ts")).not.toBeNull();
  expect(button("Keep")!.disabled).toBe(false);
  expect(button("Undo")!.disabled).toBe(false);
  await act(async () => button("Review")!.click());
  expect(onOpenDiff).toHaveBeenLastCalledWith(undefined, {
    sessionId: "s1",
    cwd: "/repo",
  });
  await act(async () => row("a.ts")!.click());
  expect(onOpenDiff).toHaveBeenLastCalledWith("/repo/a.ts", {
    sessionId: "s1",
    cwd: "/repo",
  });
});

it("hides the previous review during the next turn and waits for fresh results afterward", async () => {
  await render();
  expect(row("a.ts")).not.toBeNull();
  const stale = deferred<CheckpointStatus>();
  vi.mocked(sessionCheckpointStatus).mockReturnValueOnce(stale.promise);
  await changed();
  await advance();
  await render({ busy: true });
  await act(async () => stale.resolve({ files: [file("stale.ts")] }));
  await changed();
  await advance();
  expect(container.querySelector("[data-session-review]")).toBeNull();
  expect(sessionCheckpointStatus).toHaveBeenCalledTimes(2);

  const fresh = deferred<CheckpointStatus>();
  vi.mocked(sessionCheckpointStatus).mockReturnValueOnce(fresh.promise);
  await render();
  expect(container.querySelector("[data-session-review]")).toBeNull();
  await act(async () => fresh.resolve({ files: [file("b.ts")] }));
  expect(row("a.ts")).toBeNull();
  expect(row("stale.ts")).toBeNull();
  expect(row("b.ts")).not.toBeNull();
  await act(async () => button("Keep")!.click());
  expect(keepSessionChanges).toHaveBeenCalledWith("s1", "/repo");
  expect(container.querySelector("[data-session-review]")).toBeNull();
});

it("ignores notifications for other sessions after the turn finishes", async () => {
  vi.mocked(sessionCheckpointStatus).mockResolvedValueOnce({ files: [] });
  await render();
  await changed("another-session");
  await advance();
  expect(sessionCheckpointStatus).toHaveBeenCalledTimes(1);
  expect(button("Review")).toBeUndefined();
  await changed();
  await advance();
  expect(row("a.ts")).not.toBeNull();
});

it("coalesces checkpoint notifications without postponing refreshes or overlapping reads", async () => {
  await render();
  const pending = deferred<CheckpointStatus>();
  vi.mocked(sessionCheckpointStatus).mockReturnValueOnce(pending.promise);
  await changed();
  await advance(100);
  await changed();
  await advance(100);
  expect(sessionCheckpointStatus).toHaveBeenCalledTimes(2);
  for (let i = 0; i < 4; i++) {
    await changed();
    await advance(200);
  }
  expect(sessionCheckpointStatus).toHaveBeenCalledTimes(2);
  await act(async () => pending.resolve({ files: [...files, file("b.ts")] }));
  expect(row("b.ts")).not.toBeNull();
  await advance();
  expect(sessionCheckpointStatus).toHaveBeenCalledTimes(3);
});

it("keeps the last review usable through a transient refresh failure", async () => {
  await render();
  vi.mocked(sessionCheckpointStatus).mockRejectedValueOnce(new Error("busy"));
  await changed();
  await advance();
  expect(button("Review")!.disabled).toBe(false);
  expect(row("a.ts")).not.toBeNull();
});

it("labels the complete shared workspace recording and disables undo", async () => {
  vi.mocked(sessionCheckpointStatus).mockResolvedValue({ files, workspaceShared: true });
  await render();
  expect(container.textContent).toContain("Workspace changes this turn (1)");
  expect(container.textContent).toContain("These changes may include their edits; undo is disabled.");
  expect(button("Undo")!.disabled).toBe(true);
  expect(button("Review")!.disabled).toBe(false);
});

it("ignores old reads after the checkout changes or the review is hidden", async () => {
  const old = deferred<CheckpointStatus>();
  vi.mocked(sessionCheckpointStatus).mockReturnValueOnce(old.promise);
  await render();
  vi.mocked(sessionCheckpointStatus).mockResolvedValueOnce({
    files: [file("other.ts")],
  });
  await render({ cwd: "/other" });
  await act(async () => old.resolve({ files }));
  expect(row("a.ts")).toBeNull();
  expect(row("other.ts")).not.toBeNull();
  const hidden = deferred<CheckpointStatus>();
  vi.mocked(sessionCheckpointStatus).mockReturnValueOnce(hidden.promise);
  await changed();
  await advance();
  await render({ cwd: "/other", enabled: false });
  await act(async () => hidden.resolve({ files }));
  await changed();
  await advance();
  expect(row("other.ts")).not.toBeNull();
  expect(sessionCheckpointStatus).toHaveBeenCalledTimes(3);
});

it("retains overflow rows through closing and rapid reversal after a turn", async () => {
  vi.mocked(sessionCheckpointStatus).mockResolvedValue({
    files: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"].map(file),
  });
  await render();
  const toggle = () =>
    container.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
  expect(row("d.ts")).toBeNull();
  await act(async () => toggle().click());
  expect(fold()?.dataset.foldState).toBe("opening");
  await advance(350);
  expect(fold()?.dataset.foldState).toBe("open");
  await act(async () => toggle().click());
  expect(fold()?.dataset.foldState).toBe("closing");
  expect(fold()?.inert).toBe(true);
  expect(row("d.ts")).not.toBeNull();
  await advance(100);
  await act(async () => toggle().click());
  expect(fold()?.dataset.foldState).toBe("opening");
  expect(fold()?.inert).toBe(false);
  await advance(350);
  await act(async () => toggle().click());
  await advance(350);
  expect(row("d.ts")).toBeNull();
  expect(row("a.ts")).not.toBeNull();
});

it.each([true, false])(
  "preserves undo restrictions after a turn finishes (project lock: %s)",
  async (undoLocked) => {
    vi.mocked(sessionCheckpointStatus).mockResolvedValue({
      files: [{ ...files[0], undoable: undoLocked }],
    });
    await render({ undoLocked });
    expect(button("Undo")!.disabled).toBe(true);
    expect(button("Review")!.disabled).toBe(false);
    expect(button("Keep")!.disabled).toBe(false);
  },
);

it("blocks undo while the Host reports another session running in the checkout", async () => {
  vi.mocked(sessionCheckpointStatus).mockResolvedValue({ files, undoLocked: true });
  await render();
  expect(button("Undo")!.disabled).toBe(true);
  expect(button("Undo")!.title).toBe(
    "Undo is unavailable while another session is running in this project",
  );
  expect(button("Keep")!.disabled).toBe(false);
});
