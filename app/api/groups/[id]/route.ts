import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { groups } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, UpdateGroupRequest, Group } from "@/types";

/**
 * GET /api/groups/[id]
 * Obtiene un grupo específico
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

    return NextResponse.json<ApiResponse<Group>>({
      success: true,
      data: {
        id: group.id,
        userId: group.userId,
        name: group.name,
        color: group.color || undefined,
        icon: group.icon || undefined,
        createdAt: group.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/groups/[id] error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/[id]
 * Actualiza un grupo
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
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid group ID" },
        { status: 400 }
      );
    }

    const body: UpdateGroupRequest = await request.json();

    // Verificar que el grupo existe y pertenece al usuario
    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)));

    if (!existingGroup) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Construir objeto de actualización solo con campos presentes
    const updates: Partial<typeof groups.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const [updatedGroup] = await db
      .update(groups)
      .set(updates)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)))
      .returning();

    return NextResponse.json<ApiResponse<Group>>({
      success: true,
      data: {
        id: updatedGroup.id,
        userId: updatedGroup.userId,
        name: updatedGroup.name,
        color: updatedGroup.color || undefined,
        icon: updatedGroup.icon || undefined,
        createdAt: updatedGroup.createdAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/groups/[id] error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]
 * Elimina un grupo (también elimina las relaciones en habit_groups por cascade)
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

    // Verificar que el grupo existe y pertenece al usuario
    const [existingGroup] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)));

    if (!existingGroup) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Eliminar el grupo (cascade eliminará las relaciones en habit_groups)
    await db
      .delete(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, me.id)));

    return NextResponse.json<ApiResponse<{ id: number }>>({
      success: true,
      data: { id: groupId },
    });
  } catch (error) {
    console.error("DELETE /api/groups/[id] error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
