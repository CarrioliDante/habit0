import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { routines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";
import type { ApiResponse, CreateRoutineRequest, Routine } from "@/types";

/**
 * GET /api/routines
 * Lista todas las rutinas del usuario autenticado (no archivadas)
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

    // Obtener rutinas activas (no archivadas)
    const userRoutines = await db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, me.id), eq(routines.isArchived, false)));

    return NextResponse.json<ApiResponse<Routine[]>>({
      success: true,
      data: userRoutines.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        description: r.description || undefined,
        color: r.color || undefined,
        icon: r.icon || undefined,
        daysOfWeek: JSON.parse(r.daysOfWeek || "[]"),
        order: r.order || 0,
        isArchived: r.isArchived || false,
        createdAt: r.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/routines error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/routines
 * Crea una nueva rutina
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

    const body: CreateRoutineRequest = await request.json();

    if (!body.name || body.name.trim() === "") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El nombre de la rutina es obligatorio" },
        { status: 400 }
      );
    }

    const [newRoutine] = await db
      .insert(routines)
      .values({
        userId: me.id,
        name: body.name.trim(),
        description: body.description || null,
        color: body.color || "#8b5cf6",
        icon: body.icon || "ListChecks",
        daysOfWeek: JSON.stringify(body.daysOfWeek || []),
        order: body.order || 0,
      })
      .returning();

    return NextResponse.json<ApiResponse<Routine>>(
      {
        success: true,
        data: {
          id: newRoutine.id,
          userId: newRoutine.userId,
          name: newRoutine.name,
          description: newRoutine.description || undefined,
          color: newRoutine.color || undefined,
          icon: newRoutine.icon || undefined,
          daysOfWeek: JSON.parse(newRoutine.daysOfWeek || "[]"),
          order: newRoutine.order || 0,
          isArchived: newRoutine.isArchived || false,
          createdAt: newRoutine.createdAt?.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/routines error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
