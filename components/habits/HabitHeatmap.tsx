"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  differenceInDays,
} from "date-fns";
// getDay removed (not needed yet)
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
  isInModal?: boolean; // Para ajustar tamaños cuando está en modal
}

/**
 * Heatmap estilo GitHub commits para visualizar check-ins de hábitos
 */
export function HabitHeatmap({
  data,
  from,
  to,
  color = "#BAE1FF",
  targetPerDay = 1,
  allowMultiplePerDay = false,
  darkMode = false,
  cadence = "daily",
  isInModal = false,
}: HabitHeatmapProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper: convertir HEX a RGB
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3 ? clean.split('').map(c=>c+c).join('') : clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  };

  // Devuelve una versión RGBA del color con la opacidad indicada (0-1)
  const colorWithAlpha = (hex: string, alpha = 1) => {
    const { r, g, b } = hexToRgb(hex || '#BAE1FF');
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper: Para hábitos semanales, encontrar el día de check-in de cada semana
  const getWeeklyCheckinDates = useMemo(() => {
    if (cadence !== 'weekly') return new Set<string>();

    const checkinDates = new Set<string>();
    Object.entries(data).forEach(([date, count]) => {
      if (count > 0) {
        checkinDates.add(date);
      }
    });
    return checkinDates;
  }, [cadence, data]);

  // Helper: Calcular intensidad para hábitos semanales basada en distancia al día de check-in
  const getWeeklyIntensity = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Si este día tiene el check-in, intensidad máxima
    if (getWeeklyCheckinDates.has(dateStr)) return 5;

    // Buscar el día de check-in de esta semana
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Domingo

    let checkinDate: Date | null = null;
    getWeeklyCheckinDates.forEach(dateStr => {
      const d = parseISO(dateStr);
      if (d >= weekStart && d <= weekEnd) {
        checkinDate = d;
      }
    });

    // Si no hay check-in esta semana, intensidad 0
    if (!checkinDate) return 0;

    // Calcular distancia en días desde el check-in
    const daysDiff = Math.abs(differenceInDays(date, checkinDate));

    // Mapear distancia a intensidad (gradiente suave)
    // 0 días = 5, 1 día = 4, 2 días = 3, 3 días = 2, 4+ días = 1
    if (daysDiff === 0) return 5;
    if (daysDiff === 1) return 4;
    if (daysDiff === 2) return 3;
    if (daysDiff === 3) return 2;
    return 1;
  };

  // Calcular el rango de días para determinar el layout
  const dayRange = useMemo(() => {
    return differenceInDays(parseISO(to), parseISO(from)) + 1;
  }, [from, to]);

  // Modo de visualización basado en el rango
  const viewMode = (() => {
    if (dayRange === 1) return 'day';
    if (dayRange <= 7) return 'week';
    if (dayRange <= 31) return 'month';
    return 'year';
  })();

  // Generar todas las fechas del rango
  const dates = useMemo(() => {
    const start = parseISO(from);
    const end = parseISO(to);
    return eachDayOfInterval({ start, end });
  }, [from, to]);

  // Días de la semana para labels
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Agrupar fechas por semanas (formato GitHub)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    if (dates.length === 0) return [];

    // Empezar desde el lunes anterior a la primera fecha
    const firstDate = dates[0];
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

  // Calcular semanas/columnas a mostrar según el modo (day/week/month/year)
  const displayWeeks = useMemo(() => {
    // Helper para generar semanas a partir de un rango de fechas
    const buildWeeksFromRange = (start: Date, end: Date) => {
      const result: Date[][] = [];
      let currentWeek: Date[] = [];
      const allDays = eachDayOfInterval({ start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(end, { weekStartsOn: 1 }) });
      allDays.forEach((date, index) => {
        currentWeek.push(date);
        if ((index + 1) % 7 === 0) {
          result.push(currentWeek);
          currentWeek = [];
        }
      });
      if (currentWeek.length > 0) result.push(currentWeek);
      return result;
    };

    if (viewMode === 'day') {
      // Mostrar solo el día seleccionado (una columna con un solo día)
      const day = parseISO(from);
      return [[day, day, day, day, day, day, day]]; // Repetir para mantener estructura pero solo mostrar uno
    }

    if (viewMode === 'week') {
      // Mostrar la semana que contiene 'from'
      const start = startOfWeek(parseISO(from), { weekStartsOn: 1 });
      const end = endOfWeek(parseISO(from), { weekStartsOn: 1 });
      return buildWeeksFromRange(start, end);
    }

    if (viewMode === 'month') {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      return buildWeeksFromRange(start, end);
    }

    // year: mostrar vista anual completa
    if (viewMode === 'year') {
      // Si está en modal, usar el rango completo from/to
      if (isInModal) {
        const start = parseISO(from);
        const end = parseISO(to);
        return buildWeeksFromRange(start, end);
      }

      // Si no está en modal, SIEMPRE mostrar últimos 12 meses desde HOY
      const end = new Date(); // Terminar HOY
      const start = subMonths(end, 12); // Exactamente 12 meses atrás

      return buildWeeksFromRange(start, end);
    }

    // fallback
    return weeks;
  }, [viewMode, currentMonth, from, to, isInModal, weeks]);

  // Calcular labels de meses para el eje superior
  const monthLabels = useMemo(() => {
    if (displayWeeks.length === 0) return [];

    const labels: { month: string; startWeekIndex: number }[] = [];
    let currentMonthStr = '';

    displayWeeks.forEach((week, weekIndex) => {
      // Tomar la fecha del primer día de la semana
      const firstDay = week[0];
      if (!firstDay) return;

      const monthStr = format(firstDay, 'MMM', { locale: es });

      if (monthStr !== currentMonthStr) {
        labels.push({ month: monthStr, startWeekIndex: weekIndex });
        currentMonthStr = monthStr;
      }
    });

    return labels;
  }, [displayWeeks]);

  // Auto-scroll al final (mes más reciente) cuando NO está en modal y es vista anual
  useEffect(() => {
    if (isInModal || viewMode !== 'year') return;

    const scrollToEnd = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 0) {
          container.scrollLeft = maxScroll;
        }
      }
    };

    // Ejecutar con reintentos para asegurar que el contenido está renderizado
    scrollToEnd();
    const timeout1 = setTimeout(scrollToEnd, 0);
    const timeout2 = setTimeout(scrollToEnd, 100);
    const timeout3 = setTimeout(scrollToEnd, 200);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [viewMode, isInModal, displayWeeks.length]); // Re-scroll cuando cambie el contenido

  /**
   * Calcular intensidad del color según check-ins
   * Escala de 0 a 5 basada en progreso hacia targetPerDay
   * Una vez alcanzada la meta, permanece en intensidad máxima (5)
   */
  const getIntensity = (count: number): number => {
    if (count === 0) return 0;

    // Para hábitos simples (no múltiples): máxima intensidad al completar
    if (!allowMultiplePerDay && count >= 1) return 5;

    // Para hábitos múltiples: calcular intensidad basada en la meta
      // Importante: limitar el target efectivo a 5 para evitar que metas muy altas (ej. 100)
      // diluyan la opacidad. A partir de 5, no se incrementa más el color.
      const rawTarget = targetPerDay || 1;
      const target = Math.max(1, Math.min(5, rawTarget)); // efectivo entre 1 y 5
      const progress = count / target; // 0.0 a 1.0+ (puede ser mayor a 1)

    // Mapear progreso a intensidad 1-5 (5 niveles)
    // 0% = 0, 1-20% = 1, 21-40% = 2, 41-60% = 3, 61-80% = 4, 81%+ = 5
    if (progress >= 0.81) return 5; // 81% o más = intensidad máxima
    if (progress >= 0.61) return 4;
    if (progress >= 0.41) return 3;
    if (progress >= 0.21) return 2;
    return 1; // 1-20% = intensidad mínima
  };

  /**
   * Obtener background según modo e intensidad
   */
  const getBackgroundColor = (date: Date): { backgroundColor?: string; opacity?: number; className: string } => {
    const dateStr = format(date, "yyyy-MM-dd");
    const count = data[dateStr] || 0;

    // Para hábitos semanales, usar lógica especial de gradiente
    let intensity: number;
    if (cadence === 'weekly') {
      intensity = getWeeklyIntensity(date);
    } else {
      intensity = getIntensity(count);
    }

    // Sin check-ins - mostrar versión suave del color del hábito
    if (intensity === 0) {
      // Usar versión muy suave del color del hábito como base
      const base = colorWithAlpha(color || '#BAE1FF', darkMode ? 0.06 : 0.08);
      return {
        backgroundColor: base,
        className: "",
      };
    }

    // Con check-ins - usar el color del hábito con opacidad progresiva
    // 6 niveles de opacidad: 0 (vacío), 1 (20%), 2 (40%), 3 (60%), 4 (80%), 5 (100%)
    const opacityLevels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const opacityValue = opacityLevels[intensity];

    return {
      backgroundColor: colorWithAlpha(color || '#BAE1FF', opacityValue),
      className: "",
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
    <div className={isInModal ? "w-full" : "w-full"}>
      {/* Indicador de vista anual - solo en year y NO en modal */}
      {!isInModal && viewMode === 'year' && (
        <div className="flex items-center justify-between mb-1.5">
          <div className={`text-[11px] font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Anual
          </div>
          <div className={`text-[10px] ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
            Vista anual
          </div>
        </div>
      )}

      {/* Controles: navegación por mes - solo en vista month y NO en modal ni en year */}
      {!isInModal && viewMode === 'month' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Prev */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentMonth((d) => subMonths(d, 1));
              }}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                darkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              title="Mes anterior"
            >
              ←
            </button>

            {/* Month display */}
            <span className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>

            {/* Next */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentMonth((d) => addMonths(d, 1));
              }}
              disabled={currentMonth >= startOfMonth(new Date())}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                currentMonth >= startOfMonth(new Date())
                  ? "opacity-50 cursor-not-allowed"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              title="Mes siguiente"
            >
              →
            </button>
          </div>

          <div className={`text-[10px] ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
            Mensual
          </div>
        </div>
      )}

      {/* Contenedor con scroll horizontal suave */}
      <div
        ref={scrollContainerRef}
        className={`${!isInModal ? 'overflow-x-auto pb-1' : ''}`}
      >
        <div className={`inline-block min-w-max ${isInModal ? 'pr-8' : ''}`}>
          {/* Labels de meses en el eje superior - solo en vista month/year si hay múltiples meses */}
        {(viewMode === 'month' || viewMode === 'year') && monthLabels.length > 1 && (
          <div className="flex mb-0.5" style={{ paddingLeft: '22px' }}>
            {monthLabels.map((label, idx) => {
              // Ajustar cellWidth según modal y viewMode
              // Para year: w-3 (12px) + gap-0.5 (2px) = 14px por columna
              // Para month: w-4 (16px) + gap-1 (4px) = 20px por columna
              const cellWidth = isInModal
                ? (viewMode === 'year' ? 18 : 24) // Más grande en modal
                : (viewMode === 'year' ? 14 : 20); // Calculado exactamente: 12px celda + 2px gap = 14px
              return (
                <div
                  key={idx}
                  className={`text-[10px] ${darkMode ? "text-gray-500" : "text-gray-600"}`}
                  style={{
                    marginLeft: idx === 0 ? `${label.startWeekIndex * cellWidth}px` : '0',
                    width: idx < monthLabels.length - 1
                      ? `${(monthLabels[idx + 1].startWeekIndex - label.startWeekIndex) * cellWidth}px`
                      : 'auto'
                  }}
                >
                  {label.month}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex">
          {/* Eje izquierdo: días de la semana - FIJO con sticky y gradiente */}
          <div
            className={`flex flex-col mr-1.5 ${viewMode === 'year' ? 'gap-0.5' : 'gap-1'} sticky left-0 z-10`}
            style={{
              background: darkMode
                ? 'linear-gradient(to right, #111827 0%, #111827 75%, transparent 100%)'
                : 'linear-gradient(to right, #ffffff 0%, #ffffff 25%, transparent 100%)',
              paddingRight: '8px',
            }}
            aria-hidden
          >
            {weekDays.map((d) => {
              const size = isInModal
                ? (viewMode === 'year' ? 'w-4 h-4' : 'w-5 h-5')
                : (viewMode === 'year' ? 'w-3 h-3' : 'w-4 h-4');
              const height = isInModal
                ? (viewMode === 'year' ? '16px' : '20px')
                : (viewMode === 'year' ? '12px' : '16px');

              return (
                <div
                  key={d}
                  className={`text-[10px] text-center flex items-center justify-center ${size} font-medium ${
                    darkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}
                  style={{ height }}
                >
                  {d}
                </div>
              );
            })}
          </div>

          {/* Grid semanas */}
          <div className={`flex ${viewMode === 'year' ? 'gap-0.5' : 'gap-1'}`}>
            {displayWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className={`flex flex-col ${viewMode === 'year' ? 'gap-0.5' : 'gap-1'}`}>
                {week.map((date, dayIndex) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const count = data[dateStr] || 0;
                  const bgStyle = getBackgroundColor(date);

                  // Ajustar tamaño según si está en modal y viewMode
                  const size = isInModal
                    ? (viewMode === 'year' ? 'w-4 h-4' : 'w-5 h-5')
                    : (viewMode === 'year' ? 'w-3 h-3' : 'w-4 h-4');

                  return (
                    <div
                      key={dayIndex}
                      className={`${size} rounded-sm transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 ${
                        darkMode ? "hover:ring-gray-300" : "hover:ring-gray-400"
                      }`}
                      style={{ backgroundColor: bgStyle.backgroundColor }}
                      title={`${format(date, "dd/MM/yyyy", { locale: es })}: ${count} check-in${count !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Leyenda de intensidad - compacta - solo fuera del modal */}
        {!isInModal && (
          <div className={`flex items-center justify-end gap-2 text-[10px] mt-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            <span>Menos</span>
            <div className="flex gap-1">
              {/* Base (0%) */}
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colorWithAlpha(color, darkMode ? 0.06 : 0.08) }}
              />
              {/* 20% */}
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorWithAlpha(color, 0.2) }} />
              {/* 40% */}
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorWithAlpha(color, 0.4) }} />
              {/* 60% */}
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorWithAlpha(color, 0.6) }} />
              {/* 80% */}
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorWithAlpha(color, 0.8) }} />
              {/* 100% */}
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorWithAlpha(color, 1.0) }} />
            </div>
            <span>Más</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
