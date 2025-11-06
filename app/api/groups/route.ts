import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, CreateGroupRequest, Group } from "@/types";

/**
 * GET /api/groups
 * Lista todos los grupos del usuario autenticado
 */
export async function GET() {
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

    // Obtener todos los grupos del usuario
    const userGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.userId, me.id));

    return NextResponse.json<ApiResponse<Group[]>>({
      success: true,
      data: userGroups.map((g) => ({
        id: g.id,
        userId: g.userId,
        name: g.name,
        color: g.color || undefined,
        icon: g.icon || undefined,
        createdAt: g.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups
 * Crea un nuevo grupo
 */
export async function POST(request: NextRequest) {
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

    const body: CreateGroupRequest = await request.json();

    if (!body.name || body.name.trim() === "") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El nombre del grupo es obligatorio" },
        { status: 400 }
      );
    }

    const [newGroup] = await db
      .insert(groups)
      .values({
        userId: me.id,
        name: body.name.trim(),
        color: body.color || "#3b82f6",
        icon: body.icon || "Tag",
      })
      .returning();

    return NextResponse.json<ApiResponse<Group>>(
      {
        success: true,
        data: {
          id: newGroup.id,
          userId: newGroup.userId,
          name: newGroup.name,
          color: newGroup.color || undefined,
          icon: newGroup.icon || undefined,
          createdAt: newGroup.createdAt?.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

