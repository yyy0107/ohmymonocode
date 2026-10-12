import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx, PRESSABLE } from "./cx";

const BASE =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-medium leading-5 whitespace-nowrap [&_svg]:size-3.5";

type Common = {
  size?: "sm" | "md";
  selected?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

function pillClass(size: "sm" | "md", selected: boolean) {
  return cx(
    BASE,
    size === "sm" ? "h-6 text-[12px]" : "h-7 text-[13px]",
    selected
      ? "border-accent-border bg-[color-mix(in_srgb,var(--color-accent)_14%,var(--color-panel))] text-ink"
      : "border-[color-mix(in_srgb,var(--color-hairline)_60%,transparent)] bg-panel text-ink-secondary",
  );
}

/** Static chip (status, count, label). */
export function Pill({
  size = "md",
  selected = false,
  icon,
  className,
  children,
  ...props
}: Common & Omit<ComponentPropsWithRef<"span">, "children">) {
  return (
    <span {...props} className={cx(pillClass(size, selected), className)}>
      {icon}
      {children}
    </span>
  );
}

/** Interactive chip (filters, pickers, queued items). */
export function PillButton({
  size = "md",
  selected = false,
  icon,
  type = "button",
  className,
  children,
  ...props
}: Common & Omit<ComponentPropsWithRef<"button">, "children">) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={props["aria-pressed"] ?? (selected || undefined)}
      className={cx(
        pillClass(size, selected),
        "enabled:hover:bg-raised-hover enabled:hover:text-ink",
        PRESSABLE,
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
