// Importar funciones de autenticación de Clerk para verificar usuarios
import { auth, currentUser } from "@clerk/nextjs/server";
// Importar la instancia de base de datos
import { db } from "@/lib/db";
// Importar las tablas checkins y habits del esquema
import { checkins, habits } from "@/db/schema";
// Importar Zod para validación de datos
import { z } from "zod";
// Importar funciones de Drizzle ORM para construir consultas
import { and, eq } from "drizzle-orm";
// Importar función helper para obtener/crear usuario interno
import { getOrCreateInternalUser } from "@/lib/user";
// Importar funciones de date-fns para manejo de fechas
import { eachDayOfInterval, parseISO, format } from "date-fns";
// Importar función para obtener la fecha actual en la zona horaria del usuario
import { getTodayInTZ } from "@/lib/dateHelpers";

// Definir esquema de validación para el body de la petición POST
const Body = z.object({
  habitId: z.number().int(), // ID del hábito (número entero)
  date: z.string().optional(), // Fecha en formato YYYY-MM-DD (opcional)
  count: z.number().int().min(1).default(1), // Contador (mínimo 1, por defecto 1)
  note: z.string().optional(), // Nota opcional
});

/**
 * POST /api/checkins - Crear un nuevo check-in para un hábito
 */
export async function POST(req: Request) {
  // Obtener el userId de la sesión autenticada de Clerk
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener el usuario interno de la base de datos
  const me = await getOrCreateInternalUser(userId);

  // Parsear y validar el cuerpo de la petición
  const body = await req.json();
  const parsed = Body.safeParse(body);

  // Si la validación falla, retornar error 400
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { habitId, count, note } = parsed.data;

  // Calcular la fecha en la zona horaria del usuario
  // Si no se proporciona fecha, usar "hoy" en su TZ
  const date = parsed.data.date || getTodayInTZ(me.tz);

  // Verificar que el hábito existe y pertenece al usuario
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  // Si el hábito no existe, retornar 404
  if (!habit) {
    return new Response("Habit not found", { status: 404 });
  }

  // Verificar que el hábito pertenece al usuario actual (authorization check)
  if (habit.userId !== me.id) {
    return new Response("Forbidden: habit does not belong to user", {
      status: 403,
    });
  }

  // Insertar el check-in en la base de datos
  // Si ya existe un check-in para esa fecha, actualizar el contador
  const [inserted] = await db
    .insert(checkins)
    .values({
      habitId,
      userId: me.id,
      date,
      count,
      note,
    })
    .onConflictDoUpdate({
      target: [checkins.habitId, checkins.userId, checkins.date],
      set: { count: count, note },
    })
    .returning();

  // Retornar el ID del check-in creado/actualizado
  return Response.json({ id: inserted.id });
}

/**
 * GET /api/checkins - Obtener check-ins del usuario en un rango de fechas
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&habitId=123
 */
export async function GET(req: Request) {
  // Obtener el userId de la sesión autenticada de Clerk
  const { userId } = await auth();
  // Si no hay usuario autenticado, retornar error 401
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener información completa del usuario actual desde Clerk
  const u = await currentUser();
  // Obtener o crear el usuario en nuestra base de datos interna
  const me = await getOrCreateInternalUser(userId, u?.emailAddresses?.[0]?.emailAddress);

  // Parsear los parámetros de la URL
  const url = new URL(req.url);
  // Fecha final del rango (por defecto hoy)
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0,10);
  // Fecha inicial del rango (por defecto 27 días antes de 'to')
  const from = url.searchParams.get("from") ??
    new Date(new Date(to).setDate(new Date(to).getDate() - 27)).toISOString().slice(0,10);
  // ID de hábito específico (opcional)
  const habitId = url.searchParams.get("habitId");

  // Construir la condición WHERE según si hay habitId o no
  const where = habitId
    ? and(
        eq(checkins.userId, me.id), // Check-ins del usuario actual
        eq(checkins.habitId, Number(habitId)) // Del hábito específico
      )
    : eq(checkins.userId, me.id); // Todos los check-ins del usuario

    // Obtener todos los check-ins que cumplen la condición
  const rows = await db.select().from(checkins).where(where);

  // Crear objeto para acumular conteos por fecha
  const counts: Record<string, number> = {};

  // Iterar sobre cada check-in
  for (const r of rows) {
    const day = r.date; // Fecha del check-in en formato YYYY-MM-DD (string)
    // Si la fecha está dentro del rango solicitado, acumular el contador
    if (day >= from && day <= to) {
      counts[day] = (counts[day] ?? 0) + (r.count ?? 1);
    }
  }

  // Asegurar que todas las fechas del rango estén presentes (con 0 si no hay check-ins)
  for (const d of eachDayOfInterval({
    start: parseISO(from), // Parsear fecha inicial
    end: parseISO(to) // Parsear fecha final
  })) {
    // Formatear la fecha como YYYY-MM-DD
    const key = format(d, "yyyy-MM-dd");
    // Si no hay datos para este día, asignar 0
    if (!(key in counts)) counts[key] = 0;
  }

  // Retornar el rango de fechas y los datos acumulados
  return Response.json({ from, to, data: counts });
}
