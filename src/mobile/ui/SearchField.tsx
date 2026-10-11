import type { InputHTMLAttributes, Ref } from "react";
import { Search } from "../../shared/ui/icons";
import { cx } from "./cx";

/** A 40px inset search field with a leading glyph. */
export function SearchField({ className, ref, ...props }:
  InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <label className={cx("flex h-10 items-center gap-2 rounded-m-field bg-m-inset px-3 text-m-ink-tertiary focus-within:ring-2 focus-within:ring-m-focus", className)}>
      <Search size={16} aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        className="min-w-0 flex-1 bg-transparent text-m-body text-m-ink outline-none placeholder:text-m-ink-tertiary"
        {...props}
      />
    </label>
  );
}
