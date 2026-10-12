import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export function Card({
  padding = "md",
  className,
  ...props
}: ComponentPropsWithRef<"div"> & { padding?: "none" | "sm" | "md" }) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-[var(--radius-xl,0.75rem)] border border-hairline bg-card text-ink",
        padding === "sm" ? "p-3" : padding === "md" ? "p-4" : "",
        className,
      )}
    />
  );
}
