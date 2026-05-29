// Utilities for mapping legacy emojis to lucide icon names
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

// Catalog of commonly-used lucide icon names (shared between picker and editable UI)
export const ICON_CATALOG = [
  "Star","Target","Activity","BookOpen","PenTool","Music","Image","Droplet","Coffee","Zap",
  "Gift","Trophy","Heart","Sun","Moon","Calendar","Check","Users","Clock","MapPin",
  "Flag","Home","Bell","Camera","ShoppingCart","Laptop","Smartphone","Lightbulb","Seedling","Diamond",
  "Award","FileText","Folder","User","Key","Lock","Play","Pause","RefreshCcw","Settings",
  "Plus","Minus","Search","Grid","List","Trash","Edit","Link","Globe","Compass","ChevronDown","Bookmark","BellOff","Battery","BatteryCharging","Cloud","Download","Upload", "Dumbbell",
];
