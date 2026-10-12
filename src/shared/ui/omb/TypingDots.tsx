import { cx } from "./cx";

/** Three 6px dots that hop 2px, 0.15s apart. Static under reduced motion. */
export function TypingDots({
  label,
  className,
}: {
  /** Accessible status text, e.g. translated "Working". */
  label: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx("omb-typing inline-flex items-center gap-1 text-ink-tertiary", className)}
    >
      <span aria-hidden />
      <span aria-hidden />
      <span aria-hidden />
    </span>
  );
}
