/**
 * Cola de sincronización para operaciones de grupos (offline-first)
 */

import type { Group } from "@/types";

const GROUPS_SYNC_QUEUE_KEY = "habit0_groups_sync_queue";

export type GroupOperation =
  | { type: "create"; data: Omit<Group, "id" | "userId" | "createdAt"> & { tempId: string } }
  | { type: "update"; groupId: number; data: Partial<Group> }
  | { type: "delete"; groupId: number }
  | { type: "addHabit"; groupId: number; habitId: number }
  | { type: "removeHabit"; groupId: number; habitId: number };

interface QueuedOperation {
  id: string;
  operation: GroupOperation;
  timestamp: number;
  retries: number;
}

export function getGroupsSyncQueue(): QueuedOperation[] {
  if (typeof window === "undefined") return [];

  try {
    const queue = localStorage.getItem(GROUPS_SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("Error reading groups sync queue:", error);
    return [];
  }
}

export function addToGroupsSyncQueue(operation: GroupOperation): string {
  const queue = getGroupsSyncQueue();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  queue.push({
    id,
    operation,
    timestamp: Date.now(),
    retries: 0,
  });

  try {
    localStorage.setItem(GROUPS_SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error adding to groups sync queue:", error);
  }

  return id;
}

export function removeFromGroupsSyncQueue(id: string): void {
  const queue = getGroupsSyncQueue();
  const filtered = queue.filter(item => item.id !== id);

  try {
    localStorage.setItem(GROUPS_SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from groups sync queue:", error);
  }
}

export function incrementRetries(id: string): void {
  const queue = getGroupsSyncQueue();
  const item = queue.find(item => item.id === id);

  if (item) {
    item.retries += 1;

    try {
      localStorage.setItem(GROUPS_SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Error incrementing retries:", error);
    }
  }
}

export function clearGroupsSyncQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GROUPS_SYNC_QUEUE_KEY);
}

// Procesar la cola de sincronización
export async function processGroupsSyncQueue(): Promise<void> {
  const queue = getGroupsSyncQueue();

  for (const item of queue) {
    if (item.retries >= 3) {
      // Silenciosamente eliminar operaciones que fallaron muchas veces
      // (probablemente IDs temporales que ya no existen)
      removeFromGroupsSyncQueue(item.id);
      continue;
    }

    try {
      await executeGroupOperation(item.operation);
      removeFromGroupsSyncQueue(item.id);
    } catch (error) {
      // Solo loguear en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error processing group operation (will retry):", error);
      }
      incrementRetries(item.id);
    }
  }
}

async function executeGroupOperation(operation: GroupOperation): Promise<void> {
  switch (operation.type) {
    case "create": {
      const { tempId: _tempId, ...data } = operation.data;
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create group");
      break;
    }

    case "update": {
      // No intentar actualizar grupos con IDs temporales (negativos)
      if (operation.groupId < 0) {
        throw new Error("Cannot update group with temporary ID");
      }

      const response = await fetch(`/api/groups/${operation.groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation.data),
      });

      if (!response.ok) throw new Error("Failed to update group");
      break;
    }

    case "delete": {
      // No intentar eliminar grupos con IDs temporales (negativos)
      if (operation.groupId < 0) {
        throw new Error("Cannot delete group with temporary ID");
      }

      const response = await fetch(`/api/groups/${operation.groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");
      break;
    }

    case "addHabit": {
      // No intentar operar en grupos con IDs temporales (negativos)
      if (operation.groupId < 0) {
        throw new Error("Cannot add habit to group with temporary ID");
      }

      const response = await fetch(`/api/groups/${operation.groupId}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: operation.habitId }),
      });

      if (!response.ok) throw new Error("Failed to add habit to group");
      break;
    }

    case "removeHabit": {
      // No intentar operar en grupos con IDs temporales (negativos)
      if (operation.groupId < 0) {
        throw new Error("Cannot remove habit from group with temporary ID");
      }

      const response = await fetch(`/api/groups/${operation.groupId}/habits`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: operation.habitId }),
      });

      if (!response.ok) throw new Error("Failed to remove habit from group");
      break;
    }
  }
}
