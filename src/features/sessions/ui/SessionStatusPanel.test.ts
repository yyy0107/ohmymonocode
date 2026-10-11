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
import { setUiLanguage } from "../../../shared/i18n/language";

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
  setUiLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  setUiLanguage("en");
  vi.unstubAllGlobals();
});

function render(blocks: Block[] = [tasks, agent], busy = true) {
  const openAgent = vi.fn();
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
  const sessionId = `status-capsule-${Math.random()}`;
  const update = (nextBlocks = blocks) => act(() => {
    root.render(
      createElement(
        SessionHeaderActionsContext.Provider,
        { value: actions },
        createElement(SessionStatusPanel, {
          sessionId,
          blocks: nextBlocks,
          busy,
          git: { additions: 3, deletions: 1, files: 2, branch: "master" },
          cwd: "/repo",
          scope,
          onNavigate: vi.fn(),
          onOpenAgent: openAgent,
        }),
      ),
    );
  });
  update();
  return { toggleChanges, openAgent, update };
}

const capsule = () =>
  host.querySelector<HTMLButtonElement>('[aria-label="Show status"]');
const card = () => host.querySelector<HTMLElement>("[data-subagent-card]");

describe("session status capsule", () => {
  it("counts subagents and safely folds and reopens their list", () => {
    vi.useFakeTimers();
    const { openAgent } = render([agent, { ...agent, id: "second" }]);
    act(() => capsule()?.click());
    act(() => vi.advanceTimersByTime(400));
    const toggle = [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.querySelector("h3")?.textContent === "2 subagents")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    act(() => setUiLanguage("zh-CN"));
    expect(toggle.textContent).toContain("2 个子智能体");
    const section = toggle.closest("section")!;
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(section.querySelector('[data-fold-state="closing"][inert]')?.textContent).toContain("Review the diff");
    act(() => toggle.click());
    act(() => vi.advanceTimersByTime(400));
    expect(section.querySelector('[data-fold-state="open"]')?.hasAttribute("inert")).toBe(false);
    act(() => toggle.click());
    act(() => vi.advanceTimersByTime(400));
    expect(section.textContent).not.toContain("Review the diff");
    expect(toggle.textContent).toContain("2 个子智能体");
    act(() => toggle.click());
    act(() => vi.advanceTimersByTime(400));
    act(() => section.querySelector<HTMLButtonElement>('[title="打开子智能体会话"]')?.click());
    expect(openAgent).toHaveBeenCalled();
  });

  it("leads with the diff and opens a subagent as its own conversation", () => {
    const { toggleChanges, openAgent, update } = render();
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
    expect(openAgent).toHaveBeenCalledWith(agent);
    expect(agentRow?.textContent).toContain("1 step");
    const updatedAgent = { ...agent, agentRun: { ...agent.agentRun!, transcript: [
      ...agent.agentRun!.transcript!,
      { id: "next-tool", role: "tool" as const, text: "Run tests" },
    ] } };
    update([tasks, updatedAgent]);
    expect(agentRow?.textContent).toContain("2 steps");
    act(() => setUiLanguage("zh-CN"));
    expect(agentRow?.textContent).toContain("2 步");
    expect(card()).toBeNull();
    expect(host.textContent).not.toContain("Checking compatibility.");
    expect(host.textContent).not.toContain("Look at the capsule.");
  });

  it("keeps completed and failed agents available after the parent becomes idle", () => {
    const completed = {
      ...agent,
      tool: { ...agent.tool, status: "completed" },
    };
    const failed = {
      ...agent,
      id: "failed",
      agentRun: { ...agent.agentRun!, name: "Failed reviewer" },
      tool: { ...agent.tool, status: "failed" },
    };
    const { openAgent } = render([completed, failed], false);
    act(() => capsule()?.click());
    expect(host.querySelector('[title="Completed"]')).not.toBeNull();
    expect(host.querySelector('[title="Failed"]')).not.toBeNull();
    const rows = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '[title="Open subagent conversation"]',
      ),
    ];
    expect(rows).toHaveLength(2);
    act(() => rows.find((row) => row.textContent?.includes("Failed reviewer"))?.click());
    expect(openAgent).toHaveBeenCalledWith(failed);
    expect(card()).toBeNull();
  });
});
