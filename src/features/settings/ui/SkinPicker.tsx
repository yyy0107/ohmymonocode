import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import {
  DESKTOP_SKIN_IDS,
  DESKTOP_SKIN_INFO,
  type DesktopSkinId,
  type DesktopSkinPreference,
} from "../../../shared/theme/desktopSkin";
import { cx } from "../../../shared/ui/omb/cx";

const CHOICES: readonly DesktopSkinPreference[] = [
  "auto",
  ...DESKTOP_SKIN_IDS,
  "classic",
];

/**
 * A miniature window: sidebar strip, a bot message, your message and the
 * accent send dot. A nested `data-skin` swaps every token for that skin.
 */
function Miniature({ skin, style }: { skin?: DesktopSkinId; style?: CSSProperties }) {
  return (
    <span
      data-skin={skin}
      style={style}
      className="flex h-full min-w-0 flex-1 overflow-hidden bg-app"
    >
      <span className="flex w-[30%] flex-col gap-1 bg-panel p-1.5">
        <span className="h-1.5 w-full rounded-full bg-raised" />
        <span className="h-1.5 w-3/4 rounded-full bg-inset" />
        <span className="h-1.5 w-2/3 rounded-full bg-inset" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-end gap-1 p-1.5">
        <span className="h-2.5 w-3/5 rounded-[6px_6px_6px_2px] bg-card" />
        <span className="ml-auto h-2.5 w-2/5 rounded-[6px_6px_2px_6px] bg-bubble-user" />
        <span className="mt-0.5 flex h-3 items-center justify-end rounded-full bg-composer pr-0.5">
          <span className="size-2 rounded-full bg-accent" />
        </span>
      </span>
    </span>
  );
}

/** Classic paints from the user's tint, not a skin block. */
const CLASSIC_STYLE: CSSProperties = {
  ["--color-app" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 9%)",
  ["--color-panel" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 12%)",
  ["--color-raised" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 22%)",
  ["--color-inset" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 17%)",
  ["--color-card" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 16%)",
  ["--color-bubble-user" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 28%)",
  ["--color-composer" as string]: "hsl(var(--theme-hue) var(--theme-saturation) 16%)",
  ["--color-accent" as string]: "var(--user-accent-color, #4099ff)",
};

function Preview({ choice }: { choice: DesktopSkinPreference }) {
  if (choice === "auto")
    return (
      <>
        <Miniature skin="midnight" />
        <Miniature skin="daylight" />
      </>
    );
  if (choice === "classic") return <Miniature style={CLASSIC_STYLE} />;
  return <Miniature skin={choice} />;
}

/** Settings → Appearance → Skin: Automatic, the nine skins, then Classic. */
export function SkinPicker({
  value,
  onChange,
}: {
  value: DesktopSkinPreference;
  onChange: (value: DesktopSkinPreference) => void;
}) {
  const { t } = useTranslation();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const label = (choice: DesktopSkinPreference) =>
    choice === "auto"
      ? t("Automatic")
      : choice === "classic"
        ? t("Classic")
        : t(DESKTOP_SKIN_INFO[choice].label);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = CHOICES.indexOf(value);
    const next = (index + step + CHOICES.length) % CHOICES.length;
    onChange(CHOICES[next]!);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={t("Skin")}
      onKeyDown={onKeyDown}
      className="grid w-full grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5"
    >
      {CHOICES.map((choice, index) => {
        const checked = choice === value;
        return (
          <button
            key={choice}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={choice === "auto" ? t("Midnight or Daylight, following Color mode.") : undefined}
            onClick={() => onChange(choice)}
            data-skin-choice={choice}
            className="group flex min-w-0 flex-col gap-1.5 rounded-xl p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <span
              aria-hidden
              className={cx(
                "flex h-16 w-full overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
                checked
                  ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]"
                  : "border-hairline group-hover:border-ink-tertiary",
              )}
            >
              <Preview choice={choice} />
            </span>
            <span
              className={cx(
                "truncate px-0.5 text-[12px] leading-4",
                checked ? "font-semibold text-ink" : "text-ink-secondary",
              )}
            >
              {label(choice)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
