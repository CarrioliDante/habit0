import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { habits } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getOrCreateInternalUser } from "@/lib/user";

/**
 * POST /api/habits/[id]/restore - Restaura un hábito archivado
 */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación del usuario
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Obtener información del usuario actual desde Clerk
  const u = await currentUser();
  // Obtener o crear el usuario en la base de datos interna
  const me = await getOrCreateInternalUser(userId, u?.emailAddresses?.[0]?.emailAddress);

  // Await params en Next.js 15+
  const { id } = await params;

  // Convertir el ID del hábito de string a número
  const habitId = Number(id);

  // Actualizar el hábito para marcarlo como no archivado
  await db.update(habits)
    .set({ isArchived: false })
    .where(and(
      eq(habits.id, habitId), // El hábito debe tener el ID solicitado
      eq(habits.userId, me.id) // Y debe pertenecer al usuario actual
    ));

  // Retornar respuesta exitosa
  return NextResponse.json({ ok: true, id: habitId });
}
