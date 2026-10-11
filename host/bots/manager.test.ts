import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { HostStore } from "../store";
import { HostEngine } from "../engine";
import type { HostProvider } from "../providers";
import type { SendTurnInput } from "../../src/integrations/harness/core/types";
import type { BotScope, BotThread, BotView, BotsSnapshot } from "../../src/features/assistant/model/bots";

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

async function setup() {
  const directory = mkdtempSync(join(tmpdir(), "bot-manager-"));
  const store = new HostStore(join(directory, "host.db"));
  const turns: { input: SendTurnInput; finish: () => void }[] = [];
  const provider: HostProvider = {
    send: vi.fn(input => new Promise<void>(finish => turns.push({ input, finish }))),
    stop: vi.fn(async sessionId => { turns.filter(turn => turn.input.sessionId === sessionId).forEach(turn => turn.finish()); }),
    cancel: vi.fn(async sessionId => { turns.filter(turn => turn.input.sessionId === sessionId).forEach(turn => turn.finish()); }),
    bind: vi.fn(), approve: vi.fn(), answer: vi.fn(),
  };
  const engine = new HostEngine(store, { codex: provider });
  cleanups.push(async () => { await engine.close(); store.close(); rmSync(directory, { recursive: true, force: true }); });
  await Promise.all([engine.ready, engine.workflows.ready]);
  engine.bots.setCatalog(async () => ["codex"], async () => ({ models: { codex: [{ id: "test", name: "Test" }, { id: "next", name: "Next" }] }, errors: {} }));
  const createBot = async (name: string) => {
    const created = await engine.bots.rpc("bots.create", {
      commandId: `create-${name}`, patch: { name, harness: "codex", model: "test", triggers: { user: true, event: false, schedule: false } },
    }) as { bot: BotView; thread: BotThread };
    return { botId: created.bot.id, threadId: created.thread.id };
  };
  const createThread = async (botId: string, title: string) => {
    const thread = await engine.bots.rpc("botThreads.create", { commandId: `thread-${title}`, botId, title }) as BotThread;
    return { botId, threadId: thread.id };
  };
  const send = (scope: BotScope, text: string, commandId = "send") => engine.bots.rpc("botThreads.send", { ...scope, text, commandId });
  return { store, engine, provider, turns, createBot, createThread, send };
}

it("serializes sibling threads while another Bot runs, preserving scopes and callback ownership", async () => {
  const { engine, turns, createBot, createThread, send } = await setup();
  const callback = engine.store.onSessionSave;
  const first = await createBot("First"), sibling = await createThread(first.botId, "Sibling"), second = await createBot("Second");
  expect(await engine.bots.rpc("assistant.get", {})).toMatchObject({ id: first.botId });
  expect(engine.store.onSessionSave).toBe(callback);
  await send(first, "First private message");
  await vi.waitFor(() => expect(turns).toHaveLength(1));
  await send(sibling, "Sibling private message");
  await send(second, "Second private message");
  await vi.waitFor(() => expect(turns).toHaveLength(2));
  expect(engine.bots.assistant(sibling).store.pending()).toHaveLength(1);
  expect(engine.bots.assistant(first).store.latestMessages().filter(message => message.kind === "user").map(message => message.text)).toEqual(["First private message"]);
  expect(engine.bots.environment(turns[0].input.sessionId)).not.toEqual(engine.bots.environment(turns[1].input.sessionId));
  await expect(send({ botId: second.botId, threadId: first.threadId }, "Forged")).rejects.toThrow(/belong/);
  turns[0].finish();
  await vi.waitFor(() => expect(turns).toHaveLength(3));
  expect(turns[2].input.text).toContain("Sibling private message");
  expect(turns[2].input.sessionId).not.toBe(turns[0].input.sessionId);
  expect(turns[2].input.cwd).not.toBe(turns[0].input.cwd);
  const snapshot = await engine.bots.rpc("bots.list", {}) as BotsSnapshot;
  expect(snapshot.bots.find(bot => bot.id === first.botId)?.lifecycle).toBe("running");
});

it("keeps approval and cancellation scoped, with pending approval occupying its Bot slot", async () => {
  const { engine, turns, provider, createBot, createThread, send } = await setup();
  const first = await createBot("First"), sibling = await createThread(first.botId, "Sibling"), second = await createBot("Second");
  await send(first, "Needs approval");
  await vi.waitFor(() => expect(turns).toHaveLength(1));
  await send(second, "Independent work");
  await vi.waitFor(() => expect(turns).toHaveLength(2));
  turns[0].input.onEvent({ type: "approval.requested", requestId: 7, title: "Approve this work?" });
  const input = engine.bots.assistant(first).store.latestMessages().find(message => message.kind === "input")!;
  if (input.kind !== "input") throw new Error("Missing approval");
  await send(sibling, "Wait behind approval");
  expect(turns).toHaveLength(2);
  await expect(engine.bots.rpc("botThreads.respond", {
    ...second, commandId: "respond", messageId: input.id, brainGeneration: input.brainGeneration,
    runId: input.runId, requestId: input.requestId, decision: "allow",
  })).rejects.toThrow(/no longer pending/);
  expect(provider.approve).not.toHaveBeenCalled();
  turns[1].input.onEvent({ type: "approval.requested", requestId: 7, title: "Independent approval" });
  const secondInput = engine.bots.assistant(second).store.latestMessages().find(message => message.kind === "input")!;
  if (secondInput.kind !== "input") throw new Error("Missing second approval");
  for (const [scope, message] of [[first, input], [second, secondInput]] as const)
    await engine.bots.rpc("botThreads.respond", {
      ...scope, commandId: "respond", messageId: message.id, brainGeneration: message.brainGeneration,
      runId: message.runId, requestId: message.requestId, decision: "allow",
    });
  await vi.waitFor(() => expect(provider.approve).toHaveBeenCalledTimes(2));
  vi.mocked(provider.stop).mockClear();
  await engine.bots.rpc("botThreads.cancel", { ...sibling, commandId: "cancel-sibling" });
  expect(engine.bots.assistant(first).store.get()?.lifecycle).toBe("running");
  await engine.bots.rpc("assistant.control", { commandId: "cancel-first", action: "cancelTurn" });
  expect(engine.bots.assistant(second).store.get()?.lifecycle).toBe("running");
  expect(provider.stop).not.toHaveBeenCalledWith(turns[1].input.sessionId);
});

it("pauses a whole Bot including newly created threads without repeating an old control", async () => {
  const { engine, turns, createBot, createThread, send } = await setup();
  const scope = await createBot("Paused");
  await engine.bots.rpc("assistant.control", { commandId: "pause", action: "pause" });
  const sibling = await createThread(scope.botId, "After pause");
  await send(sibling, "Run after the Bot resumes");
  await engine.bots.assistant(sibling).managedTick();
  expect(turns).toHaveLength(0);
  expect(engine.bots.store.getBot(scope.botId)?.paused).toBe(true);
  expect(await engine.bots.rpc("botThreads.get", sibling)).toMatchObject({ lifecycle: "paused" });
  await engine.bots.rpc("botThreads.control", { ...sibling, commandId: "pause", action: "resume" });
  await vi.waitFor(() => expect(turns).toHaveLength(1));
  await engine.bots.rpc("bots.control", { botId: scope.botId, commandId: "pause", action: "pause" });
  expect(engine.bots.store.getBot(scope.botId)?.paused).toBe(false);
  expect(engine.bots.assistant(sibling).store.get()?.lifecycle).toBe("running");
});

it("applies model changes on the next turn and preserves a running provider session", async () => {
  const { engine, turns, createBot, send } = await setup();
  const scope = await createBot("Models");
  await send(scope, "Use the original model");
  await vi.waitFor(() => expect(turns).toHaveLength(1));
  const brain = turns[0].input.sessionId;
  await engine.bots.rpc("bots.configure", {
    botId: scope.botId, commandId: "model-change", expectedRevision: engine.bots.store.getBot(scope.botId)!.revision,
    patch: { model: "next" },
  });
  expect(engine.bots.assistant(scope).store.get()?.brainSessionId).toBe(brain);
  expect(engine.bots.assistant(scope).store.get()?.lifecycle).toBe("running");
  await send(scope, "Use the next model", "next-turn");
  turns[0].finish();
  await vi.waitFor(() => expect(turns).toHaveLength(2));
  expect(turns[1].input.model).toBe("next");
  expect(turns[1].input.sessionId).not.toBe(brain);
});

it("validates Bot model defaults independently of its default thread override", async () => {
  const { engine, createBot } = await setup();
  const scope = await createBot("Defaults");
  engine.bots.setCatalog(async () => ["codex", "claude"], async () => ({
    models: { codex: [{ id: "test", name: "Test" }, { id: "next", name: "Next" }], claude: [{ id: "claude-only", name: "Claude" }] }, errors: {},
  }));
  await engine.bots.rpc("botThreads.configure", {
    ...scope, commandId: "override", expectedRevision: engine.bots.store.getThread(scope.botId, scope.threadId)!.revision,
    patch: { modelOverride: { harness: "claude", model: "claude-only" } },
  });
  await engine.bots.rpc("bots.configure", {
    botId: scope.botId, commandId: "default-model", expectedRevision: engine.bots.store.getBot(scope.botId)!.revision,
    patch: { model: "next" },
  });
  expect(engine.bots.store.getBot(scope.botId)).toMatchObject({ harness: "codex", model: "next" });
  expect(await engine.bots.rpc("botThreads.get", scope)).toMatchObject({ harness: "claude", model: "claude-only" });
});

it("archives a running sibling after checking its revision and retries without another cancellation", async () => {
  const { engine, turns, createBot, createThread, send } = await setup();
  const bot = await createBot("Archive"), scope = await createThread(bot.botId, "Archive me");
  await send(scope, "Running work");
  await vi.waitFor(() => expect(turns).toHaveLength(1));
  engine.bots.assistant(scope).store.enqueue({ id: "automatic", kind: "schedule", text: "Pending automatic work", rootCauseId: "automatic", state: "pending", createdAt: Date.now(), attempts: 0 }, "automatic");
  const command = { ...scope, commandId: "archive", expectedRevision: engine.bots.store.getThread(scope.botId, scope.threadId)!.revision };
  vi.spyOn(engine.bots.store, "updateThread").mockImplementationOnce(() => { throw new Error("archive persistence failed"); });
  await expect(engine.bots.rpc("botThreads.archive", command)).rejects.toThrow(/archive persistence failed/);
  const first = await engine.bots.rpc("botThreads.archive", command);
  const revision = engine.bots.assistant(scope).store.get()!.chatRevision;
  expect(await engine.bots.rpc("botThreads.archive", command)).toEqual(first);
  expect(engine.bots.assistant(scope).store.get()!.chatRevision).toBe(revision);
  await engine.bots.assistant(scope).managedTick();
  expect(turns).toHaveLength(1);
  await expect(send(scope, "Archived")).rejects.toThrow(/Restore/);
});
