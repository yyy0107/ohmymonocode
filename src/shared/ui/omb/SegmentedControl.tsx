import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export type Segment<T extends string> = {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon. */
  title?: string;
  disabled?: boolean;
};

/** Radio group drawn as a 32px segmented track; arrow keys move selection. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
  className,
}: {
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const enabled = options.filter((option) => !option.disabled);
    const index = enabled.findIndex((option) => option.value === value);
    const next = enabled[(index + step + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        "inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-inset p-0.5",
        size === "sm" ? "h-7" : "h-8",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.title}
            title={option.title}
            tabIndex={checked ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex h-full min-w-0 items-center justify-center gap-1 rounded-md px-2.5 font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none disabled:opacity-45 [&_svg]:size-3.5",
              size === "sm" ? "text-[12px]" : "text-[13px]",
              checked
                ? "bg-raised text-ink shadow-[0_1px_2px_color-mix(in_srgb,black_18%,transparent)]"
                : "text-ink-secondary enabled:hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
