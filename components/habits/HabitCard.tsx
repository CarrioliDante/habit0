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
          <div className="flex items-center gap-2">
            <h3
              className={`font-semibold text-base ${
                darkMode ? "text-gray-50" : "text-gray-900"
              }`}
            >
              {habit.title}
            </h3>
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
        <button
          onClick={(e) => {
            e.preventDefault();
            onCheckin(habit.id);
          }}
          disabled={loading}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0 transition-all shadow-md ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
          }`}
          style={{ backgroundColor: habit.color || "#BAE1FF" }}
          title="Completar hoy"
        >
          ✓
        </button>
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
