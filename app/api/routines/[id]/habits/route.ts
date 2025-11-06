import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { routines, routineHabits, habits } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, AddHabitToRoutineRequest, Habit } from "@/types";

/**
 * GET /api/routines/[id]/habits
 * Obtiene todos los hábitos de una rutina (ordenados)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const u = await currentUser();
    const me = await getOrCreateInternalUser(
      clerkId,
      u?.emailAddresses?.[0]?.emailAddress
    );

    const { id } = await params;
    const routineId = parseInt(id, 10);

    if (isNaN(routineId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid routine ID" },
        { status: 400 }
      );
    }

    // Verificar que la rutina existe y pertenece al usuario
    const [routine] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)));

    if (!routine) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Routine not found" },
        { status: 404 }
      );
    }

    // Obtener IDs de hábitos en la rutina
    const routineHabitsList = await db
      .select({
        habitId: routineHabits.habitId,
        order: routineHabits.order,
      })
      .from(routineHabits)
      .where(eq(routineHabits.routineId, routineId))
      .orderBy(routineHabits.order);

    if (routineHabitsList.length === 0) {
      return NextResponse.json<ApiResponse<Habit[]>>({
        success: true,
        data: [],
      });
    }

    const habitIds = routineHabitsList.map((rh) => rh.habitId);

    // Obtener datos completos de los hábitos
    const habitsData = await db
      .select()
      .from(habits)
      .where(inArray(habits.id, habitIds));

    // Ordenar según el orden en routine_habits
    const orderedHabits = routineHabitsList
      .map((rh) => habitsData.find((h) => h.id === rh.habitId))
      .filter((h): h is typeof habitsData[0] => h !== undefined);

    return NextResponse.json<ApiResponse<Habit[]>>({
      success: true,
      data: orderedHabits as Habit[],
    });
  } catch (error) {
    console.error("GET /api/routines/[id]/habits error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/routines/[id]/habits
 * Agrega un hábito a una rutina
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const u = await currentUser();
    const me = await getOrCreateInternalUser(
      clerkId,
      u?.emailAddresses?.[0]?.emailAddress
    );

    const { id } = await params;
    const routineId = parseInt(id, 10);

    if (isNaN(routineId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid routine ID" },
        { status: 400 }
      );
    }

    const body: AddHabitToRoutineRequest = await request.json();

    if (!body.habitId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "habitId is required" },
        { status: 400 }
      );
    }

    // Verificar que la rutina existe y pertenece al usuario
    const [routine] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)));

    if (!routine) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Routine not found" },
        { status: 404 }
      );
    }

    // Verificar que el hábito existe y pertenece al usuario
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, body.habitId), eq(habits.userId, me.id)));

    if (!habit) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Habit not found" },
        { status: 404 }
      );
    }

    // Agregar hábito a la rutina (unique constraint evita duplicados)
    const [relation] = await db
      .insert(routineHabits)
      .values({
        routineId,
        habitId: body.habitId,
        order: body.order || 0,
      })
      .returning();

    return NextResponse.json<ApiResponse<typeof relation>>(
      { success: true, data: relation },
      { status: 201 }
    );
  } catch (error: any) {
    // Manejar error de unique constraint
    if (error?.code === "23505") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Habit already in this routine" },
        { status: 409 }
      );
    }

    console.error("POST /api/routines/[id]/habits error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/routines/[id]/habits
 * Elimina un hábito de una rutina
 * Body: { habitId: number }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const u = await currentUser();
    const me = await getOrCreateInternalUser(
      clerkId,
      u?.emailAddresses?.[0]?.emailAddress
    );

    const { id } = await params;
    const routineId = parseInt(id, 10);

    if (isNaN(routineId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid routine ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const habitId = body.habitId;

    if (!habitId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "habitId is required" },
        { status: 400 }
      );
    }

    // Verificar que la rutina pertenece al usuario
    const [routine] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)));

    if (!routine) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Routine not found" },
        { status: 404 }
      );
    }

    // Eliminar relación
    await db
      .delete(routineHabits)
      .where(
        and(
          eq(routineHabits.routineId, routineId),
          eq(routineHabits.habitId, habitId)
        )
      );

    return NextResponse.json<ApiResponse<{ routineId: number; habitId: number }>>(
      {
        success: true,
        data: { routineId, habitId },
      }
    );
  } catch (error) {
    console.error("DELETE /api/routines/[id]/habits error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
