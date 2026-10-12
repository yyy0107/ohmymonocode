import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { SurfaceVisibilityContext, useSurfaceVisibility } from "../../../shared/ui/SurfaceVisibility";
import "./desktop-bot-details.css";

/** Desktop-only tabs retain visited editors and pause their hidden activity. */
export function DesktopBotDetails({ memory, runtime, activity, automation, management, children }: {
  memory?: ReactNode; runtime?: ReactNode; activity?: ReactNode; automation?: ReactNode; management?: ReactNode; children: ReactNode;
}) {
  const { t } = useTranslation(), visible = useSurfaceVisibility(), id = useId();
  const [selected, setSelected] = useState("settings");
  const [opened, setOpened] = useState(() => new Set(["settings"]));
  const tabs = [
    { key: "settings", label: "Settings", content: <>{children}{runtime}{management}</> },
    ...(memory ? [{ key: "memory", label: "Memory files", content: memory }] : []),
    ...(activity ? [{ key: "activity", label: "Activity", content: activity }] : []),
    ...(automation ? [{ key: "automation", label: "Automation", content: automation }] : []),
  ];
  const tab = tabs.some(item => item.key === selected) ? selected : "settings";
  if (tabs.length === 1) return <>{children}{runtime}{management}</>;
  return <div className="desktop-bots-details-tabs">
    <div role="tablist" aria-label={t("Bot details")}>
      {tabs.map(({ key, label }, index) => <button key={key} type="button" role="tab" id={`${id}-${key}-tab`} aria-controls={`${id}-${key}`} aria-selected={tab === key} tabIndex={tab === key ? 0 : -1}
        onClick={() => { setSelected(key); setOpened(current => new Set([...current, key])); }}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
          const button = document.getElementById(`${id}-${tabs[next].key}-tab`); button?.click(); button?.focus();
        }}>{t(label)}</button>)}
    </div>
    {tabs.map(({ key, content }) => <div key={key} role="tabpanel" id={`${id}-${key}`} aria-labelledby={`${id}-${key}-tab`} hidden={tab !== key} inert={tab !== key}>
      <SurfaceVisibilityContext.Provider value={visible && tab === key}>{opened.has(key) && content}</SurfaceVisibilityContext.Provider>
    </div>)}
  </div>;
}
