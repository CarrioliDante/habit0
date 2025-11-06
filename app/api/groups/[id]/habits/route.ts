import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { groups, habitGroups, habits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, AddHabitToGroupRequest, Habit } from "@/types";

/**
 * GET /api/groups/[id]/habits
 * Obtiene todos los hábitos de un grupo
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
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid group ID" },
        { status: 400 }
      );
    }

    // Verificar que el grupo existe y pertenece al usuario
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)));

    if (!group) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Obtener todos los hábitos del grupo
    const habitsInGroup = await db
      .select({
        id: habits.id,
        userId: habits.userId,
        title: habits.title,
        description: habits.description,
        cadence: habits.cadence,
        targetPerDay: habits.targetPerDay,
        allowMultiplePerDay: habits.allowMultiplePerDay,
        icon: habits.icon,
        color: habits.color,
        isArchived: habits.isArchived,
        createdAt: habits.createdAt,
      })
      .from(habitGroups)
      .innerJoin(habits, eq(habitGroups.habitId, habits.id))
      .where(eq(habitGroups.groupId, groupId));

    return NextResponse.json<ApiResponse<Habit[]>>({
      success: true,
      data: habitsInGroup as Habit[],
    });
  } catch (error) {
    console.error("GET /api/groups/[id]/habits error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[id]/habits
 * Agrega un hábito a un grupo
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
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid group ID" },
        { status: 400 }
      );
    }

    const body: AddHabitToGroupRequest = await request.json();

    if (!body.habitId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "habitId is required" },
        { status: 400 }
      );
    }

    // Verificar que el grupo existe y pertenece al usuario
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)));

    if (!group) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Group not found" },
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

    // Agregar hábito al grupo (unique constraint evita duplicados)
    const [relation] = await db
      .insert(habitGroups)
      .values({
        groupId,
        habitId: body.habitId,
      })
      .returning();

    return NextResponse.json<ApiResponse<typeof relation>>(
      { success: true, data: relation },
      { status: 201 }
    );
  } catch (error) {
    // Manejar error de unique constraint
    if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Habit already in this group" },
        { status: 409 }
      );
    }

    console.error("POST /api/groups/[id]/habits error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]/habits
 * Elimina un hábito de un grupo
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
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid group ID" },
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

    // Verificar que el grupo pertenece al usuario
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)));

    if (!group) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Eliminar relación
    await db
      .delete(habitGroups)
      .where(
        and(eq(habitGroups.groupId, groupId), eq(habitGroups.habitId, habitId))
      );

    return NextResponse.json<ApiResponse<{ groupId: number; habitId: number }>>({
      success: true,
      data: { groupId, habitId },
    });
  } catch (error) {
    console.error("DELETE /api/groups/[id]/habits error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
