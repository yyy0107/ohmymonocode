import type { ReactNode } from "react";
import { DisclosureChevron } from "../DisclosureChevron";
import { cx, PRESSABLE } from "./cx";

/**
 * Sidebar group label: 11px uppercase, tertiary ink. Collapsible when given
 * `onToggle`; the caller animates the body with AnimatedCollapse.
 */
export function SectionHeader({
  label,
  expanded,
  onToggle,
  controls,
  actions,
  className,
}: {
  label: ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  /** id of the disclosed region, for aria-controls. */
  controls?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const text = (
    <span className="truncate text-[11px] font-semibold tracking-[0.06em] uppercase">
      {label}
    </span>
  );
  return (
    <div
      className={cx(
        "group/section flex h-7 min-w-0 items-center gap-1 px-2 text-ink-tertiary",
        className,
      )}
    >
      {onToggle ? (
        <button
          type="button"
          aria-expanded={!!expanded}
          aria-controls={controls}
          onClick={onToggle}
          className={cx(
            "-ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 hover:text-ink-secondary",
            PRESSABLE,
            "active:scale-100",
          )}
        >
          <DisclosureChevron expanded={!!expanded} aria-hidden className="size-3 shrink-0" />
          {text}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{text}</div>
      )}
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/section:opacity-100 group-focus-within/section:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
