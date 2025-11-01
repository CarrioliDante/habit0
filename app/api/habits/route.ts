import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { habits } from "@/db/schema";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import type { ApiResponse, Habit } from "@/types";

// Esquema de validación con Zod para crear un hábito
const Body = z.object({
  title: z.string().min(1, "El título es requerido").max(256, "Título muy largo"),
  description: z.string().max(2000, "Descripción muy larga").optional(),
  icon: z.string().max(32).optional().default("Star"),
  color: z.string().max(16).optional().default(DEFAULT_HABIT_COLOR),
  cadence: z.enum(["daily", "weekly", "custom"]),
  targetPerDay: z.number().int().min(1).max(100).default(1),
  allowMultiplePerDay: z.boolean().optional().default(false),
  reminder: z.boolean().optional(),
  reminderTimeLocal: z.string().max(16).optional(),
  reminderDays: z.string().max(32).optional(),
});

/**
 * GET /api/habits - Obtiene todos los hábitos del usuario (activos y archivados)
 */
export async function GET() {
  // Verificar autenticación del usuario
  const { userId } = await auth();
  if (!userId) {
    const response: ApiResponse = {
      success: false,
      error: "Unauthorized",
    };
    return Response.json(response, { status: 401 });
  }

  // Obtener información del usuario actual desde Clerk
  const u = await currentUser();
  // Obtener o crear el usuario en la base de datos interna
  const me = await getOrCreateInternalUser(userId, u?.emailAddresses?.[0]?.emailAddress);

  // Obtener TODOS los hábitos del usuario (activos y archivados)
  // El filtrado entre activos/archivados se hace en el frontend
  const rows = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, me.id));

  const response: ApiResponse<Habit[]> = {
    success: true,
    data: rows as Habit[],
  };

  return Response.json(response);
}

/**
 * POST /api/habits - Crear un nuevo hábito
 */
export async function POST(req: Request) {
  // Obtener userId de la sesión autenticada de Clerk
  const { userId } = await auth();
  if (!userId) {
    const response: ApiResponse = {
      success: false,
      error: "Unauthorized",
    };
    return Response.json(response, { status: 401 });
  }

  // Obtener el usuario interno de la base de datos
  const me = await getOrCreateInternalUser(userId);

  // Parsear y validar el body de la petición
  const body = await req.json();
  const parsed = Body.safeParse(body);

  // Si la validación de Zod falla, retornar error 400 con detalles
  if (!parsed.success) {
    const response: ApiResponse = {
      success: false,
      error: "Invalid input",
    };
    return Response.json(response, { status: 400 });
  }

  // Verificar si ya existe un hábito activo con el mismo título (case-insensitive)
  const trimmedTitle = parsed.data.title.trim();
  const existing = await db.query.habits.findFirst({
    where: and(
      eq(habits.userId, me.id),
      eq(habits.isArchived, false),
      sql`LOWER(${habits.title}) = LOWER(${trimmedTitle})`
    ),
  });

  // Si ya existe, retornar error 409 Conflict
  if (existing) {
    const response: ApiResponse = {
      success: false,
      error: "Ya tienes un hábito activo con ese nombre",
    };
    return Response.json(response, { status: 409 });
  }

  try {
    // Insertar el nuevo hábito en la tabla habits
    const [created] = await db
      .insert(habits)
      .values({
        userId: me.id,
        title: trimmedTitle,
        description: parsed.data.description?.trim(),
        icon: parsed.data.icon,
        color: parsed.data.color,
        cadence: parsed.data.cadence,
        targetPerDay: parsed.data.targetPerDay,
        allowMultiplePerDay: parsed.data.allowMultiplePerDay,
        reminder: parsed.data.reminder,
        reminderTimeLocal: parsed.data.reminderTimeLocal,
        reminderDays: parsed.data.reminderDays,
      })
      .returning();

    // Retornar el hábito creado
    const response: ApiResponse<Habit> = {
      success: true,
      data: created as Habit,
    };
    return Response.json(response);
  } catch (error: unknown) {
    // Otros errores
    console.error("Error creating habit:", error);
    const response: ApiResponse = {
      success: false,
      error: "Error al crear el hábito",
    };
    return Response.json(response, { status: 500 });
  }
}
