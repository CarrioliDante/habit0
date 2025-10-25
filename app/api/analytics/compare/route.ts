import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { habits, checkins } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import { computeStreak, adherence } from "@/lib/metrics";
import { eachDayOfInterval, parseISO, subDays } from "date-fns";

/**
 * GET /api/analytics/compare?current_from=YYYY-MM-DD&current_to=YYYY-MM-DD
 * Compara período actual con el período anterior del mismo tamaño
 */
export async function GET(req: Request) {
  // Autenticación
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener usuario interno
  const me = await getOrCreateInternalUser(userId);

  // Obtener parámetros de query
  const url = new URL(req.url);
  const currentFrom = url.searchParams.get("current_from");
  const currentTo = url.searchParams.get("current_to");

  // Validar parámetros
  if (!currentFrom || !currentTo) {
    return Response.json(
      { error: "current_from y current_to son requeridos" },
      { status: 400 }
    );
  }

  // Calcular período anterior del mismo tamaño
  const currentFromDate = parseISO(currentFrom);
  const currentToDate = parseISO(currentTo);
  const daysInRange = Math.floor(
    (currentToDate.getTime() - currentFromDate.getTime()) / 86400000
  ) + 1;

  const previousToDate = subDays(currentFromDate, 1);
  const previousFromDate = subDays(previousToDate, daysInRange - 1);

  const previousFrom = previousFromDate.toISOString().slice(0, 10);
  const previousTo = previousToDate.toISOString().slice(0, 10);

  // Función helper para obtener métricas de un período
  async function getPeriodMetrics(from: string, to: string) {
    // Obtener check-ins del período
    const rows = await db
      .select()
      .from(checkins)
      .innerJoin(habits, eq(checkins.habitId, habits.id))
      .where(
        and(
          eq(habits.userId, me.id),
          gte(checkins.date, from),
          lte(checkins.date, to)
        )
      );

    // Extraer fechas únicas con check-ins
    const dates = Array.from(new Set(rows.map((r) => r.checkins.date)));

    // Calcular racha
    const streak = computeStreak(dates, to);

    // Calcular días totales del rango
    const daysTotal = eachDayOfInterval({
      start: parseISO(from),
      end: parseISO(to),
    }).length;

    // Calcular adherencia
    const adherencePercent = adherence(dates.length, daysTotal);

    // Total de check-ins
    const totalCheckins = rows.reduce(
      (sum, r) => sum + (r.checkins.count || 0),
      0
    );

    return {
      from,
      to,
      streak,
      adherence: adherencePercent,
      totalCheckins,
      daysCompleted: dates.length,
      daysTotal,
    };
  }

  // Obtener métricas de ambos períodos
  const current = await getPeriodMetrics(currentFrom, currentTo);
  const previous = await getPeriodMetrics(previousFrom, previousTo);

  // Calcular cambios
  const changes = {
    adherence: current.adherence - previous.adherence,
    streak: current.streak - previous.streak,
    totalCheckins: current.totalCheckins - previous.totalCheckins,
  };

  return Response.json({
    current,
    previous,
    changes,
  });
}
