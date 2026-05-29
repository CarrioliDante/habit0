"use client";
import { useState } from "react";
import type { Routine, RoutineProgress, Habit } from "@/types";

type RoutineWithHabits = Routine & { habits: Habit[]; progress?: RoutineProgress };

interface RoutineCardProps {
  routine: RoutineWithHabits;
  onToggleHabit?: (routineId: number, habitId: number, isChecked: boolean) => void;
  onEdit?: (routine: Routine) => void;
  onDelete?: (routineId: number) => void;
}

export function RoutineCard({ routine, onToggleHabit, onEdit, onDelete }: RoutineCardProps) {
  const [localProgress, setLocalProgress] = useState(routine.progress);
  const progress = localProgress || routine.progress;
  const pct = progress ? Math.round((progress.completedHabits / progress.totalHabits) * 100) : 0;

  const handleToggle = (habitId: number) => {
    if (!progress || !onToggleHabit) return;
    const hp = progress.habits.find(h => h.habitId === habitId);
    if (!hp) return;
    const checked = !hp.isChecked;
    const updated = progress.habits.map(h => h.habitId === habitId ? { ...h, isChecked: checked } : h);
    const done = updated.filter(h => h.isChecked).length;
    setLocalProgress({ ...progress, habits: updated, completedHabits: done, isComplete: done === progress.totalHabits });
    onToggleHabit(routine.id, habitId, checked);
  };

  return (
    <div style={{
      borderRadius: 10, border: "1px solid var(--hairline)",
      background: "var(--surface)", padding: "20px 24px",
      transition: "border-color 120ms ease",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{routine.name}</h3>
          {routine.description && (
            <p style={{ fontSize: 13, color: "var(--mute)", margin: "4px 0 0", lineHeight: 1.4 }}>{routine.description}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {onEdit && (
            <button onClick={() => onEdit(routine)} className="row-hover" style={{
              padding: 6, borderRadius: 6, border: "none", background: "transparent",
              cursor: "pointer", color: "var(--faint)",
            }} title="Editar">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M3 15h3l8.5-8.5a1.5 1.5 0 0 0-2.1-2.1L4 13v2z" stroke="currentColor" strokeWidth="1.3" fill="none" />
                <line x1="13" y1="4" x2="15" y2="6" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(routine.id)} className="row-hover" style={{
              padding: 6, borderRadius: 6, border: "none", background: "transparent",
              cursor: "pointer", color: "var(--faint)",
            }} title="Eliminar">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M4 5h10M7 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5M6 5v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--mute)" }}>{progress.completedHabits} / {progress.totalHabits}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: "0.08em" }}>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--hairline)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink)", borderRadius: 2, transition: "width 300ms ease" }} />
          </div>
        </div>
      )}

      {/* Habits list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {progress?.habits.map(h => (
          <button key={h.habitId} onClick={() => handleToggle(h.habitId)} disabled={!onToggleHabit}
            className="row-hover"
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 6,
              border: "none", background: "transparent", cursor: onToggleHabit ? "pointer" : "default",
              fontFamily: "inherit", textAlign: "left",
            }}>
            {/* Check circle */}
            <span style={{
              width: 20, height: 20, borderRadius: "50%",
              border: h.isChecked ? "none" : "1.5px solid var(--faint)",
              background: h.isChecked ? "var(--ink)" : "transparent",
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 150ms ease",
            }}>
              {h.isChecked && (
                <svg width="10" height="10" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="var(--inverse)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span style={{
              flex: 1, fontSize: 13, color: h.isChecked ? "var(--mute)" : "var(--ink)",
              textDecoration: h.isChecked ? "line-through" : "none",
              textDecorationColor: "var(--faint)",
            }}>{h.title}</span>
          </button>
        ))}
      </div>

      {/* Complete badge */}
      {progress?.isComplete && (
        <div style={{
          marginTop: 16, padding: "10px 14px", borderRadius: 8,
          background: "var(--whisper)", textAlign: "center",
        }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Completada
          </span>
        </div>
      )}
    </div>
  );
}
