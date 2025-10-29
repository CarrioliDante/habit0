// Importar funciones de autenticación de Clerk para verificar usuarios
import { auth, currentUser } from "@clerk/nextjs/server";
// Importar la instancia de base de datos
import { db } from "@/lib/db";
// Importar las tablas checkins y habits del esquema
import { checkins, habits } from "@/db/schema";
// Importar Zod para validación de datos
import { z } from "zod";
// Importar funciones de Drizzle ORM para construir consultas
import { and, eq, sql } from "drizzle-orm";
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

  const { habitId, note } = parsed.data;

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
  // Si ya existe un check-in para esa fecha y el hábito permite múltiples, incrementar
  const increment = Math.max(1, parsed.data.count ?? 1);

  const [inserted] = await db
    .insert(checkins)
    .values({
      habitId,
      userId: me.id,
      date,
      count: habit.allowMultiplePerDay ? increment : 1,
      note,
    })
    .onConflictDoUpdate({
      target: [checkins.habitId, checkins.userId, checkins.date],
      set: habit.allowMultiplePerDay
        ? {
            count: sql`${checkins.count} + ${increment}`,
            note: note ?? checkins.note,
          }
        : note
        ? { note }
        : {},
    })
    .returning();

  return Response.json({ id: inserted.id, count: inserted.count });
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

/**
 * PATCH /api/checkins - Actualizar o establecer el contador de un check-in específico
 * Body: { habitId: number, date: string, count: number }
 */
export async function PATCH(req: Request) {
  // Obtener el userId de la sesión autenticada de Clerk
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener el usuario interno de la base de datos
  const me = await getOrCreateInternalUser(userId);

  // Parsear y validar el cuerpo de la petición
  const body = await req.json();
  const schema = z.object({
    habitId: z.number().int(),
    date: z.string(), // Fecha en formato YYYY-MM-DD
    count: z.number().int().min(0), // Puede ser 0 para eliminar
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { habitId, date, count } = parsed.data;

  // Verificar que el hábito existe y pertenece al usuario
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  if (!habit) {
    return new Response("Habit not found", { status: 404 });
  }

  if (habit.userId !== me.id) {
    return new Response("Forbidden: habit does not belong to user", {
      status: 403,
    });
  }

  // Buscar check-in existente
  const existingCheckin = await db.query.checkins.findFirst({
    where: and(
      eq(checkins.habitId, habitId),
      eq(checkins.userId, me.id),
      eq(checkins.date, date)
    ),
  });

  let result;

  if (count === 0) {
    // Si count es 0, eliminar el check-in si existe
    if (existingCheckin) {
      await db
        .delete(checkins)
        .where(eq(checkins.id, existingCheckin.id));
      result = { deleted: true };
    } else {
      result = { message: "No check-in to delete" };
    }
  } else if (existingCheckin) {
    // Si existe, actualizar el contador
    [result] = await db
      .update(checkins)
      .set({ count })
      .where(eq(checkins.id, existingCheckin.id))
      .returning();
  } else {
    // Si no existe, crear uno nuevo
    [result] = await db
      .insert(checkins)
      .values({
        habitId,
        userId: me.id,
        date,
        count,
      })
      .returning();
  }

  return Response.json({ success: true, result });
}

/**
 * PUT /api/checkins - Actualizar múltiples check-ins en batch (optimizado)
 * Body: { habitId: number, updates: Array<{ date: string, count: number }> }
 */
export async function PUT(req: Request) {
  // Obtener el userId de la sesión autenticada de Clerk
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener el usuario interno de la base de datos
  const me = await getOrCreateInternalUser(userId);

  // Parsear y validar el cuerpo de la petición
  const body = await req.json();
  const schema = z.object({
    habitId: z.number().int(),
    updates: z.array(z.object({
      date: z.string(), // Fecha en formato YYYY-MM-DD
      count: z.number().int().min(0), // Puede ser 0 para eliminar
    })),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { habitId, updates } = parsed.data;

  // Verificar que el hábito existe y pertenece al usuario
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  if (!habit) {
    return new Response("Habit not found", { status: 404 });
  }

  if (habit.userId !== me.id) {
    return new Response("Forbidden: habit does not belong to user", {
      status: 403,
    });
  }

  // Procesar todos los updates
  const results = [];

  for (const update of updates) {
    const { date, count } = update;

    // Buscar check-in existente
    const existingCheckin = await db.query.checkins.findFirst({
      where: and(
        eq(checkins.habitId, habitId),
        eq(checkins.userId, me.id),
        eq(checkins.date, date)
      ),
    });

    let result;

    if (count === 0) {
      // Si count es 0, eliminar el check-in si existe
      if (existingCheckin) {
        await db
          .delete(checkins)
          .where(eq(checkins.id, existingCheckin.id));
        result = { date, deleted: true };
      } else {
        result = { date, message: "No check-in to delete" };
      }
    } else if (existingCheckin) {
      // Si existe, actualizar el contador
      [result] = await db
        .update(checkins)
        .set({ count })
        .where(eq(checkins.id, existingCheckin.id))
        .returning();
    } else {
      // Si no existe, crear uno nuevo
      [result] = await db
        .insert(checkins)
        .values({
          habitId,
          userId: me.id,
          date,
          count,
        })
        .returning();
    }

    results.push(result);
  }

  return Response.json({ success: true, count: results.length, results });
}
