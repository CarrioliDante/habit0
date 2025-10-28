import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { habits, checkins } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import { z } from "zod";

/**
 * DELETE /api/habits/[id] - Elimina un hábito (soft o hard delete)
 * Query params: ?hard=true (opcional, para eliminación permanente)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación del usuario
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener información del usuario actual desde Clerk
  const u = await currentUser();
  // Obtener o crear el usuario en la base de datos interna
  const me = await getOrCreateInternalUser(
    userId,
    u?.emailAddresses?.[0]?.emailAddress
  );

  // Await params en Next.js 15+
  const { id } = await params;

  // Convertir el ID del hábito de string a número
  const habitId = Number(id);
  // Validar que el ID sea un número válido
  if (Number.isNaN(habitId)) return new Response("Bad Request", { status: 400 });

  // Determinar si es eliminación hard (permanente) o soft (archivado)
  // Por defecto es soft delete (solo marca como archivado)
  const hard = req.nextUrl.searchParams.get("hard") === "true";

  // Validar que el hábito pertenezca al usuario actual
  const owns = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(
      eq(habits.id, habitId), // El hábito debe tener el ID solicitado
      eq(habits.userId, me.id) // Y debe pertenecer al usuario actual
    ))
    .limit(1);

  // Si el hábito no existe o no pertenece al usuario, retornar error 403
  if (owns.length === 0) return new Response("Forbidden", { status: 403 });

  if (hard) {
    // Hard delete: eliminación permanente de la base de datos
    // Primero eliminar todos los check-ins asociados al hábito
    await db.delete(checkins).where(eq(checkins.habitId, habitId));
    // Luego eliminar el hábito
    await db.delete(habits).where(eq(habits.id, habitId));
  } else {
    // Soft delete: solo marcar el hábito como archivado (no lo elimina)
    await db
      .update(habits)
      .set({ isArchived: true })
      .where(and(
        eq(habits.id, habitId),
        eq(habits.userId, me.id)
      ));
  }

  // Retornar respuesta exitosa con detalles de la operación
  return Response.json({ ok: true, id: habitId, hard });
}

/**
 * PATCH /api/habits/:id - Editar un hábito existente
 * Body: { title?, description?, cadence?, targetPerDay?, reminder?, reminderTimeLocal?, reminderDays? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Obtener userId de la sesión autenticada de Clerk
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener el usuario interno de la BD
  const me = await getOrCreateInternalUser(userId);

  // Resolver params (Next.js 15+)
  const { id } = await params;
  const habitId = Number(id);

  // Validar que el ID sea un número válido
  if (Number.isNaN(habitId)) {
    return new Response("Invalid habit ID", { status: 400 });
  }

  // Definir esquema de validación con Zod
  const Body = z.object({
    title: z.string().min(1).max(256).optional(),
    description: z.string().max(2000).optional().nullable(),
    icon: z.string().max(32).optional(),
    color: z.string().max(16).optional(),
    cadence: z.enum(["daily", "weekly", "custom"]).optional(),
    targetPerDay: z.number().int().min(1).max(100).optional(),
    allowMultiplePerDay: z.boolean().optional(),
    reminder: z.boolean().optional(),
    reminderTimeLocal: z.string().max(16).optional().nullable(),
    reminderDays: z.string().max(32).optional().nullable(),
  });

  // Parsear y validar el body de la petición
  const body = await req.json();
  const parsed = Body.safeParse(body);

  // Si la validación falla, retornar error 400
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.format() },
      { status: 400 }
    );
  }

  // Buscar el hábito en la base de datos
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  // Si el hábito no existe, retornar 404
  if (!habit) {
    return new Response("Habit not found", { status: 404 });
  }

  // Verificar que el hábito pertenezca al usuario actual (ownership check)
  if (habit.userId !== me.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Si se está cambiando el título, verificar que no exista otro hábito activo con el mismo nombre
  if (parsed.data.title) {
    const trimmedTitle = parsed.data.title.trim();
    const existing = await db.query.habits.findFirst({
      where: and(
        eq(habits.userId, me.id),
        eq(habits.isArchived, false),
        sql`LOWER(${habits.title}) = LOWER(${trimmedTitle})`
      ),
    });

    // Si existe otro hábito con el mismo título (y no es el actual), retornar error
    if (existing && existing.id !== habitId) {
      return Response.json(
        { error: "Ya tienes un hábito activo con ese nombre" },
        { status: 409 }
      );
    }

    // Actualizar con título trimmed
    parsed.data.title = trimmedTitle;
  }

  // Actualizar el hábito con los nuevos valores
  const [updated] = await db
    .update(habits)
    .set({
      ...parsed.data,
      // No permitir cambiar userId ni isArchived por seguridad
    })
    .where(eq(habits.id, habitId))
    .returning();

  // Retornar el hábito actualizado
  return Response.json(updated);
}
