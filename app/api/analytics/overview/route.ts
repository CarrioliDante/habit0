import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { checkins } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { computeStreak, adherence } from "@/lib/metrics";

/**
 * GET /api/analytics/overview - Obtiene métricas generales de los hábitos del usuario
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(req: Request) {
  // Verificar autenticación del usuario
  const {userId} = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Buscar el usuario en la base de datos interna usando su clerkId
  const me = await db.select().from((await import('@/db/schema')).users).where(eq((await import('@/db/schema')).users.clerkId, userId)).limit(1)
  // Si el usuario no existe, retornar métricas vacías
  if (me.length === 0) return Response.json({ streak: 0, adherence: 0, totalCheckins: 0 });

  // Parsear los parámetros de fecha desde la URL
  const url = new URL(req.url);
  // Fecha final (por defecto: hoy)
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0,10);
  // Fecha inicial (por defecto: 30 días atrás)
  const from = url.searchParams.get("from") ?? new Date(new Date().getTime() - (30 * 24 * 60 * 60 *1000)).toISOString().slice(0,10);

  // Obtener todos los check-ins del usuario en el rango de fechas especificado
  const rows = await db.select().from(checkins)
  .where(and(
    eq(checkins.userId, me[0].id), // Check-ins del usuario actual
    gte(checkins.date, from), // Fecha mayor o igual a 'from'
    lte(checkins.date, to) // Fecha menor o igual a 'to'
  ))

  // Extraer las fechas únicas de los check-ins (un día puede tener múltiples check-ins)
  const dates = Array.from(new Set(rows.map(r=>r.date.toString().slice(0,10))));

  // Calcular la racha actual de días consecutivos con check-ins
  const streak = computeStreak(dates, to);

  // Calcular el número total de días en el rango (objetivo)
  const daysTarget = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (24*60*60*1000)) + 1;

  // Calcular el porcentaje de adherencia (días completados vs días objetivo)
  const adh = adherence(dates.length, daysTarget);

  // Retornar las métricas calculadas
  return Response.json({
    range: { from, to }, // Rango de fechas analizado
    streak, // Racha actual de días consecutivos
    adherence: adh, // Porcentaje de adherencia
    totalCheckins: dates.length // Total de días únicos con check-ins
  })
}
