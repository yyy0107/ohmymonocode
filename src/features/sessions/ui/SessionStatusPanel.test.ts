// @vitest-environment happy-dom
import { act, createElement, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Block } from "../model/session";
import {
  SessionHeaderActionsContext,
  type SessionHeaderActions,
} from "../../workspace/ui/SessionHeaderActions";
import { SessionStatusPanel } from "./SessionStatusPanel";

vi.mock("../../source-control/ui/BranchPicker", () => ({
  BranchPicker: ({ branch }: { branch?: string }) =>
    createElement("button", { type: "button" }, branch ?? ""),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => path,
}));

const tasks: Block = {
  id: "tasks",
  role: "tasks",
  text: "",
  taskList: {
    items: [
      { text: "Ship", status: "completed" },
      { text: "Verify the capsule", status: "in_progress" },
    ],
  },
};
const agent: Block = {
  id: "agent",
  role: "tool",
  text: "Review the diff",
  tool: { callId: "agent", kind: "Agent", status: "in_progress" },
  agentRun: {
    name: "Review the diff",
    model: "review-model",
    steps: [],
    transcript: [
      { id: "ask", role: "user", text: "Look at the capsule." },
      { id: "reply", role: "assistant", text: "Checking compatibility." },
      {
        id: "nested",
        role: "tool",
        text: "Nested reviewer",
        tool: { callId: "nested", kind: "Agent", status: "in_progress" },
        agentRun: {
          name: "Nested reviewer",
          steps: [],
          transcript: [
            { id: "nested-reply", role: "assistant", text: "Nested record." },
          ],
        },
      },
    ],
  },
};

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function render() {
  const toggleChanges = vi.fn();
  const actions: SessionHeaderActions = {
    rename: vi.fn(),
    archive: vi.fn(),
    splitRight: vi.fn(),
    terminalAvailable: false,
    terminalOpen: false,
    toggleTerminal: vi.fn(),
    changesOpen: false,
    toggleChanges,
  };
  const scope = createRef<HTMLDivElement>();
  scope.current = host;
  act(() => {
    root.render(
      createElement(
        SessionHeaderActionsContext.Provider,
        { value: actions },
        createElement(SessionStatusPanel, {
          sessionId: `status-capsule-${Math.random()}`,
          blocks: [tasks, agent],
          busy: true,
          git: { additions: 3, deletions: 1, files: 2, branch: "master" },
          cwd: "/repo",
          scope,
          onNavigate: vi.fn(),
        }),
      ),
    );
  });
  return { toggleChanges };
}

const capsule = () =>
  host.querySelector<HTMLButtonElement>('[aria-label="Show status"]');
const card = () => host.querySelector<HTMLElement>("[data-subagent-card]");

describe("session status capsule", () => {
  it("leads with the diff and opens a subagent as its own conversation", () => {
    const { toggleChanges } = render();
    const summary = capsule();
    expect(summary?.textContent).toContain("Changes");
    expect(summary?.textContent).toContain("+3");
    expect(summary?.textContent).toContain("-1");
    expect(summary?.textContent).not.toContain("Verify the capsule");

    act(() => summary?.click());
    expect(host.textContent).toContain("Commit or push");
    expect(host.textContent).toContain("Uncommitted changes: 2 files");
    expect(host.textContent).toContain("master");
    const commit = [
      ...host.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.includes("Commit or push"));
    act(() => commit?.click());
    expect(toggleChanges).toHaveBeenCalledOnce();

    const agentRow = [
      ...host.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.includes("Review the diff"));
    act(() => agentRow?.click());
    expect(card()?.textContent).toContain("Checking compatibility.");
    expect(card()?.textContent).toContain("Look at the capsule.");

    const nested = [
      ...card()!.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.includes("Nested reviewer"));
    act(() => nested?.click());
    expect(card()?.getAttribute("aria-label")).toBe("Nested reviewer");
    expect(card()?.textContent).toContain("Nested record.");
    act(() =>
      card()?.querySelector<HTMLButtonElement>('[aria-label="Back"]')?.click(),
    );
    expect(card()?.getAttribute("aria-label")).toBe("Review the diff");
  });
});
