import type { ReactNode } from "react";
import type { HarnessId } from "../../features/sessions/model/session";
import { HarnessIcon } from "../../features/sessions/ui/HarnessIcon";
import { cx } from "./cx";

const SIZES = { 32: "size-8", 36: "size-9", 44: "size-m-hit" } as const;
const MARKS = { 32: "size-4", 36: "size-[18px]", 44: "size-[22px]" } as const;

/**
 * A round agent badge. Session lists put it before the title (AGENTS.md):
 * pass the harness id and render the title through sessionDisplayTitle.
 */
export function Avatar({
  harness,
  size = 36,
  children,
  className,
}: {
  harness?: HarnessId;
  size?: keyof typeof SIZES;
  /** Custom content instead of a harness mark. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-grid shrink-0 place-items-center rounded-full bg-m-raised text-m-ink", SIZES[size], className)}
      aria-hidden="true"
    >
      {children ?? (harness ? <HarnessIcon harness={harness} className={MARKS[size]} /> : null)}
    </span>
  );
}
