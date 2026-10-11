// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HostSession } from "../features/connections/model/protocol";
import type { Block } from "../features/sessions/model/session";
import { SurfaceVisibilityContext } from "../shared/ui/SurfaceVisibility";
import { MobileSessionTranscript } from "./MobileSessionViews";
import { createSessionSnapshotStore } from "./sessionSnapshotStore";

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
  return { render, update };
}

it("shows restored history immediately after a cached entry, then animates only fresh output", () => {
  const { render, update } = mount([user, reply("Cached")], true);
  update([user, reply(text), reply(text, "second")]);
  expect(replies()).toEqual([text, text]);
  render({ historyLoading: false });
  expect(replies()).toEqual([text, text]);
  update([user, reply(text), reply(text + text, "second")]);
  expect(replies()).toEqual([text, text]);
  act(() => vi.advanceTimersByTime(100));
  expect(replies()[1]!.length).toBeGreaterThan(text.length);
  expect(replies()[1]!.length).toBeLessThan(text.length * 2);
});

it.each(["drawer", "page"])("skips background output when returning from a hidden %s", (kind) => {
  const { render, update } = mount([user, reply("")]);
  update([user, reply(text)]);
  act(() => vi.advanceTimersByTime(100));
  expect(replies()[0]!.length).toBeLessThan(text.length);
  render({ active: kind !== "drawer" }, kind !== "page");
  update([user, reply(text + text), reply(text, "second")]);
  render({ active: true });
  expect(replies()).toEqual([text + text, text]);
  update([user, reply(text + text), reply(text + text, "second")]);
  expect(replies()).toEqual([text + text, text]);
  act(() => vi.advanceTimersByTime(100));
  expect(replies()[1]!.length).toBeGreaterThan(text.length);
  expect(replies()[1]!.length).toBeLessThan(text.length * 2);
});

it("preserves the first reply animation for a newly submitted turn", () => {
  const { render, update } = mount([user]);
  render({ animateFrom: user.id });
  update([user, reply(text)]);
  expect(replies()).toEqual([""]);
  act(() => vi.advanceTimersByTime(100));
  expect(replies()[0]!.length).toBeGreaterThan(0);
  expect(replies()[0]!.length).toBeLessThan(text.length);
});
