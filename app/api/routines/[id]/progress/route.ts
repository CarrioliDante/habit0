import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { routines, routineHabits, habits, checkins } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, RoutineProgress } from "@/types";

/**
 * GET /api/routines/[id]/progress?date=2024-01-15
 * Obtiene el progreso de una rutina en una fecha específica
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

    // Obtener fecha del query param o usar hoy
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

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

    // Obtener todos los hábitos de la rutina
    const routineHabitsList = await db
      .select({
        habitId: routineHabits.habitId,
        order: routineHabits.order,
      })
      .from(routineHabits)
      .where(eq(routineHabits.routineId, routineId))
      .orderBy(routineHabits.order);

    if (routineHabitsList.length === 0) {
      return NextResponse.json<ApiResponse<RoutineProgress>>({
        success: true,
        data: {
          routineId,
          date,
          totalHabits: 0,
          completedHabits: 0,
          isComplete: true, // Rutina vacía se considera completa
          habits: [],
        },
      });
    }

    const habitIds = routineHabitsList.map((rh) => rh.habitId);

    // Obtener info de los hábitos
    const habitsData = await db
      .select()
      .from(habits)
      .where(inArray(habits.id, habitIds));

    // Obtener check-ins del día
    const checkinsData = await db
      .select()
      .from(checkins)
      .where(
        and(
          eq(checkins.userId, me.id),
          eq(checkins.date, date),
          inArray(checkins.habitId, habitIds)
        )
      );

    // Crear mapa de check-ins por habitId
    const checkinsMap = new Map(
      checkinsData.map((c) => [c.habitId, c.count || 0])
    );

    // Crear progreso para cada hábito
    const habitsProgress = routineHabitsList.map((rh) => {
      const habit = habitsData.find((h) => h.id === rh.habitId);
      const count = checkinsMap.get(rh.habitId) || 0;
      const isChecked = count > 0;

      return {
        habitId: rh.habitId,
        title: habit?.title || "Unknown",
        isChecked,
        count,
      };
    });

    const completedHabits = habitsProgress.filter((h) => h.isChecked).length;
    const isComplete = completedHabits === habitsProgress.length;

    const progress: RoutineProgress = {
      routineId,
      date,
      totalHabits: habitsProgress.length,
      completedHabits,
      isComplete,
      habits: habitsProgress,
    };

    return NextResponse.json<ApiResponse<RoutineProgress>>({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("GET /api/routines/[id]/progress error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
