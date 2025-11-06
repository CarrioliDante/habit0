import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { routines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, UpdateRoutineRequest, Routine } from "@/types";

/**
 * GET /api/routines/[id]
 * Obtiene una rutina específica
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

    return NextResponse.json<ApiResponse<Routine>>({
      success: true,
      data: {
        id: routine.id,
        userId: routine.userId,
        name: routine.name,
        description: routine.description || undefined,
        color: routine.color || undefined,
        icon: routine.icon || undefined,
        daysOfWeek: JSON.parse(routine.daysOfWeek || "[]"),
        order: routine.order || 0,
        isArchived: routine.isArchived || false,
        createdAt: routine.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/routines/[id] error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/routines/[id]
 * Actualiza una rutina
 */
export async function PATCH(
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

    const body: UpdateRoutineRequest = await request.json();

    // Verificar que la rutina existe y pertenece al usuario
    const [existingRoutine] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)));

    if (!existingRoutine) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Routine not found" },
        { status: 404 }
      );
    }

    // Construir objeto de actualización solo con campos presentes
    const updates: Partial<typeof routines.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.daysOfWeek !== undefined)
      updates.daysOfWeek = JSON.stringify(body.daysOfWeek);
    if (body.order !== undefined) updates.order = body.order;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const [updatedRoutine] = await db
      .update(routines)
      .set(updates)
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)))
      .returning();

    return NextResponse.json<ApiResponse<Routine>>({
      success: true,
      data: {
        id: updatedRoutine.id,
        userId: updatedRoutine.userId,
        name: updatedRoutine.name,
        description: updatedRoutine.description || undefined,
        color: updatedRoutine.color || undefined,
        icon: updatedRoutine.icon || undefined,
        daysOfWeek: JSON.parse(updatedRoutine.daysOfWeek || "[]"),
        order: updatedRoutine.order || 0,
        isArchived: updatedRoutine.isArchived || false,
        createdAt: updatedRoutine.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/routines/[id] error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/routines/[id]
 * Archiva una rutina (soft delete)
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

    // Verificar que la rutina existe y pertenece al usuario
    const [existingRoutine] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)));

    if (!existingRoutine) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Routine not found" },
        { status: 404 }
      );
    }

    // Soft delete: marcar como archivado
    await db
      .update(routines)
      .set({ isArchived: true })
      .where(and(eq(routines.id, routineId), eq(routines.userId, me.id)));

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: routineId },
    });
  } catch (error) {
    console.error("DELETE /api/routines/[id] error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
