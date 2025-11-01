// Utilities for mapping legacy emojis to lucide icon names and color contrast
export const EMOJI_TO_ICON: Record<string, string> = {
  "⭐": "Star",
  "🎯": "Target",
  "💪": "Activity",
  "🏃": "Activity",
  "📚": "BookOpen",
  "✍️": "PenTool",
  "🧘": "Medal", // best-effort
  "💧": "Droplet",
  "🥗": "Coffee", // fallback
  "🛌": "Bed",
  "🎵": "Music",
  "🎨": "Image",
  "💻": "Laptop",
  "📱": "Smartphone",
  "🌱": "Seedling",
  "☕": "Coffee",
  "🍎": "Apple",
  "🚴": "Bike",
  "🏊": "Swim",
  "⚡": "Zap",
  "🔥": "Zap",
  "✨": "Sparkles",
  "🌟": "Star",
  "💎": "Diamond",
  "🎁": "Gift",
  "🏆": "Trophy",
  "🥇": "Award",
  "🎓": "Award",
  "💡": "Lightbulb",
  "🧠": "Brain",
};

export function mapEmojiToIcon(value: string): string | null {
  if (!value) return null;
  return EMOJI_TO_ICON[value] || null;
}

// Normalize incoming stored icon value: if it's an emoji and we have a mapping,
// return the lucide icon name; otherwise return the original value.
export function normalizeIconValue(value: string): string {
  const mapped = mapEmojiToIcon(value);
  return mapped || value;
}

// Color utilities
export function hexToRgb(hex: string) {
  const clean = (hex || "#000000").replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

// Calculate perceived luminance and return true if color is dark
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

// Catalog of commonly-used lucide icon names (shared between picker and editable UI)
export const ICON_CATALOG = [
  "Star","Target","Activity","BookOpen","PenTool","Music","Image","Droplet","Coffee","Zap",
  "Gift","Trophy","Heart","Sun","Moon","Calendar","Check","Users","Clock","MapPin",
  "Flag","Home","Bell","Camera","ShoppingCart","Laptop","Smartphone","Lightbulb","Seedling","Diamond",
  "Award","FileText","Folder","User","Key","Lock","Play","Pause","RefreshCcw","Settings",
  "Plus","Minus","Search","Grid","List","Trash","Edit","Link","Globe","Compass","ChevronDown","Bookmark","BellOff","Battery","BatteryCharging","Cloud","Download","Upload", "Dumbbell",
];
