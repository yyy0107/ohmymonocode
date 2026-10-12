import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";

export type ToastTone = "neutral" | "success" | "warning" | "danger";

const DOT: Record<ToastTone, string> = {
  neutral: "bg-ink-tertiary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Floating status surface; placement and lifetime stay with the caller. */
export function Toast({
  tone = "neutral",
  icon,
  action,
  className,
  children,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "children"> & {
  tone?: ToastTone;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      {...props}
      className={cx(
        "omb-glass-panel flex max-w-[min(420px,calc(100vw-32px))] items-center gap-2.5 px-3.5 py-2.5 text-[13px] leading-5 text-ink motion-safe:animate-pop-in",
        className,
      )}
    >
      {icon ?? <span aria-hidden className={cx("size-2 shrink-0 rounded-full", DOT[tone])} />}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
