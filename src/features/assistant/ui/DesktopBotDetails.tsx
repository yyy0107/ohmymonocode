import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { SurfaceVisibilityContext, useSurfaceVisibility } from "../../../shared/ui/SurfaceVisibility";

/** Desktop-only tabs keep both settings and unsaved file drafts mounted. */
export function DesktopBotDetails({ memory, children }: { memory?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  const visible = useSurfaceVisibility();
  const id = useId();
  const [tab, setTab] = useState("settings");
  const [memoryOpened, setMemoryOpened] = useState(false);
  if (!memory) return children;
  return <div className="desktop-bots-details-tabs">
    <div role="tablist" aria-label={t("Bot details")}>
      {(["settings", "memory"] as const).map((value) => <button key={value} type="button"
        role="tab" id={`${id}-${value}-tab`} aria-controls={`${id}-${value}`} aria-selected={tab === value}
        tabIndex={tab === value ? 0 : -1}
        onClick={() => { setTab(value); if (value === "memory") setMemoryOpened(true); }}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "settings" : event.key === "End" ? "memory" : value === "memory" ? "settings" : "memory";
          const button = document.getElementById(`${id}-${next}-tab`);
          button?.click(); button?.focus();
        }}>{t(value === "settings" ? "Settings" : "Memory files")}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-settings`} aria-labelledby={`${id}-settings-tab`} hidden={tab !== "settings"} inert={tab !== "settings"}>
      <SurfaceVisibilityContext.Provider value={visible && tab === "settings"}>{children}</SurfaceVisibilityContext.Provider>
    </div>
    <div role="tabpanel" id={`${id}-memory`} aria-labelledby={`${id}-memory-tab`} hidden={tab !== "memory"} inert={tab !== "memory"}>
      <SurfaceVisibilityContext.Provider value={visible && tab === "memory"}>{memoryOpened && memory}</SurfaceVisibilityContext.Provider>
    </div>
  </div>;
}
