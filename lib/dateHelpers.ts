import { format, toZonedTime } from "date-fns-tz";
import { parseISO, subDays, subMonths, startOfWeek, startOfMonth, startOfYear } from "date-fns";

/**
 * Obtiene la fecha actual en la zona horaria del usuario
 * @param tz - Zona horaria IANA (ej: "America/Argentina/Buenos_Aires")
 * @returns Fecha en formato YYYY-MM-DD en esa zona horaria
 */
export function getTodayInTZ(tz: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, tz);
  return format(zonedDate, "yyyy-MM-dd", { timeZone: tz });
}

/**
 * Convierte una fecha ISO a la zona horaria del usuario
 */
export function toUserTZ(dateISO: string, tz: string): Date {
  return toZonedTime(parseISO(dateISO), tz);
}

/**
 * Obtiene el rango de fechas según el filtro seleccionado
 */
export function getDateRange(timeRange: string, customFrom?: string, customTo?: string): { from: string; to: string } {
  const today = new Date();
  const todayISO = format(today, "yyyy-MM-dd");

  switch (timeRange) {
    case "today":
      return { from: todayISO, to: todayISO };

    case "week":
      // Desde el lunes de esta semana hasta hoy
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      return { from: format(weekStart, "yyyy-MM-dd"), to: todayISO };

    case "month":
      // Desde el día 1 de este mes hasta hoy
      const monthStart = startOfMonth(today);
      return { from: format(monthStart, "yyyy-MM-dd"), to: todayISO };

    case "30days":
      // Últimos 30 días
      return { from: format(subDays(today, 30), "yyyy-MM-dd"), to: todayISO };

    case "90days":
      // Últimos 90 días
      return { from: format(subDays(today, 90), "yyyy-MM-dd"), to: todayISO };

    case "6months":
      // Últimos 6 meses
      return { from: format(subMonths(today, 6), "yyyy-MM-dd"), to: todayISO };

    case "year":
      // Desde el 1 de enero de este año hasta hoy
      const yearStart = startOfYear(today);
      return { from: format(yearStart, "yyyy-MM-dd"), to: todayISO };

    case "all":
      // Todo el tiempo (desde hace 10 años hasta hoy)
      return { from: format(subMonths(today, 120), "yyyy-MM-dd"), to: todayISO };

    case "custom":
      // Rango personalizado
      if (customFrom && customTo) {
        return { from: customFrom, to: customTo };
      }
      // Fallback a últimos 30 días si no hay custom dates
      return { from: format(subDays(today, 30), "yyyy-MM-dd"), to: todayISO };

    default:
      // Por defecto: últimos 30 días
      return { from: format(subDays(today, 30), "yyyy-MM-dd"), to: todayISO };
  }
}

/**
 * Obtiene el label en español para el filtro de tiempo
 */
export function getTimeRangeLabel(timeRange: string): string {
  switch (timeRange) {
    case "today":
      return "Hoy";
    case "week":
      return "Esta semana";
    case "month":
      return "Este mes";
    case "30days":
      return "Últimos 30 días";
    case "90days":
      return "Últimos 90 días";
    case "6months":
      return "Últimos 6 meses";
    case "year":
      return "Este año";
    case "all":
      return "Todo el tiempo";
    case "custom":
      return "Rango personalizado";
    default:
      return "Últimos 30 días";
  }
}
