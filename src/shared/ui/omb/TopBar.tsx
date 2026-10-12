import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

/**
 * Tab title bar: navigation, avatar and title on the left, pills and icon
 * buttons on the right. The bar itself is a deep drag region; controls
 * inside are excluded by `startWindowDrag`.
 */
export function TopBar({
  navigation,
  avatar,
  title,
  subtitle,
  trailing,
  className,
  ...props
}: Omit<ComponentPropsWithRef<"header">, "title"> & {
  navigation?: ReactNode;
  avatar?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <header
      data-tauri-drag-region="deep"
      {...props}
      className={cx(
        "flex h-12 min-w-0 shrink-0 items-center gap-2 px-3 text-ink",
        className,
      )}
    >
      {navigation ? (
        <div className="flex shrink-0 items-center gap-0.5">{navigation}</div>
      ) : null}
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="truncate text-[14px] leading-5 font-semibold">{title}</div>
        {subtitle ? (
          <div className="truncate text-[12px] leading-4 text-ink-tertiary">
            {subtitle}
          </div>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-1">{trailing}</div>
      ) : null}
    </header>
  );
}

/** Horizontal group of icon buttons / pills. */
export function Toolbar({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      role="toolbar"
      {...props}
      className={cx("flex shrink-0 items-center gap-1", className)}
    />
  );
}
