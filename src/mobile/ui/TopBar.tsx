import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * A page header: leading control (back/menu), optional avatar, a title with a
 * subtitle line, then trailing capsules or icons. It floats over content.
 */
export function TopBar({ leading, avatar, title, subtitle, trailing, className }: {
  leading?: ReactNode;
  avatar?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-h-m-hit items-center gap-2", className)}>
      {leading}
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col">
        {title ? <strong className="truncate text-m-title font-semibold text-m-ink">{title}</strong> : null}
        {subtitle ? <span className="truncate text-m-meta text-m-ink-secondary">{subtitle}</span> : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-1.5">{trailing}</div> : null}
    </div>
  );
}
