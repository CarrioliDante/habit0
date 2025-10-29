"use client";
import { useState } from "react";
import { Habit } from "@/types";
import { HabitHeatmap } from "./HabitHeatmap";
import { HabitDetailModal } from "./HabitDetailModal";

interface HabitCardProps {
  habit: Habit;
  checkins: Record<string, number>;
  streak: number;
  dateRange: { from: string; to: string };
  darkMode: boolean;
  onCheckin: (habitId: number) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: number) => void;
  onDelete: (habitId: number) => void;
  onBatchUpdateCheckins: (habitId: number, updates: Array<{ date: string; count: number }>) => void;
  loading: boolean;
}

/**
 * Card individual de hábito con heatmap como protagonista
 */
export function HabitCard({
  habit,
  checkins,
  streak,
  dateRange,
  darkMode,
  onCheckin,
  onEdit,
  onArchive,
  onDelete,
  onBatchUpdateCheckins,
  loading,
}: HabitCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Lógica para el botón de check-in
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  let count = checkins[todayStr] || 0;
  const segments = habit.targetPerDay || 1;
  const hex = habit.color || "#3b82f6";
  const hexToRgba = (hex: string, alpha: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const bgColor = hexToRgba(hex, darkMode ? 0.18 : 0.13);

  // Semanal: ¿ya está marcado en la semana?
  let alreadyCheckedWeek = false;
  if (habit.cadence === "weekly") {
    const startOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      return d;
    };
    const endOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 7);
      return d;
    };
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (checkins[dStr] > 0) alreadyCheckedWeek = true;
    }
  }

  // Spinner para meta
  let spinnerButton = null;
  if (habit.allowMultiplePerDay && segments > 1) {
    // Only reset when the stored count is strictly greater than segments
    if (count > segments) count = 0;
    const size = 32; // slightly smaller spinner so it fits centered inside the button
    const stroke = 3;
    const radius = (size - stroke) / 2;
    const anglePerSegment = 360 / segments;
    spinnerButton = (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCheckin(habit.id);
        }}
        disabled={loading}
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-md relative ${
          loading
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
        }`}
        style={{ backgroundColor: bgColor }}
        title={`Check-ins hoy: ${count}/${segments}`}
      >
        <svg
          width={size}
          height={size}
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            transition: "all 0.28s cubic-bezier(.4,2,.3,1)",
            overflow: "visible",
          }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={darkMode ? "#444" : "#ddd"}
            strokeWidth={stroke}
            fill="none"
          />
          {Array.from({ length: segments }).map((_, i) => {
            const filled = i < count;
            const startAngle = (i * anglePerSegment - 90) * Math.PI / 180;
            const endAngle = ((i + 1) * anglePerSegment - 90) * Math.PI / 180;
            const x1 = size / 2 + radius * Math.cos(startAngle);
            const y1 = size / 2 + radius * Math.sin(startAngle);
            const x2 = size / 2 + radius * Math.cos(endAngle);
            const y2 = size / 2 + radius * Math.sin(endAngle);
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                stroke={filled ? hex : (darkMode ? "#222" : "#eee")}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                style={{
                  transition: "stroke 160ms ease, stroke-width 160ms ease, transform 180ms ease, opacity 180ms ease",
                  transform: filled ? `scale(1.06)` : `scale(1)`,
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  opacity: filled ? 1 : 0.9,
                }}
              />
            );
          })}
        </svg>
      </button>
    );
  }

  return (
    <>
      <div
        className={`rounded-2xl overflow-hidden transition-all cursor-pointer ${
          darkMode
            ? "bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 shadow-2xl shadow-black/30 hover:border-gray-600/50"
            : "bg-white border border-gray-200 shadow-lg shadow-gray-200/60 hover:border-gray-300"
        }`}
        onClick={() => setShowDetailModal(true)}
      >
      {/* Header con icono, título y botón de check */}
      <div className="p-4 flex items-start justify-between gap-3">
        {/* Icono circular con color del hábito */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
          style={{ backgroundColor: habit.color || "#BAE1FF" }}
        >
          {habit.icon || "⭐"}
        </div>

        {/* Título y descripción */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-semibold text-base ${
                darkMode ? "text-gray-50" : "text-gray-900"
              }`}
            >
              {habit.title}
            </h3>

            {/* Badge de cadencia */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}
            >
              {habit.cadence === "weekly" ? "🗓️ Semanal" : habit.cadence === "custom" ? "📅 Mensual" : "📆 Diario"}
            </span>

            {streak > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
                style={{
                  backgroundColor: `${habit.color || "#BAE1FF"}30`, // 30 = 20% opacity in hex
                  color: habit.color || "#BAE1FF"
                }}
              >
                🔥 {streak}
              </span>
            )}
          </div>
          {habit.description && (
            <p
              className={`text-xs mt-1 line-clamp-1 ${
                darkMode ? "text-gray-400" : "text-gray-700"
              }`}
            >
              {habit.description}
            </p>
          )}
        </div>

        {/* Botón de Check grande - esquina superior derecha */}
        {habit.cadence === "weekly" ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!alreadyCheckedWeek) onCheckin(habit.id);
            }}
            disabled={loading || alreadyCheckedWeek}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0 transition-all shadow-md ${
              loading || alreadyCheckedWeek
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
            }`}
            style={{ backgroundColor: hex }}
            title={alreadyCheckedWeek ? "Ya marcado esta semana" : "Completar semana"}
          >
            ✓
          </button>
        ) : habit.allowMultiplePerDay && segments > 1 ? spinnerButton : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCheckin(habit.id);
            }}
            disabled={loading}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0 transition-all shadow-md ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
            }`}
            style={{ backgroundColor: hex }}
            title="Completar hoy"
          >
            ✓
          </button>
        )}
      </div>

      {/* Heatmap - lo principal de la card */}
      <div
        className={`px-4 pb-4 ${darkMode ? "bg-gray-900/20" : "bg-gray-50/50"}`}
      >
        <HabitHeatmap
          data={checkins}
          from={dateRange.from}
          to={dateRange.to}
          color={habit.color || "#BAE1FF"}
          targetPerDay={habit.targetPerDay}
          allowMultiplePerDay={habit.allowMultiplePerDay}
          darkMode={darkMode}
          cadence={habit.cadence}
        />
      </div>
      </div>

      {/* Modal de detalle */}
      {showDetailModal && (
        <HabitDetailModal
          habit={habit}
          data={checkins}
          darkMode={darkMode}
          onClose={() => setShowDetailModal(false)}
          onBatchUpdateCheckins={(updates: Array<{ date: string; count: number }>) => onBatchUpdateCheckins(habit.id, updates)}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      )}

      </>
    );
  }
