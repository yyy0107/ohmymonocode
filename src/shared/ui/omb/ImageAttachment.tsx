import type { MouseEventHandler } from "react";
import { cx, PRESSABLE } from "./cx";

/** Message image: capped at 320px tall, cropped to its box, file name below. */
export function ImageAttachment({
  src,
  name,
  alt,
  onOpen,
  className,
}: {
  src: string;
  name?: string;
  alt?: string;
  onOpen?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}) {
  const image = (
    <img
      src={src}
      alt={alt ?? name ?? ""}
      draggable={false}
      className="block max-h-80 max-w-full rounded-xl object-cover"
    />
  );
  return (
    <figure className={cx("m-0 inline-flex max-w-full flex-col gap-1", className)}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={name ?? alt}
          className={cx("block max-w-full overflow-hidden rounded-xl", PRESSABLE)}
        >
          {image}
        </button>
      ) : (
        image
      )}
      {name ? (
        <figcaption className="truncate text-[12px] leading-4 text-ink-tertiary">
          {name}
        </figcaption>
      ) : null}
    </figure>
  );
}
