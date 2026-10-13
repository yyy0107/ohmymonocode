import { useTranslation } from "../../shared/i18n/useTranslation";
import { AnimatedCollapse } from "../../shared/ui/AnimatedCollapse";
import {
  Bot,
  ChevronRight,
  Chatting,
  CodeXml,
  Folder,
  Inbox,
  Plus,
  Search,
  StickyNote,
  Workflow,
  Zap,
} from "../../shared/ui/icons";
import { useState, type ReactNode } from "react";
import { useSurfaceVisibility } from "../../shared/ui/SurfaceVisibility";
import { TabVisitNav } from "./WindowChrome";
import { useCommandShortcut } from "../commands/useCommandShortcut";
import type { DesktopMode } from "../model/desktopMode";
import type { ActivityBarProps } from "./ActivityBar";

/** Keep window navigation outside the animated sidebar and main surface. */
export function DesktopTitlebarNavigation({
  menu,
  modeToggle,
  ...navigation
}: Parameters<typeof TabVisitNav>[0] & {
  menu: ReactNode;
  modeToggle: ReactNode;
}) {
  const { t } = useTranslation();
  const visible = useSurfaceVisibility();
  return (
    <nav
      className="desktop-titlebar-navigation"
      data-window-navigation={visible || undefined}
      aria-label={t("Window navigation")}
      data-tauri-drag-region="false"
    >
      {menu}
      <TabVisitNav {...navigation} showProductIcon={false} />
      <div className="desktop-titlebar-mode-slot">
        <AnimatedCollapse expanded={Boolean(navigation.panelActive)} keepMounted>
          {modeToggle}
        </AnimatedCollapse>
      </div>
    </nav>
  );
}

export function DesktopModeToggle({
  mode,
  onChange,
}: {
  mode: DesktopMode;
  onChange: (mode: DesktopMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="desktop-mode-toggle"
      role="group"
      aria-label={t("Workspace mode")}
      data-tauri-drag-region="false"
    >
      {(["chat", "code"] as const).map((value) => {
        const Icon = value === "chat" ? Chatting : CodeXml;
        return (
          <button
            key={value}
            type="button"
            aria-label={t(value === "chat" ? "Chat" : "Code")}
            title={t(value === "chat" ? "Chat" : "Code")}
            aria-pressed={mode === value}
            onClick={() => onChange(value)}
          >
            <Icon strokeWidth={value === "chat" ? 1.5 : 2} />
          </button>
        );
      })}
    </div>
  );
}

export function DesktopNavigation({
  mode,
  onNew,
  onProjects,
  projectsActive,
  onBots,
  botsActive,
  activity,
}: {
  mode: DesktopMode;
  onNew: () => void;
  onProjects: () => void;
  projectsActive: boolean;
  onBots: () => void;
  botsActive: boolean;
  activity: ActivityBarProps;
}) {
  const { t } = useTranslation();
  const shortcut = useCommandShortcut("App: Go to File");
  const [expanded, setExpanded] = useState(false);
  const entries = [
    {
      label: "Inbox",
      icon: Inbox,
      onClick: activity.onOpenInbox,
      active: activity.inboxActive,
      dot: activity.inboxUnseen,
    },
    {
      label: "Notes",
      icon: StickyNote,
      onClick: activity.notesEnabled ? activity.onOpenNotes : undefined,
      active: activity.notesActive,
    },
    {
      label: "Automations",
      icon: Zap,
      onClick: activity.onOpenAutomations,
      active: activity.automationsActive,
    },
    {
      label: "Workflows",
      icon: Workflow,
      onClick: activity.onOpenWorkflows,
      active: activity.workflowsActive,
    },
  ];
  return (
    <nav className="desktop-navigation" aria-label={t("Main navigation")}>
      <button
        type="button"
        className="desktop-search-trigger"
        onClick={activity.onSearch}
      >
        <Search />
        <span>{t("Search")}</span>
        <kbd>{shortcut}</kbd>
      </button>
      <button type="button" className="desktop-navigation-row" onClick={onNew}>
        <span className="desktop-navigation-icon">
          <Plus />
        </span>
        <span>{t(mode === "chat" ? "New chat" : "New task")}</span>
      </button>
      <button
        type="button"
        className="desktop-navigation-row"
        aria-current={projectsActive ? "page" : undefined}
        onClick={onProjects}
      >
        <span className="desktop-navigation-icon">
          <Folder />
        </span>
        <span>{t("Projects")}</span>
      </button>
      <button
        type="button"
        className="desktop-navigation-row"
        aria-current={botsActive ? "page" : undefined}
        onClick={onBots}
      >
        <span className="desktop-navigation-icon">
          <Bot />
        </span>
        <span>{t("Bots")}</span>
      </button>
      <button
        type="button"
        className="desktop-navigation-row"
        aria-expanded={expanded}
        aria-controls="desktop-more-navigation"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="desktop-navigation-icon">
          <ChevronRight style={{ rotate: expanded ? "90deg" : "0deg" }} />
        </span>
        <span>{t("More")}</span>
      </button>
      <AnimatedCollapse expanded={expanded} keepMounted>
        <div id="desktop-more-navigation" className="desktop-more-navigation">
          {entries
            .filter((entry) => entry.onClick)
            .map(({ label, icon: Icon, onClick, active, dot }) => (
              <button
                key={label}
                type="button"
                className="desktop-navigation-row"
                aria-current={active ? "page" : undefined}
                onClick={onClick}
              >
                <span className="desktop-navigation-icon">
                  <Icon />
                </span>
                <span>{t(label)}</span>
                {dot ? <span className="desktop-navigation-dot" /> : null}
              </button>
            ))}
        </div>
      </AnimatedCollapse>
    </nav>
  );
}
