import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AssistantHistory, AssistantMessage, AssistantMessages } from "./assistant";
import { mergeAssistantMessages, type AssistantRpc } from "./assistantClient";
import { assistantReadRevision, subscribeAssistantRead, unreadAssistantMessages } from "./assistantUnread";
import { botCacheKey, type BotThread } from "./bots";

type ThreadFeed = { revision: number; messages: AssistantMessage[]; previewLoaded?: boolean };

/** Read only changed, unread thread deltas; never share cursors across Bots. */
export function useBotUnread(environmentId: string, threads: BotThread[], rpc: AssistantRpc, active: boolean) {
  const feeds = useRef(new Map<string, ThreadFeed>());
  const [, changed] = useState(0);
  const [, readChanged] = useReducer((value: number) => value + 1, 0);
  useEffect(() => subscribeAssistantRead(readChanged), []);
  const signature = JSON.stringify(threads.filter((thread) => !thread.archivedAt)
    .map(({ botId, id, chatRevision }) => ({ botId, threadId: id, chatRevision })));
  const scopes = useMemo(() => JSON.parse(signature) as { botId: string; threadId: string; chatRevision: number }[], [signature]);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    for (const scope of scopes) {
      const key = botCacheKey(environmentId, scope);
      const feed: ThreadFeed = feeds.current.get(key) ?? { revision: assistantReadRevision(key), messages: [] };
      feeds.current.set(key, feed);
      const read = assistantReadRevision(key);
      if (feed.previewLoaded && scope.chatRevision <= Math.max(feed.revision, read)) continue;
      void (async () => {
        try {
          if (!feed.previewLoaded) {
            const preview = await rpc<AssistantHistory>("botThreads.messages", { botId: scope.botId, threadId: scope.threadId, latest: true, limit: 1 });
            if (disposed) return;
            feed.messages = mergeAssistantMessages(feed.messages, preview.entries);
            feed.previewLoaded = true;
            changed((value) => value + 1);
          }
          let more = scope.chatRevision > Math.max(feed.revision, assistantReadRevision(key));
          while (more && !disposed) {
            const page = await rpc<AssistantMessages>("botThreads.messages", {
              botId: scope.botId, threadId: scope.threadId,
              afterRevision: Math.max(feed.revision, assistantReadRevision(key)), limit: 100,
            });
            if (disposed) return;
            feed.revision = page.nextRevision;
            feed.messages = mergeAssistantMessages(feed.messages, page.entries);
            more = page.hasMore;
            changed((value) => value + 1);
          }
        } catch { /* Preserve the last observed unread state until the next snapshot. */ }
      })();
    }
    return () => { disposed = true; };
  }, [environmentId, scopes, threads, rpc, active]);
  return new Map(threads.map((thread) => {
    const key = botCacheKey(environmentId, { botId: thread.botId, threadId: thread.id });
    const messages = feeds.current.get(key)?.messages ?? [];
    const latest = [...messages].reverse().find((message) =>
      (message.kind === "assistant" || message.kind === "user") && (message.text.trim() || message.attachments?.length));
    return [key, { count: unreadAssistantMessages(key, messages).length, latest, messages }] as const;
  }));
}
