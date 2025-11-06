import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { habits, habitGroups, groups } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, Group } from "@/types";

/**
 * GET /api/habits/[id]/groups
 * Obtiene todos los grupos a los que pertenece un hábito
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
    const habitId = parseInt(id, 10);

    if (isNaN(habitId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid habit ID" },
        { status: 400 }
      );
    }

    // Verificar que el hábito existe y pertenece al usuario
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, me.id)));

    if (!habit) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Habit not found" },
        { status: 404 }
      );
    }

    // Obtener todos los grupos del hábito
    const habitGroupsData = await db
      .select({
        id: groups.id,
        userId: groups.userId,
        name: groups.name,
        color: groups.color,
        icon: groups.icon,
        createdAt: groups.createdAt,
      })
      .from(habitGroups)
      .innerJoin(groups, eq(habitGroups.groupId, groups.id))
      .where(eq(habitGroups.habitId, habitId));

    return NextResponse.json<ApiResponse<Group[]>>({
      success: true,
      data: habitGroupsData.map(g => ({
        ...g,
        color: g.color || "#22C55E",
        icon: g.icon || "Tag",
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/habits/[id]/groups error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
