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
  const cursor = parseISO(todayISO);
  let streak = 0;

  while (set.has(formatDate(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
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
