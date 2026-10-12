// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HostSession } from "../features/connections/model/protocol";
import type { Block } from "../features/sessions/model/session";
import { SurfaceVisibilityContext } from "../shared/ui/SurfaceVisibility";
import { MobileSessionTranscript } from "./MobileSessionViews";
import { createSessionSnapshotStore } from "./sessionSnapshotStore";
import { applyReducedMotion } from "../shared/lib/reducedMotion";

let root: Root;
let app: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  app = document.createElement("div");
  app.className = "mobile-app";
  document.body.append(app);
  root = createRoot(app);
});
afterEach(() => {
  act(() => root.unmount());
  app.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  applyReducedMotion("system");
  vi.unstubAllGlobals();
});

const user: Block = { id: "user", role: "user", text: "Review" };
const reply = (text: string, id = "reply"): Block => ({ id, role: "assistant", text, streaming: true });
const text = "离开会话期间已经收到的消息应当直接显示。".repeat(12);
const replies = () => [...app.querySelectorAll(".agent-markdown")].map(node => node.textContent);

function mount(blocks: Block[], historyLoading = false) {
  const initial: HostSession = {
    projectId: "project", revision: 1, updatedAt: 1, status: "running", runId: "run",
    session: { id: "session", title: "Review", cwd: "/repo", harness: "codex", model: "test",
      modelSettings: {}, runtimeMode: "supervised", blocks },
  };
  const store = createSessionSnapshotStore(initial);
  let props: ComponentProps<typeof MobileSessionTranscript> = {
    store, sessionId: "session", initialSnapshot: initial, historyLoading,
    disabled: false, onCommand: () => {},
  };
  const render = (next: Partial<typeof props> = {}, visible = true) => {
    props = { ...props, ...next };
    act(() => root.render(createElement(SurfaceVisibilityContext.Provider, { value: visible },
      createElement(MobileSessionTranscript, props))));
  };
  const update = (next: Block[]) => act(() => store.set({
    ...initial, revision: store.get()!.revision + 1, session: { ...initial.session, blocks: next },
  }));
  render();
  return { render, update, store };
}

it("shows restored history immediately and paces only subsequent output", () => {
  const { render, update } = mount([user, reply("Cached")], true);
  update([user, reply(text), reply(text, "second")]);
  expect(replies()).toEqual([text, text]);
  render({ historyLoading: false });
  expect(replies()).toEqual([text, text]);
  update([user, reply(text), reply(text + text, "second")]);
  expect(replies()).toEqual([text, text]);
  act(() => vi.advanceTimersByTime(2000));
  expect(replies()).toEqual([text, text + text]);
});

it.each(["drawer", "page"])("skips background output when returning from a hidden %s", (kind) => {
  const animate = vi.spyOn(Element.prototype, "animate");
  const entrances = () => animate.mock.contexts.filter(node => node.hasAttribute("data-transcript-content-motion")).length;
  const { render, update } = mount([user, reply("")]);
  update([user, reply(text)]);
  act(() => vi.advanceTimersByTime(100));
  expect(replies()[0]!.length).toBeGreaterThan(0);
  expect(replies()[0]!.length).toBeLessThan(text.length);
  render({ active: kind !== "drawer" }, kind !== "page");
  const beforeReturn = entrances();
  update([user, reply(text + text), reply(text, "second")]);
  render({ active: true });
  expect(replies()).toEqual([text + text, text]);
  expect(entrances()).toBe(beforeReturn);
  update([user, reply(text + text), reply(text + text, "second")]);
  expect(replies()).toEqual([text + text, text]);
  act(() => vi.advanceTimersByTime(2000));
  expect(replies()).toEqual([text + text, text + text]);
});

it("shows new messages immediately without movement when reduced motion is enabled", () => {
  applyReducedMotion("on");
  const animate = vi.spyOn(Element.prototype, "animate");
  const { update } = mount([user]);
  update([user, reply(text)]);
  expect(replies()).toEqual([text]);
  expect(animate.mock.contexts.filter(node => node.hasAttribute("data-transcript-content-motion"))).toHaveLength(0);
});

it("types the first reply inside its motion container and drains the final chunk", () => {
  const { render, update } = mount([user]);
  render({ animateFrom: user.id });
  update([user, reply(text)]);
  expect(replies()).toEqual([""]);
  act(() => vi.advanceTimersByTime(100));
  const partial = replies()[0]!;
  expect(partial.length).toBeGreaterThan(0);
  expect(partial.length).toBeLessThan(text.length);
  update([user, { ...reply(text + text), streaming: false }]);
  expect(replies()).toEqual([partial]);
  act(() => vi.advanceTimersByTime(2000));
  expect(replies()).toEqual([text + text]);
  expect(app.querySelector(".agent-markdown")!.closest("[data-transcript-content-motion]")).not.toBeNull();
  expect(app.querySelector("[data-word-fade]")).toBeNull();
});

it.each(["assistant", "reasoning"] as const)("keeps the running row mounted when the first %s output arrives", (role) => {
  const { update } = mount([user]);
  const running = app.querySelector('.transcript-turn [role="status"]');
  expect(running).not.toBeNull();
  const row = running!.closest(".zen-fold-item");
  act(() => vi.advanceTimersByTime(400));
  const output: Block = { id: "first-output", role, text: "Starting", streaming: true };
  update([user, output]);
  expect(app.querySelector('.transcript-turn [role="status"]')).toBe(running);
  expect(running!.closest(".zen-fold-item")).toBe(row);
  update([user, { ...output, text: "Starting the response" }]);
  expect(app.querySelector('.transcript-turn [role="status"]')).toBe(running);
});

it("does not remount the running shimmer between send acknowledgement and the first reply", () => {
  const { render, update, store } = mount([user, { ...reply("Previous reply"), streaming: false }]);
  act(() => store.set({ ...store.get()!, status: "idle" }));
  const outgoing = { id: "next-user", text: "Hello", startedAt: Date.now(), placement: "transcript" as const };
  render({ outgoing });
  const recorded: Block = { ...outgoing, role: "user", turnModel: { harness: "codex", id: "test", name: "GPT-6-Astra" } };
  const history = [user, { ...reply("Previous reply"), streaming: false }, recorded];
  update(history);
  const runningText = app.querySelector(".transcript-turn-live .transcript-live-fold-title")!;
  expect(runningText).not.toBeNull();
  expect(runningText.classList.contains("shimmer-text")).toBe(true);
  const row = runningText.closest(".zen-fold-item");
  act(() => vi.advanceTimersByTime(400));
  render({ outgoing: undefined, animateFrom: recorded.id });
  const reasoning: Block = { id: "thinking", role: "reasoning", text: "", streaming: true };
  for (const output of [
    [reasoning],
    [{ ...reasoning, text: "Considering the greeting" }],
    [{ ...reasoning, streaming: false, text: "Considering the greeting" }, reply("", "next-reply")],
    [{ ...reasoning, streaming: false, text: "Considering the greeting" }, reply("Hello!", "next-reply")],
  ]) {
    update([...history, ...output]);
    expect(app.querySelectorAll(".transcript-turn-live .transcript-live-fold-title")).toHaveLength(1);
    expect(app.querySelector(".transcript-turn-live .transcript-live-fold-title")).toBe(runningText);
    expect(runningText.closest(".zen-fold-item")).toBe(row);
    expect(row!.getAttribute("data-fold-state")).toBe("open");
  }
});

it("keeps the running shimmer mounted when work becomes collapsible", () => {
  const { update } = mount([{ ...user, sending: true }]);
  const runningText = app.querySelector(".transcript-live-fold-title");
  expect(runningText).not.toBeNull();
  expect(runningText!.classList.contains("shimmer-text")).toBe(true);
  const row = runningText!.closest(".zen-fold-item");
  const reasoning: Block = { id: "reasoning", role: "reasoning", text: "Thinking", streaming: true };
  update([user]);
  update([user, reasoning]);
  expect(app.querySelector(".transcript-live-fold-title")).toBe(runningText);
  const tool: Block = { id: "tool", role: "tool", text: "Inspect", tool: { kind: "shell", status: "completed" } };
  update([user, reasoning, tool]);
  update([user, { ...reasoning, streaming: false }, tool, reply("Hello")]);
  const toggle = row!.querySelector<HTMLButtonElement>('button[aria-label="Show the work"]')!;
  expect(toggle).not.toBeNull();
  expect(row!.querySelector(".transcript-live-fold-title")).toBe(runningText);
  act(() => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(row!.querySelector(".transcript-live-fold-title")).toBe(runningText);
  act(() => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
});

it.each(["assistant", "reasoning", "tool"] as const)("slides a new %s message once without replaying on text updates", (role) => {
  const animate = vi.spyOn(Element.prototype, "animate");
  const entrances = () => animate.mock.contexts.filter(node => node.hasAttribute("data-transcript-content-motion"));
  const { update } = mount([user]);
  expect(entrances()).toHaveLength(0);
  const output: Block = { id: "new-output", role, text: "Received content", streaming: true,
    ...(role === "tool" ? { tool: { kind: "shell" as const, status: "in_progress" as const } } : {}) };
  update([user, output]);
  expect(entrances()).toHaveLength(1);
  update([user, { ...output, text: "Received content with another chunk" }]);
  expect(entrances()).toHaveLength(1);
});


it.each(["", "已有文字。"])("paces a completed snapshot that grows an existing reply (%s)", initial => {
  const { update } = mount([user, { ...reply(initial), streaming: false }]);
  update([user, { ...reply(initial + text), streaming: false }]);
  expect(replies()).toEqual([initial]);
  act(() => vi.advanceTimersByTime(100));
  expect(replies()[0]!.length).toBeGreaterThan(initial.length);
  expect(replies()[0]!.length).toBeLessThan(initial.length + text.length);
  act(() => vi.advanceTimersByTime(2000));
  expect(replies()).toEqual([initial + text]);
});

it("keeps the live status inside its AI turn as output grows", () => {
  const { update } = mount([user]);
  const footer = app.querySelector(".agent-transcript .transcript-turn [data-live-footer]");
  expect(footer).not.toBeNull();
  expect(app.querySelector(".mobile-live-footer-dock")).toBeNull();
  for (const received of [text, text + text]) {
    update([user, reply(received)]);
    act(() => vi.advanceTimersByTime(100));
    expect(app.querySelector("[data-live-footer]")).toBe(footer);
    expect(app.querySelectorAll("[data-live-footer]")).toHaveLength(1);
  }
});
