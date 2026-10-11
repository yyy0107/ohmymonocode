import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "./cx";

/** Shared press feedback: a small scale, dropped when motion is reduced. */
export const PRESS =
  "transition-[transform,background-color,color,opacity] duration-150 ease-m-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

const VARIANTS = {
  primary: "bg-m-accent text-m-accent-ink",
  secondary: "border border-m-hairline bg-transparent text-m-ink active:bg-m-raised",
  ghost: "bg-transparent text-m-ink active:bg-m-raised",
  danger: "bg-m-danger text-m-danger-ink",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  shape = "pill",
  icon,
  className,
  children,
  ref,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Capsule for primary actions, rounded rectangle inside cards and sheets. */
  shape?: "pill" | "rounded";
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex min-h-m-hit items-center justify-center gap-2 px-5 text-m-body font-semibold disabled:opacity-45 disabled:active:scale-100",
        shape === "pill" ? "rounded-full" : "rounded-m-xl",
        VARIANTS[variant],
        PRESS,
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  children,
  ref,
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Accessible name; already translated. */
  label: string;
  /** 36px visual inside a 44px hit area, or a full 44px circle. */
  size?: "sm" | "md";
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "relative inline-grid shrink-0 place-items-center rounded-full disabled:opacity-45",
        // The hit area stays 44px even when the visible circle is smaller.
        "before:absolute before:-inset-1 before:content-['']",
        size === "sm" ? "size-9" : "size-m-hit",
        VARIANTS[variant],
        PRESS,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
