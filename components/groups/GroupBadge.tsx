"use client";
import type { Group } from "@/types";

interface GroupBadgeProps {
  group: Group;
  onRemove?: (id: number) => void;
}

export function GroupBadge({ group, onRemove }: GroupBadgeProps) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4,
      border: "1px solid var(--hairline)",
      fontSize: 10, color: "var(--mute)",
    }}>
      {group.name}
      {onRemove && (
        <button onClick={() => onRemove(group.id)} style={{
          border: "none", background: "transparent", cursor: "pointer",
          color: "var(--faint)", padding: 0, fontSize: 12, lineHeight: 1,
        }}>×</button>
      )}
    </span>
  );
}
