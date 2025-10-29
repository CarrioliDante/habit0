"use client";
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Habit } from "@/types";

interface HabitCalendarProps {
  habit: Habit;
  data: Record<string, number>;
  darkMode: boolean;
  onDayClick: (date: Date) => void;
  getIntensity: (date: Date) => number;
  getHighlight?: (date: Date) => "selected" | "adjacent" | "none";
  colorWithAlpha: (alpha: number) => string;
}

/**
 * Componente de calendario mensual para el modal de detalle del hábito
 */
export function HabitCalendar({
  habit,
  data,
  darkMode,
  onDayClick,
  getIntensity,
  getHighlight,
  colorWithAlpha,
}: HabitCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generar días del mes actual (incluye días del mes anterior/siguiente para completar semanas)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInView = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="mt-4">
      {/* Navegación del mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className={`px-3 py-1 rounded ${
            darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
          }`}
          aria-label="Mes anterior"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <button
          onClick={nextMonth}
          className={`px-3 py-1 rounded ${
            darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
          }`}
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      {/* Headers de días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className={`text-center text-xs font-medium ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysInView.map((date, idx) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const count = data[dateStr] || 0;
          const intensity = getIntensity(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isFuture = date > new Date();
          const highlightState = getHighlight ? getHighlight(date) : "none";
          let backgroundColor: string;

          if (highlightState === "selected") {
            backgroundColor = colorWithAlpha(1);
          } else if (highlightState === "adjacent") {
            backgroundColor = colorWithAlpha(0.33);
          } else if (intensity > 0) {
            backgroundColor = colorWithAlpha(intensity * 0.2);
          } else {
            backgroundColor = darkMode ? "#1f2937" : "#f3f4f6";
          }

          return (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (!isFuture) onDayClick(date);
              }}
              disabled={isFuture}
              style={{ backgroundColor }}
              className={`
                relative h-12 rounded flex flex-col items-center justify-center text-base
                transition-all
                ${
                  isFuture
                    ? "cursor-not-allowed opacity-40"
                    : darkMode
                    ? "hover:ring-2 hover:ring-gray-500"
                    : "hover:ring-2 hover:ring-gray-400"
                }
                ${!isCurrentMonth ? "opacity-40" : ""}
              `}
              title={
                isFuture
                  ? "Fecha futura"
                  : `${dateStr}: ${count} check-in${count !== 1 ? "s" : ""}`
              }
            >
              <span className={isCurrentMonth ? "" : darkMode ? "text-gray-500" : "text-gray-400"}>
                {format(date, "d")}
              </span>

              {/* Indicador de múltiples check-ins */}
              {habit.allowMultiplePerDay && count > 1 && (
                <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5">
                  {count <= 3 ? (
                    // Mostrar puntos individuales para 2-3 check-ins
                    Array.from({ length: count }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          darkMode ? "bg-gray-300" : "bg-gray-700"
                        }`}
                      />
                    ))
                  ) : (
                    // Mostrar número para 4+ check-ins
                    <span className="text-[9px] font-bold">
                      {count}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda de intensidad */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Menos</span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`w-4 h-4 rounded ${
              level === 0
                ? darkMode
                  ? "bg-gray-800"
                  : "bg-gray-100"
                : ""
            }`}
            style={
              level > 0
                ? { backgroundColor: colorWithAlpha(level * 0.2) }
                : undefined
            }
          />
        ))}
        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Más</span>
      </div>
    </div>
  );
}
