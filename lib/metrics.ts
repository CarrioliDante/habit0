import type { Cadence } from "@/types";
import {
  format as formatDate,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";

/**
 * Calcula la racha actual de check-ins para hábitos diarios o semanales.
 * Para hábitos semanales, considera una semana cumplida si tuvo al menos
 * un check-in dentro de esa semana calendario (lunes a domingo).
 */
export function computeStreak(
  checkinDatesISO: string[],
  todayISO: string,
  options?: { cadence?: Cadence }
) {
  const cadence = options?.cadence ?? "daily";
  const uniqueDates = Array.from(new Set(checkinDatesISO));

  // Debug en producción
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.log('[computeStreak] Input:', {
      cadence,
      todayISO,
      datesCount: uniqueDates.length,
      dates: uniqueDates.slice(0, 5) // primeras 5 fechas
    });
  }

  if (cadence === "weekly") {
    if (uniqueDates.length === 0) return 0;

    const weekKeys = new Set(
      uniqueDates.map((iso) =>
        formatDate(startOfWeek(parseISO(String(iso)), { weekStartsOn: 1 }), "yyyy-MM-dd")
      )
    );

    let streak = 0;
    let cursor = startOfWeek(parseISO(todayISO), { weekStartsOn: 1 });

    while (weekKeys.has(formatDate(cursor, "yyyy-MM-dd"))) {
      streak += 1;
      cursor = subWeeks(cursor, 1);
    }

    return streak;
  }

  const set = new Set(uniqueDates);
  let streak = 0;
  let currentDate = todayISO;

  // Si no hay checkin hoy, empezar desde ayer para contar la racha histórica
  if (!set.has(currentDate)) {
    const date = parseISO(currentDate);
    date.setDate(date.getDate() - 1);
    currentDate = formatDate(date, "yyyy-MM-dd");
  }

  while (set.has(currentDate)) {
    streak += 1;
    // Decrementar fecha correctamente
    const date = parseISO(currentDate);
    date.setDate(date.getDate() - 1);
    currentDate = formatDate(date, "yyyy-MM-dd");
  }

  // Debug resultado en producción
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.log('[computeStreak] Result:', {
      streak,
      todayISO,
      hadToday: set.has(todayISO),
      setSize: set.size,
      firstDates: Array.from(set).slice(0, 3)
    });
  }

  return streak;
}

/**
 * Calcula el porcentaje de adherencia a un objetivo
 * @param daysCompleted - Número de días completados con éxito
 * @param daysTarget - Número de días objetivo esperados
 * @returns Porcentaje de adherencia (0-100) redondeado
 */
export function adherence(daysCompleted: number, daysTarget: number) {
  // Si el objetivo es 0 o negativo, retornar 0% para evitar división por cero
  if (daysTarget <= 0) return 0;
  // Calcular porcentaje y redondearlo al entero más cercano
  return Math.round((daysCompleted / daysTarget) * 100);
}
