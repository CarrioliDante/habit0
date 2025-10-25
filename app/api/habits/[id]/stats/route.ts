import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { habits, checkins } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import { computeStreak, adherence } from "@/lib/metrics";
import { eachDayOfInterval, parseISO } from "date-fns";

/**
 * GET /api/habits/:id/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Obtener estadísticas detalladas de un hábito específico
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Autenticación
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener usuario interno
  const me = await getOrCreateInternalUser(userId);

  // Resolver params
  const { id } = await params;
  const habitId = Number(id);

  // Validar ID
  if (Number.isNaN(habitId)) {
    return new Response("Invalid habit ID", { status: 400 });
  }

  // Buscar el hábito
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  // Verificar que existe y pertenece al usuario
  if (!habit) {
    return new Response("Habit not found", { status: 404 });
  }

  if (habit.userId !== me.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Obtener parámetros de query
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  // Valores por defecto: últimos 30 días
  const to = toParam || new Date().toISOString().slice(0, 10);
  const from = fromParam || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Obtener check-ins del hábito en el rango
  const checkinsData = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.habitId, habitId),
        gte(checkins.date, from),
        lte(checkins.date, to)
      )
    )
    .orderBy(desc(checkins.date));

  // Extraer fechas con check-ins
  const checkinDates = checkinsData.map(c => c.date);

  // Calcular racha actual
  const streak = computeStreak(checkinDates, to);

  // Calcular mejor racha histórica (requiere todos los check-ins)
  const allCheckins = await db
    .select()
    .from(checkins)
    .where(eq(checkins.habitId, habitId))
    .orderBy(desc(checkins.date));

  const allDates = allCheckins.map(c => c.date);
  let bestStreak = 0;
  let tempStreak = 0;
  const sortedDates = [...new Set(allDates)].sort();

  // Calcular mejor racha iterando por todas las fechas
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }

    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  // Calcular días del rango
  const daysInRange = eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  }).length;

  // Calcular adherencia
  const daysCompleted = new Set(checkinDates).size;
  const adherencePercent = adherence(daysCompleted, daysInRange);

  // Total de check-ins
  const totalCheckins = checkinsData.reduce((sum, c) => sum + (c.count || 0), 0);

  // Último check-in
  const lastCheckin = checkinsData.length > 0 ? checkinsData[0].date : null;

  // Promedio de check-ins por día (cuando hay check-in)
  const avgPerDay = daysCompleted > 0 ? totalCheckins / daysCompleted : 0;

  return Response.json({
    habitId,
    habitTitle: habit.title,
    range: { from, to },
    streak,
    bestStreak,
    adherence: adherencePercent,
    totalCheckins,
    daysCompleted,
    daysInRange,
    lastCheckin,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
  });
}
