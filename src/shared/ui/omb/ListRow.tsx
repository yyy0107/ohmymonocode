import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export type ListRowProps = Omit<
  ComponentPropsWithRef<"div">,
  "title" | "children"
> & {
  /** Avatar (agent icon) shown before the title. */
  leading?: ReactNode;
  title: ReactNode;
  /** Single-line preview under the title (comfortable density only). */
  preview?: ReactNode;
  /** Relative time or another short trailing caption. */
  meta?: ReactNode;
  unread?: boolean;
  selected?: boolean;
  density?: "comfortable" | "compact";
  /** Hover actions; shown on hover, focus-within and while selected. */
  actions?: ReactNode;
  /** Drag grip, rendered at the leading edge. */
  handle?: ReactNode;
};

/**
 * Sidebar session row. Purely presentational: callers keep their own
 * button/link semantics, drag and context-menu handlers on the props.
 */
export function ListRow({
  leading,
  title,
  preview,
  meta,
  unread = false,
  selected = false,
  density = "comfortable",
  actions,
  handle,
  className,
  ...props
}: ListRowProps) {
  const compact = density === "compact";
  return (
    <div
      {...props}
      data-selected={selected || undefined}
      data-density={density}
      className={cx(
        "omb-list-row group/row relative flex w-full min-w-0 items-center gap-2.5 rounded-[var(--radius-row)] px-2 text-ink transition-colors duration-150 motion-reduce:transition-none",
        compact ? "min-h-[var(--row-h-compact)] py-1" : "min-h-[var(--row-h)] py-1.5",
        selected
          ? "bg-raised"
          : "hover:bg-[color-mix(in_srgb,var(--color-raised)_65%,transparent)]",
        className,
      )}
    >
      {handle}
      {leading}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cx(
              "min-w-0 flex-1 truncate font-semibold",
              compact ? "text-[13px] leading-5" : "text-[14px] leading-5",
            )}
          >
            {title}
          </span>
          {meta ? (
            <span className="shrink-0 text-[11px] leading-4 text-ink-tertiary tabular-nums group-hover/row:invisible group-focus-within/row:invisible">
              {meta}
            </span>
          ) : null}
        </div>
        {!compact && preview ? (
          <span className="truncate text-[12px] leading-[18px] text-ink-secondary">
            {preview}
          </span>
        ) : null}
      </div>
      {unread ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-accent group-hover/row:hidden"
        />
      ) : null}
      {actions ? (
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
