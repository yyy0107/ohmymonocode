import type { ComponentPropsWithRef } from "react";
import { Search } from "../icons";
import { cx } from "./cx";

/** 32px inset search input with an optional shortcut hint. */
export function SearchField({
  shortcut,
  className,
  inputClassName,
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & {
  shortcut?: string;
  inputClassName?: string;
}) {
  return (
    <label
      className={cx(
        "flex h-8 min-w-0 items-center gap-2 rounded-lg bg-inset px-2.5 text-ink-tertiary focus-within:outline-2 focus-within:outline-offset-[-1px] focus-within:outline-focus",
        className,
      )}
    >
      <Search aria-hidden className="size-3.5 shrink-0" />
      <input
        {...props}
        type="search"
        className={cx(
          "h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-tertiary [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {shortcut ? (
        <kbd className="shrink-0 rounded border border-hairline px-1 font-sans text-[11px] leading-4 text-ink-tertiary">
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
