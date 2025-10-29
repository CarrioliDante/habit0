"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { format, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { Archive, Trash2 } from "lucide-react";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import { Habit } from "@/types";
import { HabitHeatmap } from "./HabitHeatmap";
import { EditableIcon } from "./EditableIcon";
import { HabitSettings } from "./HabitSettings";
import { HabitCalendar } from "./HabitCalendar";

interface HabitDetailModalProps {
  habit: Habit;
  data: Record<string, number>;
  darkMode: boolean;
  onClose: () => void;
  onBatchUpdateCheckins: (updates: Array<{ date: string; count: number }>) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: number) => void;
  onDelete: (habitId: number) => void;
}

/**
 * Modal con vista expandida del hábito
 * Muestra heatmap completo + calendario grande navegable donde se pueden agregar/quitar check-ins
 */
export function HabitDetailModal({
  habit,
  data,
  darkMode,
  onClose,
  onBatchUpdateCheckins,
  onEdit,
  onArchive,
  onDelete,
}: HabitDetailModalProps) {
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Estados para edición in-place
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedHabit, setEditedHabit] = useState<Habit>(habit);

  // Estado local para checkins optimistas
  const [localData, setLocalData] = useState<Record<string, number>>(data);

  // Acumulador de cambios pendientes para batch
  const pendingChangesRef = useRef<Map<string, number>>(new Map());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizar estados cuando cambien los props
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  useEffect(() => {
    setEditedHabit(habit);
  }, [habit]);

  // Helper: convertir HEX a RGB
  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    const bigint = parseInt(
      clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  };

  const colorWithAlpha = (hex: string, alpha = 1) => {
    const { r, g, b } = hexToRgb(hex || DEFAULT_HABIT_COLOR);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Función curried para el calendario (solo pasa alpha, usa el color del hábito)
  const getColorWithAlpha = (alpha: number) => {
    return colorWithAlpha(editedHabit.color || DEFAULT_HABIT_COLOR, alpha);
  };

  // Obtener fecha inicial del historial
  const oldestDate = useMemo(() => {
    const allDates = Object.keys(localData);
    if (allDates.length > 0) {
      const sortedDates = allDates.sort();
      const firstDate = sortedDates[0];
      const oneYearAgo = format(subMonths(new Date(), 12), "yyyy-MM-dd");
      return firstDate < oneYearAgo ? firstDate : oneYearAgo;
    }
    return format(subMonths(new Date(), 12), "yyyy-MM-dd");
  }, [localData]);

  // Función para enviar cambios pendientes en batch
  const flushBatchUpdates = useCallback(() => {
    if (pendingChangesRef.current.size === 0) return;
    const updates = Array.from(pendingChangesRef.current.entries()).map(([date, count]) => ({
      date,
      count,
    }));
    onBatchUpdateCheckins(updates);
    pendingChangesRef.current.clear();
  }, [onBatchUpdateCheckins]);

  // Cleanup: enviar cambios pendientes al cerrar
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      flushBatchUpdates();
    };
  }, [flushBatchUpdates]);

  // Manejar click en día
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const currentCount = localData[dateStr] || 0;
    let newCount: number;

    // Para hábitos semanales: solo permitir 1 check-in por semana
    if (editedHabit.cadence === 'weekly') {
      if (currentCount > 0) {
        newCount = 0;
      } else {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const hasCheckinThisWeek = daysInWeek.some(d => {
          const dStr = format(d, "yyyy-MM-dd");
          return dStr !== dateStr && (localData[dStr] || 0) > 0;
        });

        if (hasCheckinThisWeek) {
          alert('Este hábito es semanal. Ya hay un check-in registrado esta semana.');
          return;
        }
        newCount = 1;
      }
    } else if (editedHabit.allowMultiplePerDay) {
      const maxCount = editedHabit.targetPerDay || 1;
      newCount = currentCount >= maxCount ? 0 : currentCount + 1;
    } else {
      newCount = currentCount > 0 ? 0 : 1;
    }

    setLocalData((prev) => ({ ...prev, [dateStr]: newCount }));
    pendingChangesRef.current.set(dateStr, newCount);

    if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    batchTimerRef.current = setTimeout(() => flushBatchUpdates(), 800);
  };

  // Obtener intensidad de color
  const getIntensity = (count: number): number => {
    if (count === 0) return 0;
    if (!editedHabit.allowMultiplePerDay && count >= 1) return 5;

    // Limitar el target efectivo a 5 para que metas altas no diluyan la opacidad
    const rawTarget = editedHabit.targetPerDay || 1;
    const target = Math.max(1, Math.min(5, rawTarget));
    const progress = count / target;

    if (progress >= 0.81) return 5;
    if (progress >= 0.61) return 4;
    if (progress >= 0.41) return 3;
    if (progress >= 0.21) return 2;
    return 1;
  };

  // Wrapper para el calendario (convierte Date a count)
  const getIntensityForDate = (date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    const count = localData[dateStr] || 0;
    return getIntensity(count);
  };
  const weeklySelectedDates = useMemo(() => {
    if (editedHabit.cadence !== 'weekly') return new Set<string>();
    const selected = new Set<string>();
    Object.entries(localData).forEach(([date, count]) => {
      if (count > 0) selected.add(date);
    });
    return selected;
  }, [editedHabit.cadence, localData]);
  const weeklyWeekKeys = useMemo(() => {
    if (editedHabit.cadence !== 'weekly') return new Set<string>();
    const weeks = new Set<string>();
    weeklySelectedDates.forEach((date) => {
      weeks.add(format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd"));
    });
    return weeks;
  }, [weeklySelectedDates, editedHabit.cadence]);
  const getWeeklyHighlightForDate = useCallback(
    (date: Date): "selected" | "adjacent" | "none" => {
      if (editedHabit.cadence !== 'weekly') return 'none';
      const dateStr = format(date, "yyyy-MM-dd");
      if (weeklySelectedDates.has(dateStr) && (localData[dateStr] || 0) > 0) {
        return 'selected';
      }
      const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
      if (weeklyWeekKeys.has(weekKey)) return 'adjacent';
      return 'none';
    },
    [editedHabit.cadence, weeklySelectedDates, weeklyWeekKeys, localData]
  );

  // Scroll automático al final
  useEffect(() => {
    const scrollToEnd = () => {
      if (heatmapRef.current) {
        const maxScroll = heatmapRef.current.scrollWidth - heatmapRef.current.clientWidth;
        heatmapRef.current.scrollLeft = maxScroll;
      }
    };
    scrollToEnd();
    const timeout1 = setTimeout(scrollToEnd, 0);
    const timeout2 = setTimeout(scrollToEnd, 50);
    const timeout3 = setTimeout(scrollToEnd, 100);
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  const handleIconChange = (icon: string) => {
    const newHabit = { ...editedHabit, icon };
    setEditedHabit(newHabit);
    onEdit(newHabit);
  };

  const handleHabitChange = (newHabit: Habit) => {
    setEditedHabit(newHabit);
    onEdit(newHabit);
  };

  const saveChanges = () => {
    if (JSON.stringify(editedHabit) !== JSON.stringify(habit)) {
      onEdit(editedHabit);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md sm:max-w-lg rounded-lg overflow-hidden ${
          darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-3 border-b ${
            darkMode ? "border-gray-800 bg-gray-900/95" : "border-gray-200 bg-white/95"
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              {/* Icono editable */}
              <EditableIcon
                icon={editedHabit.icon || "Star"}
                color={editedHabit.color || DEFAULT_HABIT_COLOR}
                darkMode={darkMode}
                onIconChange={handleIconChange}
              />

              <div className="flex-1">
                {/* Título editable */}
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editedHabit.title}
                    onChange={(e) => setEditedHabit({ ...editedHabit, title: e.target.value })}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      saveChanges();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTitle(false);
                        saveChanges();
                      }
                      if (e.key === 'Escape') {
                        setEditedHabit(habit);
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    className={`text-4xl font-bold w-full bg-transparent border-b-2 border-blue-500 outline-none ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  />
                ) : (
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className="text-4xl font-bold cursor-pointer hover:opacity-70 transition-opacity"
                    title="Clic para editar"
                  >
                    {editedHabit.title}
                  </h1>
                )}

                {/* Badge de cadencia */}

                {/* Descripción editable */}
                {isEditingDescription ? (
                  <input
                    type="text"
                    value={editedHabit.description || ""}
                    onChange={(e) => setEditedHabit({ ...editedHabit, description: e.target.value })}
                    onBlur={() => {
                      setIsEditingDescription(false);
                      saveChanges();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingDescription(false);
                        saveChanges();
                      }
                      if (e.key === 'Escape') {
                        setEditedHabit(habit);
                        setIsEditingDescription(false);
                      }
                    }}
                    autoFocus
                    placeholder="Agregar descripción..."
                    className={`text-[12px] mt-0.5 w-full bg-transparent border-b border-blue-500 outline-none ${
                      darkMode ? "text-gray-400 placeholder-gray-600" : "text-gray-600 placeholder-gray-400"
                    }`}
                  />
                ) : (
                  <p
                    onClick={() => setIsEditingDescription(true)}
                    className={`text-[12px] mt-0.5 cursor-pointer hover:opacity-70 transition-opacity ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    } ${!editedHabit.description && "italic opacity-50"}`}
                    title="Clic para editar"
                  >
                    {editedHabit.description || "Agregar descripción..."}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={`text-xl w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
              }`}
            >
              ×
            </button>
          </div>

          {/* Configuración editable */}
          <HabitSettings
            habit={editedHabit}
            darkMode={darkMode}
            onHabitChange={handleHabitChange}
          />

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('¿Archivar este hábito?')) {
                  onArchive(habit.id);
                  onClose();
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                darkMode ? "text-gray-300 hover:text-yellow-400 hover:bg-gray-700" : "text-gray-600 hover:text-yellow-600 hover:bg-gray-100"
              }`}
            >
              <Archive size={14} />
              Archivar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar este hábito? Esta acción no se puede deshacer.')) {
                  onDelete(habit.id);
                  onClose();
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                darkMode ? "text-gray-300 hover:text-red-400 hover:bg-gray-700" : "text-gray-600 hover:text-red-600 hover:bg-gray-100"
              }`}
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>
        </div>

        {/* Heatmap completo con scroll */}
        <div className="p-3">
          <div
            ref={heatmapRef}
            className={`mb-3 pl-4 pr-12 py-3 rounded-lg overflow-x-auto ${darkMode ? "bg-gray-800/50" : "bg-gray-100/50"}`}
          >
            <HabitHeatmap
              data={localData}
              from={oldestDate}
              to={format(new Date(), "yyyy-MM-dd")}
              color={editedHabit.color}
              targetPerDay={editedHabit.targetPerDay}
              allowMultiplePerDay={editedHabit.allowMultiplePerDay}
              darkMode={darkMode}
              cadence={editedHabit.cadence}
              isInModal={true}
            />
          </div>

          {/* Calendario mensual */}
            <HabitCalendar
              habit={editedHabit}
              data={localData}
              darkMode={darkMode}
              onDayClick={handleDayClick}
              getIntensity={getIntensityForDate}
              getHighlight={getWeeklyHighlightForDate}
              colorWithAlpha={getColorWithAlpha}
            />
        </div>
      </div>
    </div>
  );
}
