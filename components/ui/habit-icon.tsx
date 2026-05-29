import { ICONS } from "@/lib/icons";

export function HabitIcon({ name = "star", size = 18, color = "var(--ink)" }: { name?: string; size?: number; color?: string }) {
  const path = ICONS[name] || ICONS.star;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={path} />
    </svg>
  );
}
