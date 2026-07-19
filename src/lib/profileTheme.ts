import type { CatTheme } from "@/lib/catThemes";
import type { ProfileSceneDefinition } from "@/lib/profileScenes";

type ProfileThemeOverrides = {
  accentColor?: string | null;
  borderColor?: string | null;
  cardGlowColor?: string | null;
  cardGradient?: string | null;
};

export interface ResolvedProfileScene extends ProfileSceneDefinition {
  pageBase: string;
  pageVeil: string;
  pageGlowPrimary: string;
  pageGlowSecondary: string;
  pageGlowAccent: string;
  labelColor: string;
  chipBackground: string;
  chipBorder: string;
  chipText: string;
  softPanel: string;
  cardGradient: string;
  cardBorder: string;
  cardGlow: string;
  cardUiFill: string;
  cardUiBorder: string;
  cardButtonFill: string;
  cardMutedText: string;
};

function normalizeHex(value: string): string | null {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }

  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toLowerCase();
  }

  return `#${hex.toLowerCase()}`;
}

function hexToRgb(value: string) {
  const normalized = normalizeHex(value);
  if (!normalized) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function withAlpha(value: string, alpha: number) {
  const rgb = hexToRgb(value);
  if (!rgb) {
    return value;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function mixColors(primary: string, secondary: string, weight = 0.5) {
  const first = hexToRgb(primary);
  const second = hexToRgb(secondary);
  if (!first || !second) {
    return primary;
  }

  const w = Math.max(0, Math.min(1, weight));
  const channel = (a: number, b: number) =>
    Math.round(a * (1 - w) + b * w)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(first.r, second.r)}${channel(first.g, second.g)}${channel(first.b, second.b)}`;
}

export function resolveProfileTheme(
  scene: ProfileSceneDefinition,
  theme: CatTheme,
  isDarkMode: boolean,
  overrides: ProfileThemeOverrides = {},
): ResolvedProfileScene {
  const accent = overrides.accentColor || mixColors(scene.accent, theme.colors.primary, 0.55);
  const border = overrides.borderColor || mixColors(scene.border, theme.colors.secondary, 0.45);
  const pageBase = isDarkMode ? theme.colors.darkBackground : theme.colors.background;
  const labelColor = accent;
  const text = "#f8fafc";
  const mutedText = "rgba(235, 241, 255, 0.82)";
  const chipBackground = withAlpha(accent, isDarkMode ? 0.16 : 0.14);
  const chipBorder = withAlpha(border, 0.88);
  const softPanel = isDarkMode
    ? "rgba(8, 12, 18, 0.34)"
    : "rgba(8, 12, 18, 0.22)";
  const cardGradient =
    overrides.cardGradient ||
    `linear-gradient(160deg, ${withAlpha(accent, 0.58)} 0%, rgba(8, 12, 18, 0.28) 52%, ${withAlpha(
      theme.colors.secondary,
      0.42,
    )} 100%)`;

  return {
    ...scene,
    background: `linear-gradient(180deg, ${pageBase} 0%, ${pageBase} 100%)`,
    panel: `linear-gradient(180deg, rgba(21, 27, 38, 0.94) 0%, rgba(10, 14, 22, 0.92) 100%)`,
    panelSoft: `linear-gradient(180deg, ${withAlpha(accent, 0.2)} 0%, transparent 100%)`,
    border,
    accent,
    accentSoft: withAlpha(accent, 0.18),
    text: "#ffffff",
    mutedText: "rgba(255, 255, 255, 0.85)",
    shadow: "rgba(4, 8, 14, 0.42)",
    shelf: `linear-gradient(180deg, ${withAlpha(accent, 0.2)} 0%, rgba(10, 14, 20, 0.36) 100%)`,
    desk: `linear-gradient(180deg, ${withAlpha(border, 0.24)} 0%, rgba(10, 14, 20, 0.46) 100%)`,
    screen: `linear-gradient(180deg, ${withAlpha(theme.colors.accent, 0.18)} 0%, rgba(8, 28, 24, 0.96) 100%)`,
    sticker: mixColors(scene.sticker, theme.colors.accent, 0.4),
    pageBase,
    pageVeil: [
      `radial-gradient(circle at 16% 18%, ${withAlpha(theme.colors.primary, isDarkMode ? 0.2 : 0.18)} 0%, transparent 24%)`,
      `radial-gradient(circle at 82% 16%, ${withAlpha(theme.colors.secondary, isDarkMode ? 0.18 : 0.16)} 0%, transparent 22%)`,
      `radial-gradient(circle at 50% 100%, ${withAlpha(accent, isDarkMode ? 0.16 : 0.14)} 0%, transparent 30%)`,
      `linear-gradient(135deg, ${withAlpha(scene.sticker, 0.08)} 0%, transparent 35%, ${withAlpha(
        scene.accent,
        0.08,
      )} 100%)`,
    ].join(", "),
    pageGlowPrimary: theme.colors.primary,
    pageGlowSecondary: theme.colors.secondary,
    pageGlowAccent: accent,
    labelColor,
    chipBackground,
    chipBorder,
    chipText: text,
    softPanel,
    cardGradient,
    cardBorder: overrides.borderColor || border,
    cardGlow: overrides.cardGlowColor || withAlpha(accent, 0.72),
    cardUiFill: `linear-gradient(180deg, ${withAlpha(accent, 0.18)} 0%, rgba(14, 18, 26, 0.62) 100%)`,
    cardUiBorder: withAlpha(border, 0.72),
    cardButtonFill: withAlpha(accent, 0.12),
    cardMutedText: "rgba(248, 250, 252, 0.72)",
  };
}
