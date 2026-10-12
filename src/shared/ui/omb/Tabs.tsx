import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export type TabItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  /** id of the panel this tab controls. */
  controls?: string;
};

/** Tab strip; the selected tab sits on the raised surface. */
export function Tabs({
  items,
  selected,
  onSelect,
  label,
  className,
}: {
  items: readonly TabItem[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === selected);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onSelect(items[next]!.id);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx("flex min-w-0 items-center gap-1", className)}
    >
      {items.map((item, index) => {
        const active = item.id === selected;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={item.controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(item.id)}
            className={cx(
              "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none [&_svg]:size-3.5",
              active
                ? "bg-raised text-ink"
                : "text-ink-secondary hover:bg-selection-hover hover:text-ink",
            )}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
