import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { Switch } from "../../../shared/ui/forms/Switch";
import { MenuHover } from "../../../shared/ui/MenuHover";
import { ChevronRight } from "../../../shared/ui/icons";

const SUBMENU_CLOSE_MS = 150;


export type WorkspaceMenuPickerHandlers = {
  /** Reports the picker surface, including its dialogs; closed unmounts it. */
  onOpenChange: (open: boolean) => void;
  /** Closes the whole menu after a choice or Escape. */
  onFinish: () => void;
};

/** Branch and worktree rows shown at the foot of the composer's folder menu. */
export function WorkspaceMenuRows({
  branchLabel,
  branchTitle,
  branchDisabled,
  worktree,
  worktreeName,
  worktreeDisabled,
  renderPicker,
  onWorktreeChange,
  onHold,
  onClose,
}: {
  /** Branch to check out, or the base of a new worktree. */
  branchLabel: string;
  branchTitle: string;
  branchDisabled: boolean;
  /** Whether the working copy is a worktree; null leaves the row out. */
  worktree: boolean | null;
  /** Folder name of a started session's worktree. */
  worktreeName?: string;
  worktreeDisabled: boolean;
  /** The branch submenu, opened beside the branch row. */
  renderPicker: (handlers: WorkspaceMenuPickerHandlers) => ReactNode;
  onWorktreeChange?: (worktree: boolean) => void;
  /** Keeps the menu open while the submenu or its dialogs take clicks. */
  onHold: (held: boolean) => void;
  onClose: () => void;
}) {
  const { t: uiT } = useTranslation();
  const [picker, setPicker] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimer.current == null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  // StrictMode replays the picker's effects (open, closed, open) on mount, so a
  // closed report only unmounts it when no open report follows in the same tick.
  const pickerOpen = useRef(false);
  const onOpenChange = useCallback(
    (open: boolean) => {
      pickerOpen.current = open;
      onHold(open);
      if (open) return;
      window.setTimeout(() => {
        if (!pickerOpen.current) setPicker(false);
      }, 0);
    },
    [onHold],
  );
  // Like other submenus, hovering another row of the menu closes the branch
  // list after a short delay that lets the pointer cross into it diagonally.
  useEffect(() => {
    if (!picker) return;
    const over = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (row.current?.contains(target) || target.closest(".branch-menu")) {
        cancelClose();
        return;
      }
      if (
        closeTimer.current == null &&
        target.closest("[data-cwd-picker] :is([role^='menuitem'], [data-menu-row])")
      ) {
        closeTimer.current = window.setTimeout(() => {
          closeTimer.current = null;
          setPicker(false);
        }, SUBMENU_CLOSE_MS);
      }
    };
    document.addEventListener("pointerover", over);
    return () => {
      document.removeEventListener("pointerover", over);
      cancelClose();
    };
  }, [picker]);
  return (
    <>
      <div ref={row} className="relative">
        <button
          type="button"
          role="menuitem"
          aria-haspopup="dialog"
          aria-expanded={picker}
          aria-label={`${branchTitle} ${branchLabel}`}
          disabled={branchDisabled}
          data-highlighted={picker || undefined}
          data-workspace-menu-branch
          onMouseDown={(event) => event.preventDefault()}
          // Pressing the row must not count as a click outside the open list.
          onPointerDown={(event) => event.stopPropagation()}
          onMouseEnter={() => setPicker(true)}
          // The row can turn enabled (branches loaded) or appear under a
          // resting pointer without a fresh enter event, so moving opens too.
          onMouseMove={() => {
            if (!picker) setPicker(true);
          }}
          onClick={() => setPicker(true)}
          className={`flex h-8 w-full items-center gap-3 px-2.5 text-left text-content/80 disabled:opacity-40 disabled:hover:bg-transparent ${
            picker ? "bg-selection text-content" : "hover:bg-content/3"
          }`}
        >
          <MenuHover />
          <span data-menu-title className="shrink-0 text-[13px]">{branchTitle}</span>
          <span className="ml-auto min-w-0 truncate text-[12px] text-content/45">
            {branchLabel}
          </span>
          <ChevronRight className="size-3.5 shrink-0 text-content/45" />
        </button>
        {picker ? (
          // The picker anchors to the whole row; its own trigger stays hidden.
          <div className="pointer-events-none absolute inset-0 flex [&>div]:w-full [&>div>button]:invisible">
            {renderPicker({ onOpenChange, onFinish: onClose })}
          </div>
        ) : null}
      </div>
      {/* Shares the menu row geometry and hover layer of the rows above. */}
      {worktree === null ? null : (
        <label
          data-menu-row="single"
          data-workspace-menu-worktree
          aria-disabled={worktreeDisabled || undefined}
          title={worktreeName}
          className={`flex h-8 w-full items-center gap-3 px-2.5 text-content/80 ${
            worktreeDisabled ? "opacity-40" : ""
          }`}
          onMouseDown={(event) => event.preventDefault()}
        >
          <MenuHover />
          <span data-menu-title className="shrink-0 text-[13px]">{uiT("Worktree")}</span>
          <span className="ml-auto min-w-0 truncate text-[12px] text-content/45">
            {worktreeName}
          </span>
          <Switch
            size="sm"
            checked={worktree}
            disabled={worktreeDisabled || !onWorktreeChange}
            aria-label={uiT("Worktree")}
            onCheckedChange={(next) => {
              setPicker(false);
              onWorktreeChange?.(next);
            }}
          />
        </label>
      )}
    </>
  );
}
