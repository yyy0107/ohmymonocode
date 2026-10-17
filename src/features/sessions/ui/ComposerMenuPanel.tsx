import type { ComponentProps } from "react";
import { ComposerPopover } from "./ComposerPopover";

type Props = ComponentProps<typeof ComposerPopover> & {
  appearance?: "composer";
};

/** Desktop composer menus share one width. Other surfaces
 * retain their established geometry, including mobile and non-composer tools. */
export function composerMenuPanelWidth(appearance: "composer" | undefined, fallback: number) {
  if (appearance !== "composer" || typeof document === "undefined" || !document.documentElement.dataset.skin) return fallback;
  const mode = document.documentElement.dataset.desktopMode;
  return mode === "chat" || mode === "code" ? 242 : fallback;
}

/** Shared composer menu surface; callers retain their own content and behavior. */
export function ComposerMenuPanel({ appearance, width, className, ...props }: Props) {
  return (
    <ComposerPopover
      {...props}
      width={width === undefined ? width : composerMenuPanelWidth(appearance, width)}
      className={appearance === "composer" ? `composer-menu-panel font-sans ${className ?? ""}` : className}
    />
  );
}
