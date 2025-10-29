"use client";
import { useState } from "react";
import { Habit, Cadence } from "@/types";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import { EditableColorPicker } from "./EditableColorPicker";

interface HabitSettingsProps {
  habit: Habit;
  darkMode: boolean;
  onHabitChange: (habit: Habit) => void;
}

export function HabitSettings({ habit, darkMode, onHabitChange }: HabitSettingsProps) {
  const [isEditingCadence, setIsEditingCadence] = useState(false);

  const handleCadenceChange = (newCadence: Cadence) => {
    const newHabit = { ...habit, cadence: newCadence };

    // Si cambia a semanal o mensual, deshabilitar múltiples check-ins
    if (newCadence === 'weekly' || newCadence === 'custom') {
      newHabit.allowMultiplePerDay = false;
    }

    onHabitChange(newHabit);
    setIsEditingCadence(false);
  };

  const handleColorChange = (color: string) => {
    onHabitChange({ ...habit, color });
  };

  const handleMultipleToggle = () => {
    onHabitChange({ ...habit, allowMultiplePerDay: !habit.allowMultiplePerDay });
  };

  const handleTargetChange = (value: number) => {
    onHabitChange({ ...habit, targetPerDay: Math.max(1, Math.min(99, value)) });
  };

  return (
    <div className="flex items-center gap-3 mb-2 flex-wrap">
      {/* Cadencia editable */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Cadencia:
        </span>
        {isEditingCadence ? (
          <select
            value={habit.cadence || "daily"}
            onChange={(e) => handleCadenceChange(e.target.value as Cadence)}
            onBlur={() => setIsEditingCadence(false)}
            autoFocus
            className={`text-xs px-2 py-1 rounded-lg border ${
              darkMode
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          >
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="custom">Personalizada</option>
          </select>
        ) : (
          <button
            onClick={() => setIsEditingCadence(true)}
            className={`text-xs px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors ${
              darkMode ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"
            }`}
            title="Clic para cambiar"
          >
            {habit.cadence === "weekly"
              ? "Semanal"
              : habit.cadence === "custom"
              ? "Personalizada"
              : "Diaria"}
          </button>
        )}
      </div>

      {/* Color editable */}
      <EditableColorPicker
        color={habit.color || DEFAULT_HABIT_COLOR}
        darkMode={darkMode}
        onColorChange={handleColorChange}
      />

      {/* Múltiples por día - SOLO para hábitos diarios */}
      {habit.cadence === 'daily' && (
        <div className="flex items-center gap-2">
          <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Múltiple:
          </span>
          <button
            onClick={handleMultipleToggle}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              habit.allowMultiplePerDay
                ? darkMode
                  ? "bg-green-900/30 text-green-400"
                  : "bg-green-100 text-green-700"
                : darkMode
                ? "text-gray-500 hover:bg-gray-800"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {habit.allowMultiplePerDay ? "Sí" : "No"}
          </button>
        </div>
      )}

      {/* Meta diaria (solo si allowMultiplePerDay está activo Y es diario) */}
      {habit.allowMultiplePerDay && habit.cadence === 'daily' && (
        <div className="flex items-center gap-2">
          <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Meta:
          </span>
          <input
            type="number"
            min="1"
            max="99"
            value={habit.targetPerDay || 1}
            onChange={(e) => handleTargetChange(parseInt(e.target.value) || 1)}
            className={`text-xs px-2 py-1 rounded-lg w-14 text-center border ${
              darkMode
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          />
          <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            veces/día
          </span>
        </div>
      )}
    </div>
  );
}
