"use client";
import { useState } from "react";
import type { Habit } from "@/types";
import { ICON_LIST } from "@/lib/icons";
import { HabitIcon } from "@/components/ui/habit-icon";

interface HabitFormProps {
  habit?: Habit;
  onSubmit: (data: { title: string; description?: string; icon?: string; cadence: string; targetPerDay: number }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function HabitForm({ habit, onSubmit, onCancel, loading }: HabitFormProps) {
  const [title, setTitle] = useState(habit?.title || "");
  const [description, setDescription] = useState(habit?.description || "");
  const [icon, setIcon] = useState(habit?.icon || "star");
  const [cadence, setCadence] = useState<string>((habit?.cadence as string) || "daily");
  const [target, setTarget] = useState(habit?.targetPerDay || 1);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() || undefined, icon, cadence, targetPerDay: target });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)",
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)", borderRadius: 12,
        border: "1px solid var(--hairline)", padding: 24,
        width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h2 className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "0 0 20px" }}>
          {habit ? "Editar hábito" : "Nuevo hábito"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Icon selector */}
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Ícono</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ICON_LIST.map(name => (
                <button key={name} onClick={() => setIcon(name)} style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: icon === name ? "1.5px solid var(--ink)" : "1px solid var(--hairline)",
                  background: icon === name ? "var(--whisper)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 120ms ease",
                }}>
                  <HabitIcon name={name} size={16} color={icon === name ? "var(--ink)" : "var(--faint)"} />
                </button>
              ))}
            </div>
          </div>

          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
            placeholder="Nombre del hábito"
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }}
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={cadence} onChange={e => setCadence(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>Meta</span>
              <input type="number" min={1} max={99} value={target} onChange={e => setTarget(parseInt(e.target.value) || 1)}
                style={{ width: 48, padding: "10px 8px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit", textAlign: "center" }} />
              <span className="mono" style={{ fontSize: 10, color: "var(--mute)" }}>/día</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !title.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--ink)", color: "var(--inverse)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Guardando..." : habit ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
