import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { AssistantChat } from "./AssistantChat";
import { AssistantSettings } from "./AssistantSettings";
import { type AssistantRpc } from "../model/assistantClient";
import type { AssistantPatch } from "../model/assistant";
import { botCacheKey, type BotScope, type BotsSnapshot, type BotThread, type BotView } from "../model/bots";
import { migrateDefaultBotCache, scopedBotRpc } from "../model/botClient";
import { BOT_SELECTION_EVENT, readBotSelection, selectBotThread } from "../model/botSelection";
import { useBotUnread } from "../model/useBotUnread";
import { assistantErrorMessage } from "../model/assistantErrors";
import { REMOTE_PROVIDERS, type HostDescriptor, type HostModelCatalog, type HostProject } from "../../connections/model/protocol";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { SurfaceVisibilityContext, useSurfaceVisibility } from "../../../shared/ui/SurfaceVisibility";
import { AnimatedCollapse } from "../../../shared/ui/AnimatedCollapse";
import { HarnessIcon } from "../../sessions/ui/HarnessIcon";
import { sessionDisplayTitle } from "../../sessions/model/session";
import { Bot, ChevronRight, Loader2, Plus, Search, X } from "../../../shared/ui/icons";

type Props = ComponentProps<typeof AssistantChat>;
const EMPTY_THREADS: BotThread[] = [];

/** Capability boundary: old Hosts keep the unchanged assistant controller. */
export function DesktopBotsWorkspace(props: Props) {
  const visible = useSurfaceVisibility();
  const [descriptor, setDescriptor] = useState<HostDescriptor>();
  const [failure, setFailure] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!visible || descriptor) return;
    let disposed = false;
    void props.rpc<HostDescriptor>("environment.describe", { supportedProviders: REMOTE_PROVIDERS }).then((value) => {
      if (!disposed) { setDescriptor(value); setFailure(undefined); }
    }, (error) => { if (!disposed) setFailure(assistantErrorMessage(error)); });
    return () => { disposed = true; };
  }, [props.rpc, visible, attempt]);
  const rpc = useMemo<AssistantRpc>(() => (method, params) => method === "environment.describe" && descriptor
    ? Promise.resolve(descriptor as never) : props.rpc(method, params), [props.rpc, descriptor]);
  const { t } = useTranslation();
  if (failure && !descriptor) return <div className="assistant-availability" role="alert">
    <p>{t(failure)}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>{t("Retry")}</button>
  </div>;
  if (!descriptor) return <div className="assistant-availability assistant-loading" role="status">
    <Loader2 size={20} className="animate-spin motion-reduce:animate-none" /><span>{t("Connecting…")}</span>
  </div>;
  if (!descriptor.capabilities?.includes("bots.v1")) return <AssistantChat {...props} rpc={rpc} />;
  return <MultiBotWorkspace {...props} rpc={rpc} />;
}

function MultiBotWorkspace(props: Props) {
  const { t } = useTranslation();
  const visible = useSurfaceVisibility();
  const [snapshot, setSnapshot] = useState<BotsSnapshot>();
  const [connectionError, setConnectionError] = useState<string>();
  const [error, setError] = useState<string>();
  const [selection, setSelection] = useState(() => readBotSelection(props.hostKey));
  const [visited, setVisited] = useState<BotScope[]>([]);
  const [creatingBot, setCreatingBot] = useState(false);
  const [creatingThread, setCreatingThread] = useState<string>();
  const [threadName, setThreadName] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<HostModelCatalog>({ models: {}, errors: {} });
  const [projects, setProjects] = useState<HostProject[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "failed">("loading");
  const [draftVersion, setDraftVersion] = useState(0);
  const createCommand = useRef<{ text: string; id: string } | undefined>(undefined);
  const lastThread = useRef(new Map<string, string>());
  const choose = useCallback((scope: BotScope) => {
    setSelection(scope);
    lastThread.current.set(scope.botId, scope.threadId);
    setVisited((current) => current.some((item) => item.botId === scope.botId && item.threadId === scope.threadId) ? current : [...current, scope]);
    setCreatingBot(false);
    setCreatingThread(undefined);
  }, []);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<BotScope & { environmentId: string }>).detail;
      if (detail.environmentId === props.hostKey) choose(detail);
    };
    window.addEventListener(BOT_SELECTION_EVENT, changed);
    return () => window.removeEventListener(BOT_SELECTION_EVENT, changed);
  }, [props.hostKey, choose]);
  const select = useCallback((scope: BotScope) => selectBotThread(props.hostKey, scope), [props.hostKey]);
  const refresh = useCallback(async () => {
    const next = await props.rpc<BotsSnapshot>("bots.list");
    setSnapshot(next);
    setError(undefined);
    return next;
  }, [props.rpc]);
  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await props.rpc<BotsSnapshot>("bots.list");
        if (!disposed) { setSnapshot(next); setConnectionError(undefined); }
      } catch (error) { if (!disposed) setConnectionError(assistantErrorMessage(error)); }
      finally { if (!disposed) timer = setTimeout(poll, 2000); }
    };
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [props.rpc, visible]);
  useEffect(() => {
    if (!snapshot) return;
    const usable = snapshot.threads.filter((thread) => !thread.archivedAt && snapshot.bots.some((bot) => bot.id === thread.botId && !bot.archivedAt));
    const selected = usable.find((thread) => thread.id === selection?.threadId && thread.botId === selection.botId)
      ?? usable.find((thread) => thread.id === snapshot.defaultThreadId && thread.botId === snapshot.defaultBotId)
      ?? usable[0];
    if (!selected) { setSelection(undefined); return; }
    const scope = { botId: selected.botId, threadId: selected.id };
    if (selected.id === snapshot.defaultThreadId && selected.botId === snapshot.defaultBotId)
      migrateDefaultBotCache(props.hostKey, botCacheKey(props.hostKey, scope));
    if (selection?.threadId !== selected.id || selection.botId !== selected.botId) select(scope);
    else setVisited((current) => current.some((item) => item.botId === scope.botId && item.threadId === scope.threadId) ? current : [...current, scope]);
  }, [snapshot, selection, props.hostKey, select]);
  const activity = useBotUnread(props.hostKey, snapshot?.threads ?? EMPTY_THREADS, props.rpc, visible);
  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    try {
      const [models, projects] = await Promise.all([props.rpc<HostModelCatalog>("models.list"), props.rpc<HostProject[]>("projects.list")]);
      setCatalog(models); setProjects(projects); setCatalogState("ready");
    } catch (cause) { setError(assistantErrorMessage(cause)); setCatalogState("failed"); }
  }, [props.rpc]);
  useEffect(() => { if (creatingBot && visible && catalogState === "loading") void loadCatalog(); }, [creatingBot, visible, loadCatalog]);
  const createBot = async (patch: AssistantPatch) => {
    if (busy) return;
    setBusy(true); setError(undefined);
    const text = JSON.stringify(patch);
    if (createCommand.current?.text !== text) createCommand.current = { text, id: crypto.randomUUID() };
    try {
      const result = await props.rpc<{ bot: BotView; thread: BotThread }>("bots.create", { commandId: createCommand.current.id, patch });
      setSnapshot((current) => ({
        revision: (current?.revision ?? 0) + 1,
        ...current,
        bots: [...(current?.bots ?? []).filter((bot) => bot.id !== result.bot.id), result.bot],
        threads: [...(current?.threads ?? []).filter((thread) => thread.id !== result.thread.id), result.thread],
      }));
      createCommand.current = undefined;
      setDraftVersion((value) => value + 1);
      select({ botId: result.bot.id, threadId: result.thread.id });
      void refresh().catch(() => {});
    } catch (cause) { setError(assistantErrorMessage(cause)); }
    finally { setBusy(false); }
  };
  const threadCommand = useRef<{ text: string; id: string } | undefined>(undefined);
  const createThread = async () => {
    if (!creatingThread || !threadName.trim() || busy) return;
    const botId = creatingThread;
    setBusy(true); setError(undefined);
    const text = JSON.stringify([botId, threadName.trim()]);
    if (threadCommand.current?.text !== text) threadCommand.current = { text, id: crypto.randomUUID() };
    try {
      const thread = await props.rpc<BotThread>("botThreads.create", { commandId: threadCommand.current.id, botId, title: threadName.trim() });
      setSnapshot((current) => current && { ...current, threads: [...current.threads.filter((item) => item.id !== thread.id), thread] });
      threadCommand.current = undefined;
      setThreadName("");
      select({ botId, threadId: thread.id });
      void refresh().catch(() => {});
    } catch (cause) { setError(assistantErrorMessage(cause)); }
    finally { setBusy(false); }
  };
  const navigation = <BotNavigation hostName={props.hostName} hostPicker={props.hostPicker}
    snapshot={snapshot} selection={selection} activity={activity} environmentId={props.hostKey}
    onNewBot={() => { setCreatingBot(true); setCreatingThread(undefined); setError(undefined); }}
    onNewThread={(botId) => { setCreatingThread(botId); setThreadName(""); setError(undefined); }}
    onSelectBot={(bot) => {
      const thread = snapshot?.threads.find((thread) => thread.botId === bot.id && thread.id === lastThread.current.get(bot.id) && !thread.archivedAt)
        ?? snapshot?.threads.find((thread) => thread.botId === bot.id && thread.id === bot.defaultThreadId && !thread.archivedAt)
        ?? snapshot?.threads.find((thread) => thread.botId === bot.id && !thread.archivedAt);
      if (thread) select({ botId: bot.id, threadId: thread.id });
    }} onSelectThread={(thread) => select({ botId: thread.botId, threadId: thread.id })} />;
  const draftShown = creatingBot || !selection;
  return <div className="desktop-bots-host">
    {(error || connectionError) && <div className="desktop-bots-error" role="alert">{t(error ?? connectionError!)}<button type="button" onClick={() => { setError(undefined); setConnectionError(undefined); }} aria-label={t("Dismiss")}><X size={14} /></button></div>}
    {visited.map((scope) => {
      const thread = snapshot?.threads.find((thread) => thread.id === scope.threadId && thread.botId === scope.botId);
      const selected = !draftShown && selection?.botId === scope.botId && selection.threadId === scope.threadId;
      return <div key={botCacheKey(props.hostKey, scope)} className="desktop-bots-thread-surface" style={{ display: selected ? "flex" : "none" }} inert={!selected} aria-hidden={!selected || undefined}>
        <SurfaceVisibilityContext.Provider value={visible && selected}>
          <ScopedBotChat {...props} scope={scope} threadTitle={thread?.title} botNavigation={navigation}
            botSettings={snapshot?.bots.find((bot) => bot.id === scope.botId)}
            defaultScope={scope.botId === snapshot?.defaultBotId && scope.threadId === snapshot.defaultThreadId} />
        </SurfaceVisibilityContext.Provider>
      </div>;
    })}
    <div className="assistant-chat desktop-bots-workspace desktop-bots-create" style={{ display: draftShown ? "grid" : "none" }} inert={!draftShown} aria-hidden={!draftShown || undefined}>
      <SurfaceVisibilityContext.Provider value={visible && draftShown}>
        {navigation}
        <section className="desktop-bots-create-content">
          {creatingBot ? <>
            <header><strong>{t("New bot")}</strong><button type="button" disabled={busy} onClick={() => { setCreatingBot(false); setDraftVersion((value) => value + 1); createCommand.current = undefined; }}>{t("Cancel")}</button></header>
            <AssistantSettings key={draftVersion} value={null} catalog={catalog} catalogState={catalogState}
              projects={projects} busy={busy} onSave={createBot} onRetryCatalog={() => void loadCatalog()} />
          </> : <div className="desktop-bots-empty">
            <Bot size={30} aria-hidden="true" />
            <h2>{t(snapshot ? "No bots yet" : "Loading…")}</h2>
            {snapshot && <button type="button" onClick={() => setCreatingBot(true)}>{t("Create bot")}</button>}
          </div>}
        </section>
      </SurfaceVisibilityContext.Provider>
    </div>
    <AnimatedCollapse expanded={!!creatingThread} className="desktop-bots-create-thread">
      <form onSubmit={(event) => { event.preventDefault(); void createThread(); }}>
        <label>{t("Thread name")}<input aria-label={t("Thread name")} value={threadName} autoFocus
          disabled={busy} onChange={(event) => setThreadName(event.target.value)} /></label>
        <button type="submit" disabled={busy || !threadName.trim()}>{t(busy ? "Creating…" : "Create thread")}</button>
        <button type="button" disabled={busy} onClick={() => setCreatingThread(undefined)}>{t("Cancel")}</button>
      </form>
    </AnimatedCollapse>
  </div>;
}

function ScopedBotChat({ scope, defaultScope, ...props }: Props & { scope: BotScope; defaultScope: boolean }) {
  const rpc = useMemo(() => scopedBotRpc(props.rpc, scope, defaultScope), [props.rpc, scope.botId, scope.threadId, defaultScope]);
  return <AssistantChat {...props} rpc={rpc} cacheKey={botCacheKey(props.hostKey, scope)} desktopBots />;
}

type Activity = ReturnType<typeof useBotUnread>;
function BotNavigation({ hostName, hostPicker, snapshot, selection, activity, environmentId, onNewBot, onNewThread, onSelectBot, onSelectThread }: {
  hostName: string; hostPicker?: Props["hostPicker"]; snapshot?: BotsSnapshot; selection?: BotScope;
  activity: Activity; environmentId: string; onNewBot: () => void; onNewThread: (botId: string) => void;
  onSelectBot: (bot: BotView) => void; onSelectThread: (thread: BotThread) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [folded, setFolded] = useState(new Set<string>());
  const bots = snapshot?.bots.filter((bot) => !bot.archivedAt && `${bot.name} ${snapshot.threads.filter((thread) => thread.botId === bot.id).map((thread) => thread.title).join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) ?? [];
  return <nav className="desktop-bots-navigation" aria-label={t("Bots")}>
    <header className="desktop-bots-navigation-header"><strong>{t("Bots")}</strong>{hostPicker ?? <span className="desktop-bots-host-name">{hostName}</span>}</header>
    <label className="desktop-bots-search"><Search size={15} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search bots")} aria-label={t("Search bots")} /></label>
    <button type="button" className="desktop-bots-new" onClick={onNewBot} aria-label={t("New bot")} title={t("New bot")}><Plus size={15} /><span>{t("New bot")}</span></button>
    <div className="desktop-bots-contacts">
      {bots.map((bot) => {
        const threads = snapshot!.threads.filter((thread) => thread.botId === bot.id && !thread.archivedAt);
        const unread = threads.reduce((total, thread) => total + (activity.get(botCacheKey(environmentId, { botId: bot.id, threadId: thread.id }))?.count ?? 0), 0);
        const newest = threads.map((thread) => activity.get(botCacheKey(environmentId, { botId: bot.id, threadId: thread.id }))?.latest).filter((message) => !!message).sort((a, b) => b.createdAt - a.createdAt)[0];
        return <div key={bot.id} className="desktop-bots-bot-group">
          <div className="desktop-bots-contact" data-selected={selection?.botId === bot.id}>
            <button type="button" className="desktop-bots-contact-main" onClick={() => onSelectBot(bot)} aria-label={bot.name} title={bot.name} aria-current={selection?.botId === bot.id || undefined}>
              <span className="desktop-bots-avatar" aria-hidden="true"><Bot size={20} /><span className="desktop-bots-presence" data-lifecycle={bot.lifecycle} /></span>
              <span className="desktop-bots-contact-copy"><span className="desktop-bots-contact-title"><strong>{bot.name}</strong>{unread > 0 && <span className="desktop-bots-unread">{unread > 99 ? "99+" : unread}</span>}</span><span className="desktop-bots-preview">{newest && "text" in newest ? newest.text : threads[0]?.title || t("Main thread")}</span></span>
            </button>
            <button type="button" className="desktop-bots-thread-toggle" aria-label={t(folded.has(bot.id) ? "Show threads" : "Hide threads")} aria-expanded={!folded.has(bot.id)} onClick={() => setFolded((current) => { const next = new Set(current); if (next.has(bot.id)) next.delete(bot.id); else next.add(bot.id); return next; })}><ChevronRight size={14} /></button>
          </div>
          <AnimatedCollapse expanded={!folded.has(bot.id)}>
            {threads.map((thread) => {
              const harness = thread.modelOverride?.harness ?? bot.harness;
              const displayTitle = sessionDisplayTitle(thread.title, harness);
              const title = displayTitle.trim() ? displayTitle : t("Main thread");
              const count = activity.get(botCacheKey(environmentId, { botId: bot.id, threadId: thread.id }))?.count ?? 0;
              return <button type="button" key={thread.id} className="desktop-bots-thread" onClick={() => onSelectThread(thread)} aria-label={title} title={title} aria-current={selection?.threadId === thread.id && selection.botId === bot.id ? "page" : undefined}>
                <HarnessIcon harness={harness} className="size-3.5 shrink-0" /><span>{title}</span>{count > 0 && <small className="desktop-bots-unread">{count}</small>}
              </button>;
            })}
            <button type="button" className="desktop-bots-thread" onClick={() => onNewThread(bot.id)} aria-label={t("New thread")} title={t("New thread")}><Plus size={14} /><span>{t("New thread")}</span></button>
          </AnimatedCollapse>
        </div>;
      })}
      {query && !bots.length && <div className="desktop-bots-no-results"><p>{t("No matching bots")}</p><button type="button" onClick={() => setQuery("")}>{t("Clear")}</button></div>}
    </div>
  </nav>;
}
