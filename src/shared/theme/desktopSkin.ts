import { preferenceStorage } from "../../features/settings/model/sharedPreferences";

/** Compatibility IDs for persisted legacy skins. Runtime paints only the new
 * light/dark pair; old IDs remain readable for migration and old callers. */
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
  /** The skin's `--color-app`, painted behind the webview and boot splash. */
  app: string;
};

export const DESKTOP_SKIN_INFO: Record<DesktopSkinId, SkinInfo> = {
  midnight: { label: "Midnight", scheme: "dark", app: "#242423" },
  atelier: { label: "Atelier", scheme: "light", app: "#f5f1eb" },
  foundry: { label: "Foundry", scheme: "dark", app: "#100e0b" },
  lagoon: { label: "Lagoon", scheme: "light", app: "#dfeceb" },
  graphite: { label: "Graphite", scheme: "dark", app: "#111214" },
  linen: { label: "Linen", scheme: "light", app: "#eceff3" },
  dusk: { label: "Dusk", scheme: "dark", app: "#121014" },
  daylight: { label: "Daylight", scheme: "light", app: "#f9f9f7" },
  meadow: { label: "Meadow", scheme: "light", app: "#ffffff" },
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

/** Legacy named values select their scheme, never their former palette. */
export function resolveDesktopSkin(
  preference: DesktopSkinPreference,
  light: boolean,
): DesktopSkinId | null {
  const scheme = isDesktopSkinId(preference) ? DESKTOP_SKIN_INFO[preference].scheme : light ? "light" : "dark";
  return scheme === "light" ? "daylight" : "midnight";
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
 * Legacy callers resolve to the new pair. Mobile returns null and owns its scheme.
 */
export function applyDesktopSkin(
  preference: DesktopSkinPreference = "auto",
): "light" | "dark" | null {
  if (typeof document === "undefined") return null;
  const root = document.documentElement;
  // Mobile shares the theme API but owns its palette and color scheme.
  // Remove stale desktop markers so the imported desktop CSS stays inactive.
  if (root.dataset.mobileSkin !== undefined) {
    delete root.dataset.skin;
    delete root.dataset.desktopVisual;
    root.style.colorScheme = "";
    return null;
  }
  const light = root.classList.contains("theme-light");
  const skin = resolveDesktopSkin(preference, light);
  if (!skin) {
    delete root.dataset.skin;
    delete root.dataset.desktopVisual;
    root.style.colorScheme = "";
    return null;
  }
  const scheme = DESKTOP_SKIN_INFO[skin].scheme;
  root.dataset.skin = skin;
  root.dataset.desktopVisual = "claude-measured-v1";
  root.classList.toggle("theme-light", scheme === "light");
  root.style.colorScheme = scheme;
  return scheme;
}
