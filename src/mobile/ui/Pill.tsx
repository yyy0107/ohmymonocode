import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { PRESS } from "./Button";
import { cx } from "./cx";

const TONES = {
  neutral: "bg-m-control text-m-ink",
  accent: "bg-m-accent text-m-accent-ink",
  outline: "border border-m-hairline text-m-ink-secondary",
  success: "bg-m-success text-m-success-ink",
  danger: "bg-m-danger text-m-danger-ink",
} as const;

type PillProps = {
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  /** 28px chips, or the 32–36px capsule used for header thread pills. */
  size?: "sm" | "md";
};

const pillClass = (tone: keyof typeof TONES, size: "sm" | "md") =>
  cx(
    "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
    size === "sm" ? "h-m-pill px-3 text-m-label" : "h-9 px-3.5 text-m-label",
    TONES[tone],
  );

/** A static chip: status, counts or labels. */
export function Pill({ tone = "neutral", size = "sm", icon, className, children, ...props }:
  HTMLAttributes<HTMLSpanElement> & PillProps) {
  return (
    <span className={cx(pillClass(tone, size), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}

/** A pressable chip, e.g. confirmation choices or queued messages. */
export function PillButton({ tone = "neutral", size = "sm", icon, className, children, type = "button", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & PillProps) {
  return (
    <button type={type} className={cx(pillClass(tone, size), PRESS, "disabled:opacity-45", className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
