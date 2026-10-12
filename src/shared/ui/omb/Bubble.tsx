import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

/**
 * Messages-style bubble. User: right aligned, bubble-user fill, tail corner
 * bottom-right. Bot: left aligned on the card fill, or bare.
 */
export function Bubble({
  from,
  bare = false,
  className,
  ...props
}: ComponentPropsWithRef<"div"> & { from: "user" | "bot"; bare?: boolean }) {
  return (
    <div
      {...props}
      data-from={from}
      className={cx(
        "omb-bubble max-w-[min(72ch,85%)] text-[15px] leading-[22px] break-words motion-safe:animate-msg-in",
        from === "user"
          ? "ml-auto rounded-[18px_18px_4px_18px] bg-bubble-user px-3.5 py-2 text-bubble-user-ink"
          : bare
            ? "mr-auto text-ink"
            : "mr-auto rounded-[18px_18px_18px_4px] bg-card px-3.5 py-2 text-ink",
        className,
      )}
    />
  );
}
