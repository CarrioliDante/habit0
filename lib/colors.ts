export const HABIT_COLORS = [
  "#22C55E", // emerald (color principal)
  "#16A34A", // deep green
  "#15803D", // forest green
  "#2563EB", // vivid blue
  "#1D4ED8", // deep blue
  "#4338CA", // indigo
  "#7C3AED", // royal purple
  "#C026D3", // electric fuchsia
  "#DB2777", // bold pink
  "#BE123C", // crimson
  "#F97316", // bright orange
  "#EA580C", // deep orange
  "#D97706", // amber
  "#F59E0B", // golden amber
  "#CA8A04", // warm gold
  "#14B8A6", // teal
  "#0F766E", // deep teal
  "#0EA5E9", // sky
  "#0284C7", // cerulean
  "#0369A1", // sea blue
] as const;

export const DEFAULT_HABIT_COLOR = HABIT_COLORS[0]; // #22C55E

// Minimal set for pickers
export const COLORS = ["#111111", "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

/** Convert a hex color string to { r, g, b } */
export function hexToRgb(hex: string) {
  const clean = (hex || "#000000").replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

/** Calculate perceived luminance and return true if color is dark */
export function isColorDark(hex: string) {
  try {
    const { r, g, b } = hexToRgb(hex || '#000');
    // sRGB luminance
    const [sr, sg, sb] = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    const lum = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
    return lum < 0.5;
  } catch {
    return false;
  }
}
