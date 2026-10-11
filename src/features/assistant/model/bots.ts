import type { RemoteProvider } from "../../connections/model/protocol";
import type { AssistantLifecycle, AssistantView } from "./assistant";

/** Host identity is supplied by the connection, never by a client-owned field. */
export type BotScope = { botId: string; threadId: string };
export type BotThreadKind = "direct" | "automatic" | "delegation" | "room";
export type BotModelOverride = {
  harness: RemoteProvider;
  model: string;
  modelSettings?: Record<string, string>;
};
export type BotView = AssistantView & {
  defaultThreadId: string;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
};
export type BotThread = {
  id: string;
  botId: string;
  kind: BotThreadKind;
  title: string;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
  revision: number;
  modelOverride?: BotModelOverride;
  lifecycle: AssistantLifecycle;
  chatRevision: number;
};
/** Existing chat consumers retain the AssistantView shape. */
export type BotThreadView = AssistantView & BotScope & {
  title: string;
  archivedAt?: number;
};
export type BotsSnapshot = {
  revision: number;
  bots: BotView[];
  threads: BotThread[];
  defaultBotId?: string;
  defaultThreadId?: string;
};

export function botCacheKey(environmentId: string, scope: BotScope): string {
  return JSON.stringify([environmentId, scope.botId, scope.threadId]);
}
