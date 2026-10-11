import type { ButtonHTMLAttributes } from "react";
import { PRESS } from "./Button";
import { cx } from "./cx";

/**
 * A sent or received image: at most 300px tall, its ratio clamped between
 * 3:4 and 4:1 so panoramas and receipts both stay readable; opens on tap.
 */
export function ImageAttachment({ src, name, ratio, className, type = "button", ...props }:
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "name"> & {
    src: string;
    name?: string;
    /** width / height of the source, when known. */
    ratio?: number;
  }) {
  const clamped = ratio ? Math.min(4, Math.max(0.75, ratio)) : 4 / 3;
  return (
    <button type={type} className={cx("flex max-w-[80%] flex-col gap-1 text-left", PRESS, className)} {...props}>
      <img
        src={src}
        alt={name ?? ""}
        className="max-h-[300px] w-full rounded-m-xl bg-m-inset object-cover"
        style={{ aspectRatio: String(clamped) }}
      />
      {name ? <span className="truncate px-1 text-m-meta text-m-ink-secondary">{name}</span> : null}
    </button>
  );
}
