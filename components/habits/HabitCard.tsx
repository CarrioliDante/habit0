"use client";
import { useCallback, useState } from "react";
import { format } from "date-fns";
import type { Habit, Group } from "@/types";

interface HabitCardProps {
  habit: Habit;
  checkins: Record<string, number>;
  streak: number;
  dateRange: { from: string; to: string };
  groups?: Group[];
  onCheckin: (habitId: number) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: number) => void;
  onDelete: (habitId: number) => void;
  loading: boolean;
}

export function HabitCard({
  habit, checkins, streak, groups, onCheckin, onEdit, onArchive, onDelete, loading,
}: HabitCardProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayCount = checkins[today] || 0;
  const done = todayCount >= (habit.targetPerDay || 1);
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <div style={{
      borderRadius: 10, border: "1px solid var(--hairline)",
      background: "var(--surface)", padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 12,
      transition: "border-color 120ms ease",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Check button */}
        <button onClick={() => onCheckin(habit.id)} disabled={loading} style={{
          width: 24, height: 24, borderRadius: "50%",
          border: done ? "none" : "1.5px solid var(--faint)",
          background: done ? "var(--ink)" : "transparent",
          cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 150ms ease",
        }}>
          {done && (
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="var(--inverse)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{habit.title}</span>
            {todayCount > 1 && (
              <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>×{todayCount}</span>
            )}
          </div>
          {habit.description && (
            <p style={{ fontSize: 12, color: "var(--mute)", margin: "2px 0 0" }}>{habit.description}</p>
          )}
        </div>
        {/* Streak */}
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span className="display tnum" style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{streak}</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>días</span>
          </div>
        )}
        {/* Actions */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button onClick={() => onEdit(habit)} className="row-hover" style={{ padding: 4, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)" }} title="Editar">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M3 15h3l8.5-8.5a1.5 1.5 0 0 0-2.1-2.1L4 13v2z" stroke="currentColor" strokeWidth="1.3" fill="none" />
            </svg>
          </button>
          <button onClick={() => onArchive(habit.id)} className="row-hover" style={{ padding: 4, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)" }} title="Archivar">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <rect x="2.5" y="3" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <line x1="6" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mini heatmap (last 7 days) */}
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = format(new Date(Date.now() - (6 - i) * 86400000), "yyyy-MM-dd");
          const count = checkins[d] || 0;
          const target = habit.targetPerDay || 1;
          const pct = Math.min(1, count / target);
          const isToday = d === today;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: "100%", height: 22, borderRadius: 4,
                background: pct === 0 ? "var(--whisper)" : pct >= 1 ? "var(--ink)" : "var(--hairline2)",
                border: isToday ? "1.5px solid var(--ink)" : "none",
                opacity: pct === 0 ? 1 : pct >= 1 ? 1 : 0.5,
                transition: "all 120ms ease",
              }} />
              <span style={{ fontSize: 9, color: isToday ? "var(--ink)" : "var(--faint)", fontWeight: isToday ? 500 : 400 }}>
                {weekDays[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Groups badges */}
      {groups && groups.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {groups.map(g => (
            <span key={g.id} className="mono" style={{
              padding: "2px 8px", borderRadius: 4,
              border: "1px solid var(--hairline)", fontSize: 9,
              color: "var(--faint)", letterSpacing: "0.06em",
            }}>{g.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
