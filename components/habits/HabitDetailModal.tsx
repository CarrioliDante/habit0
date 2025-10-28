"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  getDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Habit, Cadence } from "@/types";
import { HabitHeatmap } from "./HabitHeatmap";

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
 * Permite editar título, descripción, icono, color y cadencia directamente haciendo clic
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Estados para edición in-place
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [isEditingColor, setIsEditingColor] = useState(false);
  const [isEditingCadence, setIsEditingCadence] = useState(false);

  const [editedHabit, setEditedHabit] = useState<Habit>(habit);

  // Estado local para checkins optimistas (solo para UI instantánea)
  const [localData, setLocalData] = useState<Record<string, number>>(data);

  // Acumulador de cambios pendientes para batch
  const pendingChangesRef = useRef<Map<string, number>>(new Map());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizar localData cuando data cambie desde afuera
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Actualizar editedHabit cuando el prop habit cambie
  useEffect(() => {
    setEditedHabit(habit);
  }, [habit]);

  // Guardar cambios automáticamente cuando se termine de editar
  const saveChanges = () => {
    if (JSON.stringify(editedHabit) !== JSON.stringify(habit)) {
      onEdit(editedHabit);
    }
  };

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
    const { r, g, b } = hexToRgb(hex || "#BAE1FF");
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Obtener fecha inicial del historial - mostrar último año completo
  const oldestDate = useMemo(() => {
    // Buscar la fecha más antigua en los datos
    const allDates = Object.keys(localData);

    if (allDates.length > 0) {
      const sortedDates = allDates.sort();
      const firstDate = sortedDates[0];

      // Usar la más antigua entre: primera fecha de datos o 1 año atrás
      const oneYearAgo = format(subMonths(new Date(), 12), "yyyy-MM-dd");
      return firstDate < oneYearAgo ? firstDate : oneYearAgo;
    }

    // Si no hay datos, mostrar último año
    return format(subMonths(new Date(), 12), "yyyy-MM-dd");
  }, [localData]);

  // Generar días del mes actual
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Calcular días de padding para alinear con día de la semana
  const startPadding = useMemo(() => {
    const firstDay = monthDays[0];
    const dayOfWeek = getDay(firstDay);
    // Convertir domingo (0) a 7, lunes (1) a 1, etc.
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }, [monthDays]);

  // Función para enviar cambios pendientes en batch
  const flushBatchUpdates = useCallback(() => {
    if (pendingChangesRef.current.size === 0) return;

    const updates = Array.from(pendingChangesRef.current.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Enviar en batch
    onBatchUpdateCheckins(updates);

    // Limpiar acumulador
    pendingChangesRef.current.clear();
  }, [onBatchUpdateCheckins]);

  // Cleanup: enviar cambios pendientes al cerrar
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      flushBatchUpdates();
    };
  }, [flushBatchUpdates]);

  // Manejar click en día - acumular cambios
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const currentCount = localData[dateStr] || 0;
    let newCount: number;

    // Para hábitos semanales: solo permitir 1 check-in por semana
    if (editedHabit.cadence === 'weekly') {
      // Si ya está marcado, desmarcar
      if (currentCount > 0) {
        newCount = 0;
      } else {
        // Verificar si ya hay un check-in esta semana
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const hasCheckinThisWeek = daysInWeek.some(d => {
          const dStr = format(d, "yyyy-MM-dd");
          return dStr !== dateStr && (localData[dStr] || 0) > 0;
        });

        if (hasCheckinThisWeek) {
          // Ya hay check-in esta semana, no permitir otro
          alert('Este hábito es semanal. Ya hay un check-in registrado esta semana.');
          return;
        }

        newCount = 1;
      }
    } else if (editedHabit.allowMultiplePerDay) {
      // Incrementar contador hasta el máximo (targetPerDay), luego reiniciar a 0
      const maxCount = editedHabit.targetPerDay || 1;
      if (currentCount >= maxCount) {
        newCount = 0; // Reiniciar cuando alcanza el máximo
      } else {
        newCount = currentCount + 1;
      }
    } else {
      // Toggle: si tiene 1, poner 0; si tiene 0, poner 1
      newCount = currentCount > 0 ? 0 : 1;
    }

    // Actualizar inmediatamente el estado local para feedback visual instantáneo
    setLocalData((prev) => ({
      ...prev,
      [dateStr]: newCount,
    }));

    // Acumular cambio en el batch
    pendingChangesRef.current.set(dateStr, newCount);

    // Reiniciar timer: enviar batch después de 800ms sin nuevos clicks
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    batchTimerRef.current = setTimeout(() => {
      flushBatchUpdates();
    }, 800);
  };

  // Obtener intensidad de color (0-5 niveles basado en progreso hacia targetPerDay)
  const getIntensity = (count: number): number => {
    if (count === 0) return 0;

    // Para hábitos simples (no múltiples): máxima intensidad al completar
    if (!editedHabit.allowMultiplePerDay && count >= 1) return 5;

    // Para hábitos múltiples: calcular intensidad basada en la meta
    const target = editedHabit.targetPerDay || 1;
    const progress = count / target; // 0.0 a 1.0+ (puede ser mayor a 1)

    // Mapear progreso a intensidad 1-5 (5 niveles)
    // 0% = 0, 1-20% = 1, 21-40% = 2, 41-60% = 3, 61-80% = 4, 81%+ = 5
    if (progress >= 0.81) return 5; // 81% o más = intensidad máxima
    if (progress >= 0.61) return 4;
    if (progress >= 0.41) return 3;
    if (progress >= 0.21) return 2;
    return 1; // 1-20% = intensidad mínima
  };

  // Scroll automático al final al abrir el modal (sin animación)
  useEffect(() => {
    const scrollToEnd = () => {
      if (heatmapRef.current) {
        // Forzar scroll al máximo a la derecha inmediatamente
        const maxScroll = heatmapRef.current.scrollWidth - heatmapRef.current.clientWidth;
        heatmapRef.current.scrollLeft = maxScroll;
      }
    };

    // Ejecutar inmediatamente y con algunos reintentos por si el contenido no está listo
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
              <div className="relative">
                {isEditingIcon ? (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsEditingIcon(false)}
                    />
                    <div className={`absolute top-0 left-0 z-20 rounded-lg shadow-lg p-2 w-64 ${
                      darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
                    }`}>
                      <div className="grid grid-cols-6 gap-1">
                        {["⭐", "🎯", "💪", "🏃", "📚", "✍️", "🧘", "💧", "🥗", "🛌",
                          "🎵", "🎨", "💻", "📱", "🌱", "☕", "🍎", "🚴", "🏊", "⚡",
                          "🔥", "✨", "🌟", "💎", "🎁", "🏆", "🥇", "🎓", "💡", "🧠"
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              const newHabit = { ...editedHabit, icon: emoji };
                              setEditedHabit(newHabit);
                              setIsEditingIcon(false);
                              onEdit(newHabit);
                            }}
                            className={`w-10 h-10 text-2xl rounded hover:bg-blue-100 transition-colors ${
                              editedHabit.icon === emoji ? "bg-blue-100 ring-2 ring-blue-500" : ""
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingIcon(true)}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl hover:ring-2 hover:ring-white/50 transition-all"
                    style={{ backgroundColor: editedHabit.color || "#BAE1FF" }}
                    title="Clic para cambiar icono"
                  >
                    {editedHabit.icon || "⭐"}
                  </button>
                )}
              </div>

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

          {/* Configuración editable: Cadencia, Color, etc */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {/* Cadencia editable */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Cadencia:
              </span>
              {isEditingCadence ? (
                <select
                  value={editedHabit.cadence || "daily"}
                  onChange={(e) => {
                    const newCadence = e.target.value as Cadence;
                    const newHabit = { ...editedHabit, cadence: newCadence };

                    // Si cambia a semanal o mensual, deshabilitar múltiples check-ins
                    if (newCadence === 'weekly' || newCadence === 'custom') {
                      newHabit.allowMultiplePerDay = false;
                    }

                    setEditedHabit(newHabit);
                    setIsEditingCadence(false);
                    onEdit(newHabit);
                  }}
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
                  {editedHabit.cadence === "weekly"
                    ? "Semanal"
                    : editedHabit.cadence === "custom"
                    ? "Personalizada"
                    : "Diaria"}
                </button>
              )}
            </div>

            {/* Color editable */}
            <div className="flex items-center gap-2 relative">
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Color:
              </span>
              {isEditingColor ? (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsEditingColor(false)}
                  />
                  <div className={`absolute top-8 left-0 z-20 rounded-xl shadow-2xl p-3 w-60 ${
                    darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
                  }`}>
                    <p className={`text-xs mb-2 font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Elegí un color
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
                        "#E0BBE4", "#FFE5D9", "#D4F1F4", "#C9F0DD", "#FFC8DD",
                        "#FF6B9D", "#FFA94D", "#FFD93D", "#6BCF7F", "#4ECDC4",
                        "#A7C7E7", "#C77DFF", "#457B9D", "#E63946", "#06D6A0"
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            const newHabit = { ...editedHabit, color };
                            setEditedHabit(newHabit);
                            setIsEditingColor(false);
                            onEdit(newHabit);
                          }}
                          className={`w-10 h-10 rounded-lg transition-all hover:scale-110 shadow-sm ${
                            editedHabit.color === color ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:shadow-md"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingColor(true)}
                  className="w-6 h-6 rounded-lg hover:ring-2 hover:ring-white/50 transition-all"
                  style={{ backgroundColor: editedHabit.color || "#BAE1FF" }}
                  title="Clic para cambiar color"
                />
              )}
            </div>

            {/* Múltiples por día - SOLO para hábitos diarios */}
            {editedHabit.cadence === 'daily' && (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Múltiple:
                </span>
                <button
                  onClick={() => {
                    const newHabit = { ...editedHabit, allowMultiplePerDay: !editedHabit.allowMultiplePerDay };
                    setEditedHabit(newHabit);
                    // Guardar inmediatamente
                    onEdit(newHabit);
                  }}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    editedHabit.allowMultiplePerDay
                      ? darkMode
                        ? "bg-green-900/30 text-green-400"
                        : "bg-green-100 text-green-700"
                      : darkMode
                      ? "text-gray-500 hover:bg-gray-800"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {editedHabit.allowMultiplePerDay ? "Sí" : "No"}
                </button>
              </div>
            )}

            {/* Meta diaria (solo si allowMultiplePerDay está activo Y es diario) */}
            {editedHabit.allowMultiplePerDay && editedHabit.cadence === 'daily' && (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Meta:
                </span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={editedHabit.targetPerDay || 1}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const newHabit = { ...editedHabit, targetPerDay: Math.max(1, Math.min(99, value)) };
                    setEditedHabit(newHabit);
                  }}
                  onBlur={() => {
                    // Guardar cuando pierde el foco
                    onEdit(editedHabit);
                  }}
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
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                darkMode ? "text-gray-300 hover:text-yellow-400 hover:bg-gray-700" : "text-gray-600 hover:text-yellow-600 hover:bg-gray-100"
              }`}
            >
              📦 Archivar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar este hábito? Esta acción no se puede deshacer.')) {
                  onDelete(habit.id);
                  onClose();
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                darkMode ? "text-gray-300 hover:text-red-400 hover:bg-gray-700" : "text-gray-600 hover:text-red-600 hover:bg-gray-100"
              }`}
            >
              🗑️ Eliminar
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

          {/* Navegación del calendario mensual */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
              }`}
            >
              ← Anterior
            </button>
            <h3 className="text-sm font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h3>
            <button
              onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
              disabled={currentMonth >= startOfMonth(new Date())}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                currentMonth >= startOfMonth(new Date())
                  ? "opacity-50 cursor-not-allowed"
                  : darkMode
                  ? "hover:bg-gray-800"
                  : "hover:bg-gray-100"
              }`}
            >
              Siguiente →
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
              <div
                key={day}
                className={`text-center text-[8px] font-medium ${
                  darkMode ? "text-gray-500" : "text-gray-600"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Padding cells */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {monthDays.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const count = localData[dateStr] || 0;
              const intensity = getIntensity(count);
              const isToday = isSameDay(date, new Date());
              const isFuture = date > new Date();

              // Calcular color de fondo con escala 0-5
              let bgColor = colorWithAlpha(editedHabit.color || "#BAE1FF", darkMode ? 0.06 : 0.08);
              if (intensity > 0) {
                // 6 niveles de opacidad: 0 (vacío), 1 (20%), 2 (40%), 3 (60%), 4 (80%), 5 (100%)
                const opacityLevels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
                bgColor = colorWithAlpha(
                  editedHabit.color || "#BAE1FF",
                  opacityLevels[intensity]
                );
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(date)}
                  disabled={isFuture}
                  className={`aspect-square rounded-sm flex flex-col items-center justify-center transition-all relative ${
                    isFuture
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:scale-105 hover:shadow-lg"
                  }`}
                  style={{
                    backgroundColor: bgColor,
                    ...(isToday && { boxShadow: `0 0 0 2px ${editedHabit.color || "#BAE1FF"}` }),
                  }}
                >
                  <span
                    className={`text-[10px] font-medium ${
                      intensity > 2
                        ? "text-white"
                        : darkMode
                        ? "text-gray-300"
                        : "text-gray-700"
                    }`}
                  >
                    {format(date, "d")}
                  </span>

                  {/* Indicadores de múltiples check-ins */}
                  {editedHabit.allowMultiplePerDay && count > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 h-0.5 rounded-full"
                          style={{
                            backgroundColor: intensity > 2 ? "white" : editedHabit.color || "#BAE1FF",
                          }}
                        />
                      ))}
                      {count > 3 && (
                        <span
                          className={`text-[6px] font-bold ml-0.5 ${
                            intensity > 2 ? "text-white" : ""
                          }`}
                        >
                          +{count - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className={`mt-4 pt-4 border-t ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
            <p className={`text-xs mb-2 text-center ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {editedHabit.allowMultiplePerDay
                ? `Toca un día para agregar check-ins. Para reiniciar, superar la meta reinicia a 0.`
                : "Toca un día para marcar/desmarcar como completado"}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                Menos
              </span>
              <div className="flex gap-1">
                {/* Base (0%) */}
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: colorWithAlpha(
                      editedHabit.color || "#BAE1FF",
                      darkMode ? 0.06 : 0.08
                    ),
                  }}
                />
                {/* 20% */}
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: colorWithAlpha(editedHabit.color || "#BAE1FF", 0.2) }}
                />
                {/* 40% */}
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: colorWithAlpha(editedHabit.color || "#BAE1FF", 0.4) }}
                />
                {/* 60% */}
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: colorWithAlpha(editedHabit.color || "#BAE1FF", 0.6) }}
                />
                {/* 80% */}
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: colorWithAlpha(editedHabit.color || "#BAE1FF", 0.8) }}
                />
                {/* 100% */}
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: colorWithAlpha(editedHabit.color || "#BAE1FF", 1.0) }}
                />
              </div>
              <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                Más
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
