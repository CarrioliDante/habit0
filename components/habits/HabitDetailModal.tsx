"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { format, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { Archive, Trash2 } from "lucide-react";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import { Habit, Group } from "@/types";
import { HabitHeatmap } from "./HabitHeatmap";
import { EditableIcon } from "./EditableIcon";
import { HabitSettings } from "./HabitSettings";
import { HabitCalendar } from "./HabitCalendar";
import * as LucideIcons from "lucide-react";
import { normalizeIconValue } from "@/lib/iconUtils";
import type { ComponentType } from "react";
import { addToGroupsSyncQueue } from "@/lib/groupsSyncQueue";
import { updateHabitGroupsInCache } from "@/lib/groupsCache";

interface HabitDetailModalProps {
  habit: Habit;
  data: Record<string, number>;
  darkMode: boolean;
  onClose: () => void;
  onBatchUpdateCheckins: (updates: Array<{ date: string; count: number }>) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: number) => void;
  onDelete: (habitId: number) => void;
  onGroupsChange?: () => void; // Callback cuando cambian los grupos
  groups?: Group[]; // Grupos pre-cargados desde el padre
  habitGroups?: Group[]; // Grupos del hábito pre-cargados
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
  onGroupsChange,
  groups: propGroups,
  habitGroups: propHabitGroups,
}: HabitDetailModalProps) {
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Estados para edición in-place
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedHabit, setEditedHabit] = useState<Habit>(habit);

  // Estado local para checkins optimistas
  const [localData, setLocalData] = useState<Record<string, number>>(data);

  // Estados para grupos
  const [groups, setGroups] = useState<Group[]>(propGroups || []);
  const [habitGroupIds, setHabitGroupIds] = useState<number[]>(
    propHabitGroups ? propHabitGroups.map((g) => g.id) : []
  );
  const [loadingGroups, setLoadingGroups] = useState(
    !propGroups || !propHabitGroups
  );

  // Acumulador de cambios pendientes para batch
  const pendingChangesRef = useRef<Map<string, number>>(new Map());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar grupos disponibles y grupos del hábito solo si no se pasaron como props
  useEffect(() => {
    // Si ya tenemos los datos como props, no necesitamos cargar nada
    if (propGroups && propHabitGroups) {
      setGroups(propGroups);
      setHabitGroupIds(propHabitGroups.map((g) => g.id));
      setLoadingGroups(false);
      return;
    }

    const loadGroupsData = async () => {
      try {
        setLoadingGroups(true);

        // Cargar grupos y grupos del hábito en paralelo
        const promises: Promise<Response>[] = [];

        if (!propGroups) {
          promises.push(fetch("/api/groups"));
        }

        if (!propHabitGroups) {
          promises.push(fetch(`/api/habits/${habit.id}/groups`));
        }

        const responses = await Promise.all(promises);
        const groupsIndex = 0;
        const habitGroupsIndex = propGroups ? 0 : 1;

        // Procesar grupos disponibles
        if (!propGroups && responses[groupsIndex]) {
          const groupsJson = await responses[groupsIndex].json();
          if (groupsJson.success && groupsJson.data) {
            setGroups(groupsJson.data as Group[]);
          }
        }

        // Procesar grupos del hábito
        if (!propHabitGroups && responses[habitGroupsIndex]) {
          const habitGroupsJson = await responses[habitGroupsIndex].json();
          if (habitGroupsJson.success && habitGroupsJson.data) {
            const groupIds = (habitGroupsJson.data as Group[]).map((g) => g.id);
            setHabitGroupIds(groupIds);
          }
        }
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroupsData();
  }, [habit.id, propGroups, propHabitGroups]);

  // Función para agregar/quitar grupo con UI optimista y offline-first
  const toggleGroup = async (groupId: number) => {
    const isCurrentlyInGroup = habitGroupIds.includes(groupId);

    // 1) Actualización optimista en UI
    if (isCurrentlyInGroup) {
      setHabitGroupIds((prev) => prev.filter((id) => id !== groupId));
    } else {
      setHabitGroupIds((prev) => [...prev, groupId]);
    }

    // 2) Actualizar caché local
    const updatedGroups = isCurrentlyInGroup
      ? groups.filter((g) => g.id !== groupId)
      : [...groups.filter((g) => habitGroupIds.includes(g.id)), groups.find((g) => g.id === groupId)!].filter(Boolean);

    updateHabitGroupsInCache(habit.id, updatedGroups);

    // 3) Agregar a cola de sincronización
    addToGroupsSyncQueue({
      type: isCurrentlyInGroup ? "removeHabit" : "addHabit",
      groupId,
      habitId: habit.id,
    });

    // 4) Intentar sincronizar inmediatamente en background
    const syncInBackground = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/habits`, {
          method: isCurrentlyInGroup ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId: habit.id }),
        });

        if (response.ok) {
          // Notificar al padre que los grupos cambiaron (para refrescar el Dashboard)
          onGroupsChange?.();
        }
      } catch (error) {
        console.error("Background sync failed, will retry later:", error);
      }
    };

    syncInBackground();
  };

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

          {/* Grupos */}
          {!loadingGroups && groups.length > 0 && (
            <div className="mb-3">
              <span className={`text-xs mb-2 block ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Grupos:
              </span>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => {
                  const isInGroup = habitGroupIds.includes(group.id);
                  const Icons = LucideIcons as unknown as Record<string, unknown>;
                  const IconComponent = Icons[normalizeIconValue(group.icon || "Tag")] as ComponentType<{ size?: number; className?: string }> | undefined;
                  const Icon = IconComponent || LucideIcons.Tag;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isInGroup
                          ? darkMode
                            ? "bg-white/20 text-white ring-1 ring-white/30"
                            : "bg-gray-900/10 text-gray-900 ring-1 ring-gray-900/20"
                          : darkMode
                          ? "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={isInGroup ? { backgroundColor: `${group.color}30`, borderColor: group.color } : undefined}
                    >
                      <Icon size={12} style={{ color: group.color }} />
                      <span>{group.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
