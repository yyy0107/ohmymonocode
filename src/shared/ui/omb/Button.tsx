import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx, PRESSABLE } from "./cx";
import { MenuHover } from "../MenuHover";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-accent text-accent-ink enabled:hover:brightness-108",
  secondary:
    "border border-hairline bg-control text-ink enabled:hover:bg-raised-hover",
  ghost:
    "border border-transparent bg-transparent text-ink enabled:hover:bg-selection-hover",
  danger:
    "border border-[color-mix(in_srgb,var(--color-danger)_45%,var(--color-hairline))] bg-transparent text-danger enabled:hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)]",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "h-6 gap-1 px-2 text-[12px]",
  xl: "h-10 gap-2 px-4 text-[14px]",
  sm: "h-7 gap-1 px-2.5 text-[12px]",
  md: "h-8 gap-1.5 px-3 text-[13px]",
  lg: "h-9 gap-2 px-4 text-[14px]",
};

export type ButtonProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Capsule instead of the skin's `--radius-lg` corner. */
  pill?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  pill = false,
  icon,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-size={size}
      data-treatment={pill || variant !== "ghost" ? "pill" : "content"}
      className={cx(
        "desktop-button",
        "inline-flex shrink-0 items-center justify-center font-medium leading-5 whitespace-nowrap select-none",
        pill ? "rounded-full" : "rounded-lg",
        VARIANT[variant],
        SIZE[size],
        PRESSABLE,
        className,
      )}
    >
      {icon ? <span className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span> : null}
      {children}
    </button>
  );
}

export type IconButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "aria-label"
> & {
  /** Accessible name; also the tooltip unless `tooltip` is false. */
  label: string;
  tooltip?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  shape?: "round" | "square";
  /** Pressed / open state, rendered on the raised surface. */
  active?: boolean;
  children: ReactNode;
};

export function IconButton({
  label,
  tooltip = true,
  size = "md",
  shape = "square",
  active = false,
  type = "button",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={tooltip ? label : undefined}
      data-active={active || undefined}
      data-size={size}
      data-shape={shape}
      className={cx(
        "desktop-icon-button inline-flex shrink-0 items-center justify-center text-ink-secondary enabled:hover:bg-selection-hover enabled:hover:text-ink data-[active]:bg-raised data-[active]:text-ink",
        size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-8 [&_svg]:size-4",
        shape === "round" ? "rounded-full" : "rounded-lg",
        PRESSABLE,
        className,
      )}
    >
      <MenuHover />
      {children}
    </button>
  );
}
