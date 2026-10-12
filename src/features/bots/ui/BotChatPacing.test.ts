// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BotChat } from "./BotChat";
import { MobileAssistant } from "../../../mobile/MobileAssistant";
import { fullBotPolicy, type BotMessage } from "../model/botView";

vi.mock("./BotWorkerDetails", () => ({
  BotWorkerDetails: () => null,
}));
let root: Root, node: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(() => {
  act(() => root.unmount());
  node.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}
const text =
  "这是一段没有空格的助理回复，应该像普通会话一样逐字显示，而不是把整批文字直接放进气泡。";
const reply = (streaming: boolean): BotMessage => ({
  id: "reply",
  kind: "assistant",
  text,
  streaming,
  createdAt: 1,
  revision: 1,
});
async function mount(mobile: boolean, initial: BotMessage[] = []) {
  let entries = initial;
  const rpc = vi.fn(async (method: string) => {
    if (method === "environment.describe")
      return { capabilities: ["assistant.v1"] };
    if (method === "assistant.get")
      return {
        id: "a",
        name: "Assistant",
        lifecycle: "running",
        enabled: true,
        triggers: { user: true },
        policy: fullBotPolicy(),
      };
    if (method === "assistant.messages")
      return {
        entries,
        nextRevision: entries.at(-1)?.revision ?? 0,
        hasMore: false,
      };
    if (method === "models.list") return { models: {}, errors: {} };
    return [];
  });
  act(() =>
    root.render(
      createElement(mobile ? MobileAssistant : BotChat, {
        hostKey: "host",
        hostName: "Host",
        rpc: rpc as any,
        onOpen: () => {},
      }),
    ),
  );
  await flush();
  return (next: BotMessage[]) => {
    entries = next;
  };
}
const shown = () =>
  node.querySelector(".assistant-markdown")?.textContent ?? "";
it.each([
  [false, true],
  [false, false],
  [true, true],
  [true, false],
])(
  "shows the first Chinese batch immediately (mobile=%s, streaming=%s), including already completed replies",
  async (mobile, streaming) => {
    const update = await mount(mobile);
    update([reply(streaming)]);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await flush();
    expect(shown()).toBe(text);
    expect(!!node.querySelector(".assistant-message-meta")).toBe(!mobile && !streaming);
    if (streaming) {
      update([{ ...reply(false), revision: 2 }]);
      await act(async () => vi.advanceTimersByTime(250));
      await flush();
      expect(!!node.querySelector(".assistant-message-meta")).toBe(!mobile);
    }
  },
);
it.each([false, true])(
  "shows existing history and later additions immediately (mobile=%s)",
  async (mobile) => {
    const update = await mount(mobile, [reply(true)]);
    expect(shown()).toBe(text);
    const extra = "这里是后来到达的新增文字，也应该逐字展示。";
    update([{ ...reply(false), text: text + extra, revision: 2 }]);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await flush();
    expect(shown()).toBe(text + extra);
  },
);
it.each([false, true])(
  "shows a later short bubble alongside a long received reply (mobile=%s)",
  async (mobile) => {
    const update = await mount(mobile);
    const long = text.repeat(8);
    update([{ ...reply(false), text: long }]);
    await act(async () => vi.advanceTimersByTime(250));
    await flush();
    act(() => vi.advanceTimersByTime(100));
    expect(shown()).toBe(long);
    update([
      { ...reply(false), text: long },
      {
        ...reply(false),
        id: "second",
        text: "完成",
        revision: 2,
        createdAt: 2,
      },
    ]);
    await act(async () => vi.advanceTimersByTime(250));
    await flush();
    const bubbles = () =>
      [...node.querySelectorAll(".assistant-markdown")].map(
        (bubble) => bubble.textContent,
      );
    expect(bubbles()).toHaveLength(2);
    expect(bubbles()).toEqual([long, "完成"]);
  },
);
