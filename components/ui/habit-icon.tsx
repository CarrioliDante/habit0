import { ICONS } from "@/lib/icons";

export function HabitIcon({ name = "star", size = 18, color = "var(--ink)" }: { name?: string; size?: number; color?: string }) {
  const path = ICONS[name] || ICONS.star;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {path.split(" ").filter(Boolean).map((cmd, i) => {
        if (cmd === "M" || cmd === "L" || cmd === "C" || cmd === "Q" || cmd === "A" || cmd === "Z") return null;
        return null; // the path is a single string, pass it through
      })}
      <path d={path} />
    </svg>
  );
}
