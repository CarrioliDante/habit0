"use client";
import type { Group } from "@/types";

interface GroupFilterProps {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
}

export function GroupFilter({ groups, selectedGroupId, onSelectGroup }: GroupFilterProps) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      <button
        onClick={() => onSelectGroup(null)}
        className="mono"
        style={{
          padding: "3px 10px", borderRadius: 6,
          border: selectedGroupId === null ? "1px solid var(--hairline2)" : "1px solid transparent",
          background: selectedGroupId === null ? "var(--whisper)" : "transparent",
          color: selectedGroupId === null ? "var(--ink)" : "var(--mute)",
          fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
          transition: "all 120ms ease",
        }}>Todas</button>
      {groups.slice(0, 6).map(g => (
        <button
          key={g.id}
          onClick={() => onSelectGroup(selectedGroupId === g.id ? null : g.id)}
          className="mono"
          style={{
            padding: "3px 10px", borderRadius: 6,
            border: selectedGroupId === g.id ? "1px solid var(--hairline2)" : "1px solid transparent",
            background: selectedGroupId === g.id ? "var(--whisper)" : "transparent",
            color: selectedGroupId === g.id ? "var(--ink)" : "var(--mute)",
            fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            transition: "all 120ms ease",
          }}>{g.name}</button>
      ))}
    </div>
  );
}
