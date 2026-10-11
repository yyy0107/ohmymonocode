import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "./cx";

/**
 * A list entry: leading avatar or icon, a 15px semibold name over a one-line
 * 13px preview, and trailing meta (time, state) with an optional unread dot.
 */
export function ListRow({
  leading,
  title,
  preview,
  meta,
  trailing,
  unread,
  selected,
  density = "comfortable",
  className,
  ref,
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & {
  leading?: ReactNode;
  title: ReactNode;
  preview?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  unread?: boolean;
  selected?: boolean;
  /** 64–72px rows with a preview, or 48px single-line rows. */
  density?: "comfortable" | "compact";
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type={type}
      aria-current={selected || undefined}
      className={cx(
        "flex w-full items-center gap-3 rounded-m-xl px-3 text-left text-m-ink transition-colors duration-150 active:bg-m-raised-hover motion-reduce:transition-none",
        density === "comfortable" ? "min-h-16 py-2.5" : "min-h-12 py-2",
        selected && "bg-m-raised",
        className,
      )}
      {...props}
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-m-body font-semibold">{title}</span>
          {meta ? <span className="shrink-0 text-m-meta text-m-ink-tertiary">{meta}</span> : null}
        </span>
        {preview ? <span className="truncate text-m-label text-m-ink-secondary">{preview}</span> : null}
      </span>
      {trailing}
      {unread ? <span className="size-2.5 shrink-0 rounded-full bg-m-accent" aria-hidden="true" /> : null}
    </button>
  );
}

/** 11–12px uppercase group heading in the tertiary ink. */
export function SectionHeader({ children, action, className }: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-h-8 items-center justify-between gap-2 px-4 pt-3 pb-1", className)}>
      <h2 className="text-m-caption font-semibold tracking-wide text-m-ink-tertiary uppercase">{children}</h2>
      {action}
    </div>
  );
}
