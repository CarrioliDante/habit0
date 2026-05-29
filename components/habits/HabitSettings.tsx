"use client";
import { useState } from "react";
import type { Habit } from "@/types";
import { COLORS } from "@/lib/colors";

interface HabitSettingsProps {
  habit: Habit;
  onChange: (habit: Habit) => void;
  onClose: () => void;
}

export function HabitSettings({ habit, onChange, onClose }: HabitSettingsProps) {
  const [cadence, setCadence] = useState<string>(habit.cadence || "daily");
  const [target, setTarget] = useState(habit.targetPerDay || 1);
  const [color, setColor] = useState(habit.color || COLORS[0]);
  const [multiple, setMultiple] = useState(!!habit.allowMultiplePerDay);
  const [joker, setJoker] = useState(habit.jokerPolicy || "weekly:1");

  const handleSave = () => {
    onChange({
      ...habit,
      cadence: cadence as any,
      targetPerDay: Math.max(1, Math.min(99, target)),
      color,
      allowMultiplePerDay: multiple,
      jokerPolicy: joker,
    });
    onClose();
  };

  const itemStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "1px solid var(--hairline)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--hairline)", padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
        <h2 className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px" }}>Configuración</h2>
        <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 16px" }}>{habit.title}</p>

        {/* Cadence */}
        <div style={itemStyle}>
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Cadencia</span>
          <select value={cadence} onChange={e => setCadence(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 13, color: "var(--ink)", fontFamily: "inherit", cursor: "pointer" }}>
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
          </select>
        </div>

        {/* Target */}
        <div style={itemStyle}>
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Meta diaria</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setTarget(Math.max(1, target - 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", cursor: "pointer", color: "var(--ink)", fontSize: 16, fontFamily: "inherit" }}>−</button>
            <span className="display tnum" style={{ fontSize: 16, fontWeight: 500, minWidth: 24, textAlign: "center", color: "var(--ink)" }}>{target}</span>
            <button onClick={() => setTarget(Math.min(99, target + 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", cursor: "pointer", color: "var(--ink)", fontSize: 16, fontFamily: "inherit" }}>+</button>
          </div>
        </div>

        {/* Color */}
        <div style={itemStyle}>
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Color</span>
          <div style={{ display: "flex", gap: 5 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 24, height: 24, borderRadius: "50%", background: c,
                border: color === c ? "2px solid var(--ink)" : "2px solid transparent",
                cursor: "pointer", transition: "all 120ms ease",
              }} />
            ))}
          </div>
        </div>

        {/* Multiple per day */}
        <div style={itemStyle}>
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Múltiple por día</span>
          <button onClick={() => setMultiple(!multiple)} style={{
            width: 40, height: 22, borderRadius: 11, border: "none",
            background: multiple ? "var(--ink)" : "var(--hairline)",
            cursor: "pointer", position: "relative", transition: "background 150ms ease",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--inverse)", position: "absolute", top: 2, left: multiple ? 20 : 2, transition: "left 150ms ease" }} />
          </button>
        </div>

        {/* Joker policy */}
        <div style={itemStyle}>
          <span style={{ fontSize: 14, color: "var(--ink)" }}>Días libres</span>
          <select value={joker} onChange={e => setJoker(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--hairline)", background: "var(--bg)", fontSize: 13, color: "var(--ink)", fontFamily: "inherit", cursor: "pointer" }}>
            <option value="none">Sin días libres</option>
            <option value="weekly:1">1 por semana</option>
            <option value="weekly:2">2 por semana</option>
            <option value="monthly:3">3 por mes</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--ink)", color: "var(--inverse)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
