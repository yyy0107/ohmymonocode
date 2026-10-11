import type { ReactNode } from "react";
import { cx } from "./cx";

/** A 36px track of mutually exclusive options. */
export function SegmentedControl<T extends string>({ value, options, onChange, label, className }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  /** Accessible name; already translated. */
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label}
      className={cx("grid h-m-control auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-m-inset p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="min-w-0 truncate rounded-full px-3 text-m-label font-medium text-m-ink-secondary transition-colors duration-150 aria-checked:bg-m-raised aria-checked:text-m-ink motion-reduce:transition-none"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
