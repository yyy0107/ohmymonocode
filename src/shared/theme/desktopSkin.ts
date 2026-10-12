import { preferenceStorage } from "../../features/settings/model/sharedPreferences";

/**
 * Desktop skins follow OpenMausBot: a `data-skin` attribute selects a block
 * in `src/styles/omb-skin.css`. This module only chooses the skin. Colours
 * stay in CSS.
 *
 * `auto` maps the existing Dark/Light preference onto Midnight and Daylight.
 * `classic` removes the attribute so hue, saturation and lightness keep
 * painting the original surfaces.
 */
export const DESKTOP_SKIN_IDS = [
  "midnight",
  "atelier",
  "foundry",
  "lagoon",
  "graphite",
  "linen",
  "dusk",
  "daylight",
  "meadow",
] as const;

export type DesktopSkinId = (typeof DESKTOP_SKIN_IDS)[number];
export type DesktopSkinPreference = DesktopSkinId | "auto" | "classic";

export const DESKTOP_SKIN_KEY = "monocode.desktopSkin";
export const DESKTOP_SKIN_DEFAULT: DesktopSkinPreference = "auto";

type SkinInfo = {
  /** Application-owned name; translated through the i18n catalog. */
  label: string;
  scheme: "dark" | "light";
};

export const DESKTOP_SKIN_INFO: Record<DesktopSkinId, SkinInfo> = {
  midnight: { label: "Midnight", scheme: "dark" },
  atelier: { label: "Atelier", scheme: "light" },
  foundry: { label: "Foundry", scheme: "dark" },
  lagoon: { label: "Lagoon", scheme: "light" },
  graphite: { label: "Graphite", scheme: "dark" },
  linen: { label: "Linen", scheme: "light" },
  dusk: { label: "Dusk", scheme: "dark" },
  daylight: { label: "Daylight", scheme: "light" },
  meadow: { label: "Meadow", scheme: "light" },
};

export function isDesktopSkinId(value: unknown): value is DesktopSkinId {
  return (DESKTOP_SKIN_IDS as readonly unknown[]).includes(value);
}

export function normalizeDesktopSkin(value: unknown): DesktopSkinPreference {
  if (value === "auto" || value === "classic" || isDesktopSkinId(value)) {
    return value;
  }
  return DESKTOP_SKIN_DEFAULT;
}

/** `null` means Classic: do not stamp `data-skin`. */
export function resolveDesktopSkin(
  preference: DesktopSkinPreference,
  light: boolean,
): DesktopSkinId | null {
  if (preference === "classic") return null;
  if (preference === "auto") return light ? "daylight" : "midnight";
  return preference;
}

export function loadDesktopSkin(): DesktopSkinPreference {
  try {
    return normalizeDesktopSkin(preferenceStorage.getItem(DESKTOP_SKIN_KEY));
  } catch {
    return DESKTOP_SKIN_DEFAULT;
  }
}

export function saveDesktopSkin(value: DesktopSkinPreference) {
  try {
    preferenceStorage.setItem(DESKTOP_SKIN_KEY, normalizeDesktopSkin(value));
  } catch {
    // Storage can be unavailable; the skin still applies for this run.
  }
}

/**
 * Stamp the document skin. Call after the theme class is set.
 * Returns the scheme the skin enforces, or null when Classic leaves the
 * theme preference in charge.
 */
export function applyDesktopSkin(
  preference = loadDesktopSkin(),
): "light" | "dark" | null {
  if (typeof document === "undefined") return null;
  const root = document.documentElement;
  // Mobile shares the theme API but owns its palette and color scheme.
  // Remove stale desktop markers so the imported desktop CSS stays inactive.
  if (root.dataset.mobileSkin !== undefined) {
    delete root.dataset.skin;
    root.style.colorScheme = "";
    return null;
  }
  const light = root.classList.contains("theme-light");
  const skin = resolveDesktopSkin(preference, light);
  if (!skin) {
    delete root.dataset.skin;
    root.style.colorScheme = "";
    return null;
  }
  const scheme = DESKTOP_SKIN_INFO[skin].scheme;
  root.dataset.skin = skin;
  root.classList.toggle("theme-light", scheme === "light");
  root.style.colorScheme = scheme;
  return scheme;
}
