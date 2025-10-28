"use client";
import { useMemo } from "react";
import { eachDayOfInterval, format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface HabitHeatmapProps {
  data: Record<string, number>; // { "2024-01-15": 3, "2024-01-16": 1, ... }
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  color?: string; // Color del hábito
  targetPerDay?: number; // Para calcular intensidad
  allowMultiplePerDay?: boolean; // Si permite múltiples check-ins
  darkMode?: boolean; // Soporte para modo oscuro
  cadence?: string; // "daily", "weekly", etc.
}

/**
 * Heatmap estilo GitHub commits para visualizar check-ins de hábitos
 */
export function HabitHeatmap({
  data,
  from,
  to,
  color = "#3b82f6",
  allowMultiplePerDay = false,
  darkMode = false,
  // cadence = "daily" // TODO: Usar para layout horizontal en vista semanal
}: HabitHeatmapProps) {
  // Generar todas las fechas del rango
  const dates = useMemo(() => {
    const start = parseISO(from);
    const end = parseISO(to);
    return eachDayOfInterval({ start, end });
  }, [from, to]);

  // Agrupar fechas por semanas (formato GitHub)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    // Empezar desde el lunes anterior a la primera fecha
    const firstDate = dates[0];
    if (!firstDate) return [];

    const weekStart = startOfWeek(firstDate, { weekStartsOn: 1 }); // 1 = Monday

    // Generar días hasta completar semanas completas
    const allDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(dates[dates.length - 1], { weekStartsOn: 1 }),
    });

    allDays.forEach((date, index) => {
      currentWeek.push(date);

      // Nueva semana cada 7 días
      if ((index + 1) % 7 === 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    // Agregar última semana si quedó incompleta
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [dates]);

  /**
   * Calcular intensidad del color según check-ins
   * Escala de 0 a 4 basada en múltiples completaciones
   * Si el hábito NO permite múltiples por día, 1+ check-in = intensidad máxima
   */
  const getIntensity = (count: number): number => {
    if (count === 0) return 0;
    // Si el hábito solo permite uno por día, brillo máximo al completar
    if (!allowMultiplePerDay && count >= 1) return 4;
    // Para hábitos con múltiples por día, escala gradual
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4; // 4 o más
  };

  /**
   * Obtener background según modo e intensidad
   */
  const getBackgroundColor = (date: Date): { backgroundColor?: string; opacity?: number; className: string } => {
    const dateStr = format(date, "yyyy-MM-dd");
    const count = data[dateStr] || 0;
    const intensity = getIntensity(count);

    // Fuera del rango
    if (date < parseISO(from) || date > parseISO(to)) {
      return {
        className: darkMode ? "bg-gray-800" : "bg-gray-100"
      };
    }

    // Sin check-ins
    if (intensity === 0) {
      return {
        className: darkMode ? "bg-gray-700" : "bg-gray-200"
      };
    }

    // Con check-ins - usar el color del hábito con opacidad progresiva
    // Opacidades más diferenciadas para mejor visibilidad
    const opacityLevels = [0, 0.25, 0.5, 0.75, 1.0];
    const opacityValue = opacityLevels[intensity];

    return {
      backgroundColor: color,
      opacity: opacityValue,
      className: ""
    };
  };

  if (weeks.length === 0) {
    return (
      <div className={`text-xs italic ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Grid de días */}
        <div className="flex gap-1">
          {/* Columna: cada semana */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {/* Fila: cada día de la semana */}
              {week.map((date, dayIndex) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const count = data[dateStr] || 0;
                const bgStyle = getBackgroundColor(date);

                return (
                  <div
                    key={dayIndex}
                    className={`
                      w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-offset-1
                      ${bgStyle.className}
                      ${darkMode ? "hover:ring-gray-400" : "hover:ring-blue-500"}
                    `}
                    style={{
                      backgroundColor: bgStyle.backgroundColor,
                      opacity: bgStyle.opacity,
                    }}
                    title={`${format(date, "dd/MM/yyyy", { locale: es })}: ${count} check-in${count !== 1 ? 's' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Leyenda de intensidad - compacta */}
        <div className={`flex items-center justify-end gap-2 text-[10px] mt-2 ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          <span>Menos</span>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-sm ${
              darkMode ? "bg-gray-700" : "bg-gray-200"
            }`} />
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.25 }} />
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.5 }} />
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.75 }} />
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 1.0 }} />
          </div>
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}
