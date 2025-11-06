"use client";
import { useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Routine, RoutineProgress, Habit } from "@/types";

type RoutineWithHabits = Routine & {
  habits: Habit[];
  progress?: RoutineProgress;
};

interface RoutineCardProps {
  routine: RoutineWithHabits;
  darkMode: boolean;
  onToggleHabit?: (routineId: number, habitId: number, isChecked: boolean) => void;
  onEdit?: (routine: Routine) => void;
  onDelete?: (routineId: number) => void;
}

export function RoutineCard({
  routine,
  darkMode,
  onToggleHabit,
  onEdit,
  onDelete,
}: RoutineCardProps) {
  const [localProgress, setLocalProgress] = useState(routine.progress);

  const Icon = (LucideIcons[routine.icon as keyof typeof LucideIcons] ||
    LucideIcons.ListChecks) as LucideIcon;

  const progress = localProgress || routine.progress;
  const percentage = progress
    ? Math.round((progress.completedHabits / progress.totalHabits) * 100)
    : 0;

  const handleToggleHabit = (habitId: number) => {
    if (!progress || !onToggleHabit) return;

    const habitProgress = progress.habits.find((h) => h.habitId === habitId);
    if (!habitProgress) return;

    const newIsChecked = !habitProgress.isChecked;

    // Actualización optimista
    const updatedHabits = progress.habits.map((h) =>
      h.habitId === habitId ? { ...h, isChecked: newIsChecked } : h
    );

    const completedCount = updatedHabits.filter((h) => h.isChecked).length;
    const isComplete = completedCount === progress.totalHabits;

    setLocalProgress({
      ...progress,
      habits: updatedHabits,
      completedHabits: completedCount,
      isComplete,
    });

    // Llamar al callback para sincronizar
    onToggleHabit(routine.id, habitId, newIsChecked);
  };

  return (
    <div
      className={`rounded-xl border p-4 sm:p-6 transition-all ${
        darkMode
          ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70"
          : "bg-white/80 border-gray-200/50 hover:shadow-lg"
      }`}
    >
      {/* Header - responsive */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div
            className="p-1.5 sm:p-2 rounded-lg shrink-0"
            style={{
              backgroundColor: `${routine.color}20`,
              color: routine.color,
            }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-base sm:text-lg truncate ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {routine.name}
            </h3>
            {routine.description && (
              <p
                className={`text-xs sm:text-sm line-clamp-2 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {routine.description}
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción - responsive */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(routine)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
              title="Editar rutina"
            >
              <LucideIcons.Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(routine.id)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-red-900/20 text-gray-400 hover:text-red-400"
                  : "hover:bg-red-50 text-gray-600 hover:text-red-600"
              }`}
              title="Eliminar rutina"
            >
              <LucideIcons.Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar - responsive */}
      {progress && (
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {progress.completedHabits} / {progress.totalHabits} completados
            </span>
            <span
              className={`text-xs sm:text-sm font-semibold ${
                progress.isComplete
                  ? "text-green-500"
                  : darkMode
                  ? "text-gray-400"
                  : "text-gray-600"
              }`}
            >
              {percentage}%
            </span>
          </div>
          <div
            className={`h-2 rounded-full overflow-hidden ${
              darkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <div
              className={`h-full transition-all duration-300 ${
                progress.isComplete ? "bg-green-500" : "bg-green-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de hábitos - responsive */}
      <div className="space-y-1.5 sm:space-y-2">
        {progress?.habits.map((habit) => (
          <button
            key={habit.habitId}
            onClick={() => handleToggleHabit(habit.habitId)}
            disabled={!onToggleHabit}
            className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all ${
              darkMode
                ? "bg-gray-700/30 hover:bg-gray-700/50"
                : "bg-gray-100/50 hover:bg-gray-100"
            } ${!onToggleHabit && "cursor-default"}`}
          >
            <div
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                habit.isChecked
                  ? "bg-green-500 border-green-500"
                  : darkMode
                  ? "border-gray-600"
                  : "border-gray-300"
              }`}
            >
              {habit.isChecked && (
                <LucideIcons.Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              )}
            </div>
            <span
              className={`text-xs sm:text-sm flex-1 text-left transition-all ${
                habit.isChecked
                  ? darkMode
                    ? "text-gray-300 line-through"
                    : "text-gray-600 line-through"
                  : darkMode
                  ? "text-gray-200"
                  : "text-gray-900"
              }`}
            >
              {habit.title}
            </span>
          </button>
        ))}
      </div>

      {/* Badge de completado - responsive */}
      {progress?.isComplete && (
        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg bg-green-500/20 border border-green-500/30">
          <LucideIcons.CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
          <span className="text-xs sm:text-sm font-semibold text-green-500">
            ¡Rutina completada!
          </span>
        </div>
      )}
    </div>
  );
}
