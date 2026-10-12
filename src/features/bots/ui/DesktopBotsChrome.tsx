import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BotMessage, BotConfiguration } from "../model/botView";
import type { BotChatChrome, BotHeaderProps, BotSettingsPanelProps } from "./BotChatChrome";
import { desktopBotsLegacyChrome } from "./DesktopBotsLegacyChrome";
import { AnimatedCollapse, useCollapseMotion } from "../../../shared/ui/AnimatedCollapse";
import { SurfaceVisibilityContext, useSurfaceVisibility } from "../../../shared/ui/SurfaceVisibility";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { Bot, ChevronRight, Pause, Play, Search, Settings, Square, X } from "../../../shared/ui/icons";
import { HarnessIcon } from "../../sessions/ui/HarnessIcon";
import { HARNESS_TITLE, sessionDisplayTitle } from "../../sessions/model/session";

/** The first shell shows only the Host's existing assistant and its real chat. */
export function DesktopBotsNavigation({ hostName, hostPicker, assistant, messages, onSelect }: {
  hostName: string;
  hostPicker?: ReactNode;
  assistant?: BotConfiguration | null;
  messages: BotMessage[];
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const name = assistant?.name ?? t("Assistant");
  const latest = [...messages].reverse().find((message) =>
    (message.kind === "user" || message.kind === "assistant") &&
    (message.text.trim() || message.attachments?.length));
  const preview = latest && "text" in latest
    ? latest.text.replace(/\s+/g, " ").trim() || t("Attachments")
    : t(assistant ? "Main thread" : "Set up assistant");
  const matches = `${name} ${preview}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  return (
    <nav className="desktop-bots-navigation" aria-label={t("Bots")}>
      <header className="desktop-bots-navigation-header">
        <strong>{t("Bots")}</strong>
        {hostPicker ?? <span className="desktop-bots-host-name" title={hostName}>{hostName}</span>}
      </header>
      <label className="desktop-bots-search">
        <Search size={15} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search bots")} aria-label={t("Search bots")} />
      </label>
      <div className="desktop-bots-contacts">
        {matches ? <>
          <div className="desktop-bots-contact" data-selected="true">
            <button type="button" className="desktop-bots-contact-main" onClick={onSelect}
              aria-label={name} aria-current="true" title={`${name}: ${preview}`}>
              <span className="desktop-bots-avatar" aria-hidden="true">
                <Bot size={20} />
                <span className="desktop-bots-presence" data-lifecycle={assistant?.lifecycle ?? "idle"} />
              </span>
              <span className="desktop-bots-contact-copy">
                <span className="desktop-bots-contact-title">
                  <strong>{name}</strong>
                  {latest && <time dateTime={new Date(latest.createdAt).toISOString()}>
                    {new Date(latest.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </time>}
                </span>
                <span className="desktop-bots-preview">{preview}</span>
              </span>
            </button>
            {assistant && <button type="button" className="desktop-bots-thread-toggle"
              aria-label={t(expanded ? "Hide threads" : "Show threads")}
              aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>}
          </div>
          <AnimatedCollapse expanded={expanded && !!assistant}>
            <button type="button" className="desktop-bots-thread" aria-current="page" aria-label={t("Main thread")} title={t("Main thread")} onClick={onSelect}>
              {assistant?.harness && <HarnessIcon harness={assistant.harness} className="size-3.5 shrink-0" />}
              <span>{assistant?.harness ? sessionDisplayTitle(t("Main thread"), assistant.harness) : t("Main thread")}</span>
            </button>
          </AnimatedCollapse>
        </> : <div className="desktop-bots-no-results">
          <p>{t("No matching bots")}</p>
          <button type="button" onClick={() => setQuery("")}>{t("Clear")}</button>
        </div>}
      </div>
    </nav>
  );
}

function DesktopBotsHeader({ name, threadTitle, harness, status, lifecycle, busy, settingsOpen, onSettings, controls }: BotHeaderProps) {
  const { t } = useTranslation();
  const title = threadTitle && harness ? sessionDisplayTitle(threadTitle, harness) : threadTitle;
  return <header className="assistant-header desktop-bots-header">
    <div className="desktop-bots-header-title">
      <strong>{name}</strong>
      <span>{title?.trim() ? title : t("Main thread")}</span>
    </div>
    <div className="desktop-bots-run-status">
      {harness && <span className="desktop-bots-engine" title={HARNESS_TITLE[harness]}>
        <HarnessIcon harness={harness} className="size-3.5 shrink-0" />
        <span>{HARNESS_TITLE[harness]}</span>
      </span>}
      <span className="assistant-status" data-lifecycle={lifecycle}>{status}</span>
    </div>
    <div className="assistant-header-actions">
      {controls && <>
        <button type="button" className="assistant-icon-button" disabled={busy}
          title={t(controls.continuable ? "Continue" : "Pause")}
          aria-label={t(controls.continuable ? "Continue" : "Pause")} onClick={controls.onToggle}>
          {controls.continuable ? <Play size={15} /> : <Pause size={15} />}
        </button>
        <button type="button" className="assistant-icon-button assistant-danger"
          disabled={busy || !controls.enabled} title={t("Disable assistant")}
          aria-label={t("Disable assistant")} onClick={controls.onDisable}>
          <Square size={14} />
        </button>
      </>}
      {onSettings && <button type="button" className="assistant-icon-button"
        title={t("Bot details")} aria-label={t("Bot details")} aria-expanded={settingsOpen}
        onClick={onSettings}>
        <Settings size={17} />
      </button>}
    </div>
  </header>;
}

function DesktopBotsSettingsPanel({ open, initialSetup, onClose, children }: BotSettingsPanelProps) {
  const { t } = useTranslation();
  const visible = useSurfaceVisibility();
  const { foldState } = useCollapseMotion(open);
  const panel = useRef<HTMLElement>(null);
  const opened = useRef(open);
  if (open) opened.current = true;
  useEffect(() => {
    if (!open || !visible) return;
    const previous = document.activeElement as HTMLElement | null;
    // The shared motion hook first removes the closed panel's visibility.
    // Focus on the next frame, once that layout update has been committed.
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === previous || document.activeElement === document.body)
        panel.current?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      // Restore the trigger only if focus still belongs to the closing panel.
      // Sending a message while details are open must not steal composer focus.
      if (panel.current?.contains(document.activeElement) && previous?.isConnected && !previous.closest("[inert]"))
        previous.focus({ preventScroll: true });
    };
  }, [open, visible]);
  return <aside ref={panel} className="desktop-bots-inspector" tabIndex={-1}
    aria-label={t(initialSetup ? "Set up assistant" : "Bot details")}
    aria-hidden={!open || undefined} inert={!open || !visible} data-fold-state={foldState}
    onKeyDown={(event) => {
      if (event.key === "Escape" && !initialSetup && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }}>
    <SurfaceVisibilityContext.Provider value={visible && open}>
      {opened.current && <>
        <header className="desktop-bots-inspector-header">
          <strong>{t(initialSetup ? "Set up assistant" : "Bot details")}</strong>
          {!initialSetup && <button type="button" className="assistant-icon-button" onClick={onClose}
            aria-label={t("Hide bot details")} title={t("Hide bot details")}><X size={16} /></button>}
        </header>
        <div className="assistant-settings-content">{children}</div>
      </>}
    </SurfaceVisibilityContext.Provider>
  </aside>;
}

export const desktopBotsChrome: BotChatChrome = {
  ...desktopBotsLegacyChrome,
  Header: DesktopBotsHeader,
  SettingsPanel: DesktopBotsSettingsPanel,
};
