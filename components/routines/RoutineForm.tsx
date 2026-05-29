"use client";
import { useState } from "react";
import type { Routine } from "@/types";
import { ICON_LIST } from "@/lib/icons";
import { HabitIcon } from "@/components/ui/habit-icon";

const WEEK = [
  { value: 1, label: "L" }, { value: 2, label: "M" }, { value: 3, label: "X" },
  { value: 4, label: "J" }, { value: 5, label: "V" }, { value: 6, label: "S" }, { value: 7, label: "D" },
];

interface RoutineFormProps {
  routine?: Routine;
  onSubmit: (data: { name: string; description?: string; daysOfWeek: number[]; color?: string; icon?: string; order?: number }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function RoutineForm({ routine, onSubmit, onCancel, loading }: RoutineFormProps) {
  const [name, setName] = useState(routine?.name || "");
  const [description, setDescription] = useState(routine?.description || "");
  const [days, setDays] = useState<number[]>(routine?.daysOfWeek || []);
  const [icon, setIcon] = useState(routine?.icon || "list");
  const [color, setColor] = useState(routine?.color || "#8b5cf6");

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || undefined, daysOfWeek: days, icon, color, order: routine?.order || 0 });
  };

  const COLORS = ["#111111", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--hairline)", padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "0 0 20px" }}>{routine ? "Editar rutina" : "Nueva rutina"}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Días de la semana */}
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Días</div>
            <div style={{ display: "flex", gap: 4 }}>
              {WEEK.map(d => (
                <button key={d.value} type="button" onClick={() => toggleDay(d.value)} style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: days.includes(d.value) ? "1.5px solid var(--ink)" : "1px solid var(--hairline)",
                  background: days.includes(d.value) ? "var(--whisper)" : "transparent",
                  color: days.includes(d.value) ? "var(--ink)" : "var(--mute)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 120ms ease",
                }}>{d.label}</button>
              ))}
            </div>
          </div>

          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
            placeholder="Nombre de la rutina"
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />

          {/* Icon */}
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Ícono</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {ICON_LIST.slice(0, 12).map(name => (
                <button key={name} type="button" onClick={() => setIcon(name)} style={{ width: 32, height: 32, borderRadius: 6, border: icon === name ? "1.5px solid var(--ink)" : "1px solid var(--hairline)", background: icon === name ? "var(--whisper)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <HabitIcon name={name} size={14} color={icon === name ? "var(--ink)" : "var(--faint)"} />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Color</div>
            <div style={{ display: "flex", gap: 5 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent", cursor: "pointer", transition: "all 120ms ease" }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--ink)", color: "var(--inverse)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>{loading ? "Guardando..." : routine ? "Guardar" : "Crear"}</button>
        </div>
      </div>
    </div>
  );
}
