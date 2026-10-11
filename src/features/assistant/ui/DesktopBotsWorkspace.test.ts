// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { DesktopBotsWorkspace } from "./DesktopBotsWorkspace";
import { fullAssistantPolicy, type AssistantMessage } from "../model/assistant";
import { botCacheKey, type BotView, type BotThread, type BotsSnapshot } from "../model/bots";
import { setUiLanguage } from "../../../shared/i18n/language";

let node: HTMLDivElement, root: Root;
const bot = (id: string): BotView => ({
  id, name: id, defaultThreadId: `${id}-1`, createdAt: 1, updatedAt: 1, revision: 1, chatRevision: 0,
  lifecycle: "idle", enabled: true, harness: "codex", model: "default-model", modelSettings: {},
  runtimeMode: "full-access", targetRuntimeMode: "full-access", policy: fullAssistantPolicy(), policyVersion: 1,
  triggers: { user: true, event: false, schedule: false }, schedules: [], watches: [], maxAutoTurns: 8, chainWindowMinutes: 15, brainGeneration: 1,
});
const thread = (botId: string, id: string): BotThread => ({ botId, id, title: id, kind: "direct", createdAt: 1, updatedAt: 1, revision: 1, lifecycle: "idle", chatRevision: 0 });
let snapshot: BotsSnapshot;
let messages: Record<string, AssistantMessage[]>;
let rpc: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  localStorage.clear();
  setUiLanguage("en");
  snapshot = { revision: 1, bots: [bot("A"), bot("B")], threads: [thread("A", "A-1"), thread("A", "A-2"), thread("B", "B-1")], defaultBotId: "A", defaultThreadId: "A-1" };
  messages = {};
  const view = (id: string) => {
    const target = snapshot.threads.find((thread) => thread.id === id)!;
    const owner = snapshot.bots.find((bot) => bot.id === target.botId)!;
    return { ...owner, ...target.modelOverride, botId: target.botId, threadId: target.id, title: target.title, chatRevision: target.chatRevision };
  };
  rpc = vi.fn(async (method: string, params: Record<string, any> = {}) => {
    if (method === "environment.describe") return { capabilities: ["assistant.v1", "assistant.history", "bots.shell.v1", "bots.v1"] };
    if (method === "bots.list") return { ...snapshot, threads: [...snapshot.threads] };
    if (method === "botThreads.get") return view(params.threadId);
    if (method === "botThreads.messages") {
      const entries = messages[params.threadId] ?? [];
      return { assistant: view(params.threadId), entries: params.latest ? entries.slice(-params.limit) : entries.filter((message) => message.revision > params.afterRevision), nextRevision: view(params.threadId).chatRevision, hasMore: false };
    }
    if (method === "models.list") return { models: { codex: [{ id: "default-model", name: "Default model" }, { id: "thread-model", name: "Thread model" }] }, errors: {} };
    if (method === "projects.list") return [];
    if (method === "bots.create") {
      const created = { ...bot("C"), ...params.patch };
      const createdThread = thread("C", "C-1");
      snapshot = { ...snapshot, bots: [...snapshot.bots, created], threads: [...snapshot.threads, createdThread] };
      return { bot: created, thread: createdThread };
    }
    if (method === "botThreads.create") {
      const created = { ...thread(params.botId, `${params.botId}-new`), title: params.title };
      snapshot = { ...snapshot, threads: [...snapshot.threads, created] };
      return created;
    }
    if (method === "botThreads.send" || method === "bots.configure") return { accepted: true };
    throw new Error(`Unexpected RPC ${method}`);
  });
  node = document.createElement("div"); document.body.append(node); root = createRoot(node);
});
afterEach(() => { act(() => root.unmount()); node.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function flush() { await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); }); }
async function render() {
  act(() => root.render(createElement(DesktopBotsWorkspace, { hostKey: "host", hostName: "Host", rpc: rpc as never, onOpen: () => {}, desktopBots: true })));
  await flush();
}
const active = () => node.querySelector<HTMLElement>('.desktop-bots-thread-surface:not([aria-hidden])')!;
const composer = () => active().querySelector<HTMLTextAreaElement>('.assistant-conversation textarea')!;
function setValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
async function select(label: string) {
  act(() => active().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click());
  await flush();
}
it("retains per-thread drafts and scroll state while routing sends only to the selected scope", async () => {
  await render();
  act(() => setValue(composer(), "Draft A1"));
  const first = composer();
  const log = active().querySelector<HTMLElement>(".assistant-messages")!;
  act(() => { log.scrollTop = 123; log.dispatchEvent(new Event("scroll")); });
  await select("B");
  expect(composer().value).toBe("");
  act(() => setValue(composer(), "Draft B1"));
  await select("A-2");
  expect(composer().value).toBe("");
  act(() => setValue(composer(), "Draft A2"));
  await select("A-1");
  expect(composer()).toBe(first);
  expect(composer().value).toBe("Draft A1");
  expect(log.scrollTop).toBe(123);
  act(() => active().querySelector<HTMLButtonElement>(".assistant-send")!.click());
  await flush();
  expect(rpc.mock.calls.find(([method]) => method === "botThreads.send")?.[1]).toMatchObject({ botId: "A", threadId: "A-1", text: "Draft A1" });
  await select("B");
  expect(composer().value).toBe("Draft B1");
  expect(localStorage.getItem(`monocode.assistant-draft:${botCacheKey("host", { botId: "A", threadId: "A-2" })}`)).toBe("Draft A2");
  expect(rpc.mock.calls.some(([method]) => method.startsWith("assistant."))).toBe(false);
});
it("creates a Bot only after saving its editable draft and creates a named Thread after submission", async () => {
  await render();
  act(() => active().querySelector<HTMLButtonElement>('[aria-label="New bot"]')!.click());
  await flush();
  const draft = node.querySelector<HTMLElement>('.desktop-bots-create:not([aria-hidden])')!;
  expect(rpc.mock.calls.some(([method]) => method === "bots.create")).toBe(false);
  const name = [...draft.querySelectorAll("label")].find((label) => label.textContent?.startsWith("Assistant name"))!.querySelector("input")!;
  act(() => setValue(name, "New colleague"));
  expect(rpc.mock.calls.some(([method]) => method === "bots.create")).toBe(false);
  act(() => draft.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  expect(rpc.mock.calls.find(([method]) => method === "bots.create")?.[1].patch.name).toBe("New colleague");
  expect(active().textContent).toContain("New colleague");
  const newThread = [...active().querySelectorAll<HTMLButtonElement>('[aria-label="New thread"]')].at(-1)!;
  act(() => newThread.click());
  const field = node.querySelector<HTMLInputElement>('[aria-label="Thread name"]')!;
  act(() => setValue(field, "Planning"));
  expect(rpc.mock.calls.some(([method]) => method === "botThreads.create")).toBe(false);
  act(() => field.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  expect(rpc.mock.calls.find(([method]) => method === "botThreads.create")?.[1]).toMatchObject({ botId: "C", title: "Planning" });
  expect(active().querySelector(".desktop-bots-header-title")?.textContent).toContain("Planning");
});
it("edits Bot defaults without copying a Thread model override", async () => {
  snapshot.threads[0].modelOverride = { harness: "codex", model: "thread-model" };
  await render();
  act(() => active().querySelector<HTMLButtonElement>('[aria-label="Bot details"]')!.click());
  await flush();
  const panel = active().querySelector<HTMLElement>(".desktop-bots-inspector")!;
  const name = [...panel.querySelectorAll("label")].find((label) => label.textContent?.startsWith("Assistant name"))!.querySelector("input")!;
  act(() => setValue(name, "Renamed A"));
  act(() => panel.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  expect(rpc.mock.calls.find(([method]) => method === "bots.configure")?.[1]).toMatchObject({ botId: "A", patch: { model: "default-model" } });
});


it("labels an empty stored default title without mutating it", async () => {
  snapshot.threads[0].title = "";
  await render();
  const row = active().querySelector<HTMLButtonElement>('.desktop-bots-thread[aria-current="page"]')!;
  expect(row.getAttribute("aria-label")).toBe("Main thread");
  expect(row.textContent).toContain("Main thread");
  expect(snapshot.threads[0].title).toBe("");
});
