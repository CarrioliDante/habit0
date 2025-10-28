"use client";
import { Habit } from "@/types";
import { HabitHeatmap } from "./HabitHeatmap";

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
  loading,
}: HabitCardProps) {
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all ${
        darkMode ? "bg-gray-800/50 border border-gray-700/50" : "bg-white border border-gray-200"
      }`}
    >
      {/* Header con icono, título y botón de check */}
      <div className="p-4 flex items-start justify-between gap-3">
        {/* Icono circular con color del hábito */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: habit.color || "#3b82f6" }}
        >
          {habit.icon || "⭐"}
        </div>

        {/* Título y descripción */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-semibold text-base ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {habit.title}
            </h3>
            {streak > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  darkMode ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-700"
                }`}
              >
                🔥 {streak}
              </span>
            )}
          </div>
          {habit.description && (
            <p
              className={`text-xs mt-1 line-clamp-1 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {habit.description}
            </p>
          )}
        </div>

        {/* Botón de Check grande - esquina superior derecha */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onCheckin(habit.id);
          }}
          disabled={loading}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0 transition-all shadow-md ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-110 hover:shadow-lg active:scale-95 cursor-pointer"
          }`}
          style={{ backgroundColor: habit.color || "#3b82f6" }}
          title="Completar hoy"
        >
          ✓
        </button>
      </div>

      {/* Heatmap - lo principal de la card */}
      <div className={`px-4 pb-4 ${darkMode ? "bg-gray-900/20" : "bg-gray-50/50"}`}>
        <HabitHeatmap
          data={checkins}
          from={dateRange.from}
          to={dateRange.to}
          color={habit.color || "#3b82f6"}
          targetPerDay={habit.targetPerDay}
          allowMultiplePerDay={habit.allowMultiplePerDay}
          darkMode={darkMode}
          cadence={habit.cadence}
        />
      </div>

      {/* Botones de acción ocultos (aparecen al hacer hover o en menú contextual) */}
      <div className={`px-4 pb-3 flex justify-end gap-2 opacity-0 hover:opacity-100 transition-opacity ${
        darkMode ? "bg-gray-900/20" : "bg-gray-50/50"
      }`}>
        <button
          onClick={() => onEdit(habit)}
          disabled={loading}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            darkMode ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => onArchive(habit.id)}
          disabled={loading}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            darkMode ? "text-gray-400 hover:text-yellow-400 hover:bg-gray-700" : "text-gray-600 hover:text-yellow-600 hover:bg-gray-200"
          }`}
        >
          📦 Archivar
        </button>
        <button
          onClick={() => onDelete(habit.id)}
          disabled={loading}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            darkMode ? "text-gray-400 hover:text-red-400 hover:bg-gray-700" : "text-gray-600 hover:text-red-600 hover:bg-gray-200"
          }`}
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}
