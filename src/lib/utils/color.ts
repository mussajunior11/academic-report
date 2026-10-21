const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Sidebar background appearance: a hex colour and its opacity percentage. */
export type SidebarThemeValues = { color: string; opacity: number };

export const DEFAULT_SIDEBAR_THEME: SidebarThemeValues = { color: "#ffffff", opacity: 75 };

/** Normalises `#abc`, `abc`, `#aabbcc` to lowercase `#aabbcc`, or null when invalid. */
export function normalizeHex(value: string): string | null {
  const match = HEX_PATTERN.exec((value ?? "").trim());
  if (!match) return null;
  const digits = match[1];
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits;
  return `#${expanded.toLowerCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex) ?? "#ffffff";
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/** CSS rgba() string for a hex colour at the given opacity percentage (0–100). */
export function hexToRgba(hex: string, opacityPercent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const alpha = Math.min(100, Math.max(0, opacityPercent)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
}

/** True when white text would read better than dark text on the given colour. */
export function isDarkColor(hex: string, threshold = 0.55): boolean {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance < threshold;
}
