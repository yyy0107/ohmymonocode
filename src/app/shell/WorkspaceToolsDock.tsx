import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useCollapseMotion } from "../../shared/ui/AnimatedCollapse";
import { useDragResize } from "../../shared/hooks/useDragResize";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { SurfaceVisibilityContext } from "../../shared/ui/SurfaceVisibility";
import { ResizeHandle } from "../../shared/ui/ResizeHandle";
import { beginPaneResize } from "../../shared/lib/paneResize";
import { duration } from "../../shared/motion/tokens";
import { X } from "../../shared/ui/icons";
import { SidebarTabs } from "./SidebarTabs";
import { ProjectToolsPanel } from "./ProjectToolsPanel";
import type { SidebarProps } from "./Sidebar.types";

/** The explorer moves out of the session sidebar without changing its handlers. */
export function WorkspaceToolsDock({
  sidebar,
  visible,
  children,
}: {
  sidebar: SidebarProps;
  visible: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const open = visible && sidebar.tab !== "sessions";
  const { foldState, finish } = useCollapseMotion(open, duration.panel * 1000);
  const toolTab = useRef<"files" | "changes">(
    sidebar.tab === "changes" ? "changes" : "files",
  );
  if (sidebar.tab !== "sessions") toolTab.current = sidebar.tab;
  const visited = useRef(new Set<"files" | "changes">());
  if (open) visited.current.add(toolTab.current);
  const [width, setWidth] = useState(288);
  const resize = useDragResize({
    direction: "left",
    cssProperty: "--tools-width",
    min: 200,
    max: () => Math.max(200, Math.min(560, window.innerWidth * 0.45)),
    defaultWidth: 288,
    initial: width,
    value: width,
    onCommit: setWidth,
  });
  useEffect(() => {
    if (!open) resize.finishDrag();
  }, [open, resize.finishDrag]);
  useEffect(
    () =>
      foldState === "opening" || foldState === "closing"
        ? beginPaneResize()
        : undefined,
    [foldState],
  );
  return (
    <div
      ref={resize.setPaneRef}
      className="desktop-tools-layout animated-collapse-size"
      data-tools-open={open}
      data-fold-state={foldState}
      data-resizing={resize.dragging || undefined}
      style={
        {
          "--collapse-duration": `${duration.panel}s`,
          gridTemplateColumns: open
            ? "minmax(0,1fr) 12px var(--tools-width)"
            : "minmax(0,1fr) 0px 0px",
        } as CSSProperties
      }
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.propertyName === "grid-template-columns"
        )
          finish();
      }}
    >
      <div className="desktop-tools-workspace">{children}</div>
      <div className="desktop-tools-divider">
        <ResizeHandle
          edge="left"
          dragging={resize.dragging}
          disabled={!open}
          aria-label={t("Resize panel")}
          aria-valuenow={width}
          aria-valuemin={200}
          aria-valuemax={560}
          tabIndex={open ? 0 : -1}
          onPointerDown={resize.onPointerDown}
          onDoubleClick={resize.onDoubleClick}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const maximum = Math.max(
              200,
              Math.min(560, window.innerWidth * 0.45),
            );
            const delta = event.shiftKey ? 48 : 16;
            setWidth((value) =>
              event.key === "Home"
                ? 200
                : event.key === "End"
                  ? maximum
                  : Math.max(
                      200,
                      Math.min(
                        maximum,
                        value + (event.key === "ArrowLeft" ? delta : -delta),
                      ),
                    ),
            );
          }}
        />
      </div>
      <aside
        className="desktop-tools-panel"
        aria-hidden={!open}
        inert={!open}
        hidden={!open && foldState === "closed"}
      >
        <SurfaceVisibilityContext.Provider value={open}>
          <div className="desktop-tools-heading">
            <SidebarTabs
              tabs={["files", "changes"]}
              tab={toolTab.current}
              onTabChange={sidebar.onTabChange}
            />
            <button
              type="button"
              aria-label={t("Close panel")}
              onClick={() => sidebar.onTabChange("sessions")}
            >
              <X />
            </button>
          </div>
          {(["files", "changes"] as const)
            .filter((tab) => visited.current.has(tab))
            .map((tab) => {
              const active = open && toolTab.current === tab;
              return (
                <div
                  key={tab}
                  className="min-h-0 min-w-0 flex-1 flex-col"
                  style={{ display: toolTab.current === tab ? "flex" : "none" }}
                  hidden={toolTab.current !== tab}
                  inert={!active}
                >
                  <SurfaceVisibilityContext.Provider value={active}>
                    <ProjectToolsPanel {...sidebar} tab={tab} open={active} />
                  </SurfaceVisibilityContext.Provider>
                </div>
              );
            })}
        </SurfaceVisibilityContext.Provider>
      </aside>
    </div>
  );
}
