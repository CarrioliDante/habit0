/**
 * Cola de sincronización para operaciones de rutinas (offline-first)
 */

import type { Routine } from "@/types";

const ROUTINES_SYNC_QUEUE_KEY = "habit0_routines_sync_queue";

export type RoutineOperation =
  | {
      type: "create";
      data: Omit<Routine, "id" | "userId" | "createdAt"> & { tempId: string; habitIds?: number[] };
    }
  | { type: "update"; routineId: number; data: Partial<Routine> }
  | { type: "delete"; routineId: number }
  | { type: "addHabit"; routineId: number; habitId: number }
  | { type: "removeHabit"; routineId: number; habitId: number };

interface QueuedOperation {
  id: string;
  operation: RoutineOperation;
  timestamp: number;
  retries: number;
}

export function getRoutinesSyncQueue(): QueuedOperation[] {
  if (typeof window === "undefined") return [];

  try {
    const queue = localStorage.getItem(ROUTINES_SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("Error reading routines sync queue:", error);
    return [];
  }
}

export function addToRoutinesSyncQueue(operation: RoutineOperation): string {
  const queue = getRoutinesSyncQueue();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  queue.push({
    id,
    operation,
    timestamp: Date.now(),
    retries: 0,
  });

  try {
    localStorage.setItem(ROUTINES_SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error adding to routines sync queue:", error);
  }

  return id;
}

export function removeFromRoutinesSyncQueue(id: string): void {
  const queue = getRoutinesSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);

  try {
    localStorage.setItem(ROUTINES_SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from routines sync queue:", error);
  }
}

export function incrementRetries(id: string): void {
  const queue = getRoutinesSyncQueue();
  const item = queue.find((item) => item.id === id);

  if (item) {
    item.retries += 1;

    try {
      localStorage.setItem(ROUTINES_SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Error incrementing retries:", error);
    }
  }
}

export function clearRoutinesSyncQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROUTINES_SYNC_QUEUE_KEY);
}

// Procesar la cola de sincronización
export async function processRoutinesSyncQueue(): Promise<void> {
  const queue = getRoutinesSyncQueue();

  for (const item of queue) {
    if (item.retries >= 3) {
      // Silenciosamente eliminar operaciones que fallaron muchas veces
      // (probablemente IDs temporales que ya no existen)
      removeFromRoutinesSyncQueue(item.id);
      continue;
    }

    try {
      await executeRoutineOperation(item.operation);
      removeFromRoutinesSyncQueue(item.id);
    } catch (error) {
      // Solo loguear en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error processing routine operation (will retry):", error);
      }
      incrementRetries(item.id);
    }
  }
}

async function executeRoutineOperation(operation: RoutineOperation): Promise<void> {
  switch (operation.type) {
    case "create": {
      const { tempId: _tempId, habitIds, ...data } = operation.data;

      // Crear la rutina
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create routine");

      // Si hay hábitos, asignarlos
      if (habitIds && habitIds.length > 0) {
        const json = await response.json();
        const routineId = json.data.id;

        await Promise.all(
          habitIds.map((habitId) =>
            fetch(`/api/routines/${routineId}/habits`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ habitId }),
            })
          )
        );
      }
      break;
    }

    case "update": {
      // No intentar actualizar rutinas con IDs temporales (negativos)
      if (operation.routineId < 0) {
        throw new Error("Cannot update routine with temporary ID");
      }

      const response = await fetch(`/api/routines/${operation.routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation.data),
      });

      if (!response.ok) throw new Error("Failed to update routine");
      break;
    }

    case "delete": {
      // No intentar eliminar rutinas con IDs temporales (negativos)
      if (operation.routineId < 0) {
        throw new Error("Cannot delete routine with temporary ID");
      }

      const response = await fetch(`/api/routines/${operation.routineId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete routine");
      break;
    }

    case "addHabit": {
      // No intentar operar en rutinas con IDs temporales (negativos)
      if (operation.routineId < 0) {
        throw new Error("Cannot add habit to routine with temporary ID");
      }

      const response = await fetch(`/api/routines/${operation.routineId}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: operation.habitId }),
      });

      if (!response.ok) throw new Error("Failed to add habit to routine");
      break;
    }

    case "removeHabit": {
      // No intentar operar en rutinas con IDs temporales (negativos)
      if (operation.routineId < 0) {
        throw new Error("Cannot remove habit from routine with temporary ID");
      }

      const response = await fetch(`/api/routines/${operation.routineId}/habits`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: operation.habitId }),
      });

      if (!response.ok) throw new Error("Failed to remove habit from routine");
      break;
    }
  }
}
