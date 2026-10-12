import type { ReactNode } from "react";
import { cx } from "./cx";

export type AvatarSize = 24 | 28 | 32 | 36 | 44;
export type Presence = "live" | "away" | "idle";

const SIZE: Record<AvatarSize, string> = {
  24: "size-6 [&_svg]:size-3.5",
  28: "size-7 [&_svg]:size-4",
  32: "size-8 [&_svg]:size-4",
  36: "size-9 [&_svg]:size-[18px]",
  44: "size-11 [&_svg]:size-5",
};

/**
 * Round holder for a HarnessIcon or ProjectAvatar. Session lists put it
 * before the title (AGENTS.md); the title itself comes from
 * `sessionDisplayTitle`.
 */
export function Avatar({
  size = 28,
  presence,
  className,
  children,
}: {
  size?: AvatarSize;
  presence?: Presence;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      data-presence={presence}
      className={cx(
        "omb-avatar relative inline-grid shrink-0 place-items-center rounded-full bg-raised text-ink",
        SIZE[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
