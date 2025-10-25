import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { habits, checkins } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";

/**
 * GET /api/export/checkins?from=YYYY-MM-DD&to=YYYY-MM-DD&habitId=123
 * Exportar check-ins a CSV
 */
export async function GET(req: Request) {
  // Autenticación
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener usuario interno
  const me = await getOrCreateInternalUser(userId);

  // Obtener parámetros
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const habitIdParam = url.searchParams.get("habitId");

  // Valores por defecto
  const to = toParam || new Date().toISOString().slice(0, 10);
  const from = fromParam || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Construir condiciones de filtro
  const conditions = [
    eq(habits.userId, me.id),
    gte(checkins.date, from),
    lte(checkins.date, to),
  ];

  if (habitIdParam) {
    const habitId = Number(habitIdParam);
    if (!Number.isNaN(habitId)) {
      conditions.push(eq(checkins.habitId, habitId));
    }
  }

  // Obtener check-ins con información del hábito
  const data = await db
    .select({
      habitTitle: habits.title,
      date: checkins.date,
      count: checkins.count,
      note: checkins.note,
    })
    .from(checkins)
    .innerJoin(habits, eq(checkins.habitId, habits.id))
    .where(and(...conditions));

  // Generar CSV
  const headers = ["Hábito", "Fecha", "Cantidad", "Nota"];
  const rows = data.map(row => [
    row.habitTitle,
    row.date,
    row.count?.toString() || "1",
    row.note || "",
  ]);

  // Construir contenido CSV
  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Retornar como archivo descargable
  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="checkins_${from}_${to}.csv"`,
    },
  });
}
