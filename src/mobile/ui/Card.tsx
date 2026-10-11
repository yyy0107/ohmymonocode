import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Card({ inset = false, className, ...props }:
  HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cx("rounded-m-xl p-3.5 text-m-ink", inset ? "bg-m-inset" : "bg-m-card", className)}
      {...props}
    />
  );
}
