import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getOrCreateInternalUser(clerkId: string, email?: string) {
  // Buscar si ya existe un usuario con este clerkId en la base de datos
  const existing = await db.query.users.findFirst({
    // Condición: buscar donde la columna clerkId coincida con el parámetro
    where: eq(users.clerkId, clerkId),
  });

  // Si el usuario existe, devolverlo directamente
  if (existing) return existing;

  // Si no existe, insertar un nuevo usuario en la tabla users
  const [created] = await db.insert(users).values({
    clerkId, // ID de Clerk
    email: email ?? "", // Email proporcionado o string vacío si no hay
  }).returning(); // Devolver el registro creado

  // Retornar el usuario recién creado
  return created;
}
