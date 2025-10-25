/**
 * Calcula la racha actual de días consecutivos con check-ins
 * @param checkinDatesISO - Array de fechas en formato ISO (YYYY-MM-DD) con check-ins registrados
 * @param todayISO - Fecha actual en formato ISO (YYYY-MM-DD)
 * @returns Número de días consecutivos desde hoy hacia atrás con check-ins
 */
export function computeStreak(checkinDatesISO: string[], todayISO: string) {
  // Crear un Set para búsquedas rápidas de fechas (O(1) vs O(n))
  const set = new Set(checkinDatesISO);
  // Inicializar fecha actual y contador de racha
  const date = new Date(todayISO);
  let n = 0;

  // Mientras exista un check-in para la fecha actual
  while (set.has(date.toISOString().slice(0,10))) {
    n++; // Incrementar contador de racha
    date.setDate(date.getDate() - 1); // Retroceder un día
  }

  // Retornar el número de días consecutivos
  return n;
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
