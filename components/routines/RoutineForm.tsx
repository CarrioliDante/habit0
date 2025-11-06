"use client";
import { useState, useEffect } from "react";
import type { Routine, Habit } from "@/types";
import { Button } from "@/components/ui/Button";
import { ColorPicker } from "@/components/ui/ColorPicker";
import * as LucideIcons from "lucide-react";
import { normalizeIconValue } from "@/lib/iconUtils";
import type { ComponentType } from "react";

const DAYS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 7, label: "D" },
];

interface RoutineFormProps {
  routine?: Routine;
  onSubmit: (data: {
    name: string;
    description?: string;
    daysOfWeek: number[];
    icon?: string;
    color?: string;
    habitIds?: number[];
  }) => Promise<void> | void;
  onCancel?: () => void;
  loading: boolean;
  darkMode: boolean;
  habits?: Habit[];
}

export function RoutineForm({
  routine,
  onSubmit,
  onCancel,
  loading,
  darkMode,
  habits = [],
}: RoutineFormProps) {
  const [name, setName] = useState(routine?.name || "");
  const [description, setDescription] = useState(routine?.description || "");
  const [icon, setIcon] = useState(routine?.icon || "ListChecks");
  const [color, setColor] = useState(routine?.color || "#22C55E");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(routine?.daysOfWeek || []);
  const [selectedHabitIds, setSelectedHabitIds] = useState<number[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);

  // Cargar hábitos de la rutina si estamos editando
  useEffect(() => {
    if (routine?.id) {
      const loadRoutineHabits = async () => {
        try {
          setLoadingHabits(true);
          const response = await fetch(`/api/routines/${routine.id}/habits`);
          if (response.ok) {
            const json = await response.json();
            if (json.success && json.data) {
              const habitIds = (json.data as Habit[]).map(h => h.id);
              setSelectedHabitIds(habitIds);
            }
          }
        } catch (error) {
          console.error("Error loading routine habits:", error);
        } finally {
          setLoadingHabits(false);
        }
      };
      loadRoutineHabits();
    }
  }, [routine?.id]);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleHabit = (habitId: number) => {
    setSelectedHabitIds(prev =>
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      description,
      daysOfWeek,
      icon,
      color,
      habitIds: selectedHabitIds,
    });
  };

  const Icons = LucideIcons as unknown as Record<string, unknown>;
  const IconComponent = Icons[normalizeIconValue(icon)] as ComponentType<{ className?: string }> | undefined;
  const Icon = IconComponent || LucideIcons.ListChecks;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre */}
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Nombre de la rutina
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Rutina matutina"
          required
          className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
            darkMode
              ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500"
              : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500"
          } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
        />
      </div>

      {/* Descripción */}
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu rutina..."
          rows={2}
          className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
            darkMode
              ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500"
              : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500"
          } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
        />
      </div>

      {/* Icono y Color */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Icono
          </label>
          <div
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
            }`}
          >
            <Icon className="w-5 h-5" style={{ color }} />
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              {icon}
            </span>
          </div>
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Color
          </label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
      </div>

      {/* Días de la semana */}
      <div>
        <label
          className={`block text-sm font-medium mb-3 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Días de la semana
        </label>
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                daysOfWeek.includes(day.value)
                  ? "bg-green-500 text-white"
                  : darkMode
                  ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <p className={`text-xs mt-2 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
          {daysOfWeek.length === 0
            ? "Selecciona al menos un día (o ninguno para todos los días)"
            : `Se repetirá ${daysOfWeek.length} ${daysOfWeek.length === 1 ? 'día' : 'días'} a la semana`}
        </p>
      </div>

      {/* Selección de hábitos */}
      <div>
        <label
          className={`block text-sm font-medium mb-3 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Hábitos en esta rutina
        </label>
        {loadingHabits ? (
          <div className="text-center py-4 text-gray-500">Cargando hábitos...</div>
        ) : habits.length === 0 ? (
          <div
            className={`text-center py-6 rounded-lg border ${
              darkMode
                ? "bg-gray-800/50 border-gray-700 text-gray-400"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            No tienes hábitos activos
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {habits.map((habit) => (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleHabit(habit.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  selectedHabitIds.includes(habit.id)
                    ? darkMode
                      ? "bg-green-500/20 border-green-500/50"
                      : "bg-green-50 border-green-500/50"
                    : darkMode
                    ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedHabitIds.includes(habit.id)
                      ? "bg-green-500 border-green-500"
                      : darkMode
                      ? "border-gray-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedHabitIds.includes(habit.id) && (
                    <LucideIcons.Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span
                  className={`flex-1 text-left ${
                    darkMode ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  {habit.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading || !name} className="flex-1">
          {loading ? "Guardando..." : routine ? "Guardar cambios" : "Crear rutina"}
        </Button>
      </div>
    </form>
  );
}
