import type { ISODate } from "@/types";

/**
 * Helper unificado para crear o actualizar check-ins
 * Maneja tanto incrementos como resets de forma consistente
 */
export async function createOrUpdateCheckin(params: {
  habitId: number;
  date: ISODate;
  count: number;
}): Promise<{ id?: number; count: number; success: boolean }> {
  const { habitId, date, count } = params;

  try {
    // Si count es 0, usar PUT para eliminar/resetear
    if (count === 0) {
      const response = await fetch("/api/checkins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, updates: [{ date, count: 0 }] }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, count: 0, ...result };
    }

    // Si count > 0, usar POST para crear/incrementar
    const response = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, date }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { success: true, ...result };
  } catch (error) {
    console.error("Error in createOrUpdateCheckin:", error);
    throw error;
  }
}

/**
 * Batch update para múltiples check-ins (usado en calendar)
 */
export async function batchUpdateCheckins(params: {
  habitId: number;
  updates: Array<{ date: ISODate; count: number }>;
}): Promise<{ success: boolean; count: number }> {
  const { habitId, updates } = params;

  try {
    const response = await fetch("/api/checkins", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, updates }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error in batchUpdateCheckins:", error);
    throw error;
  }
}
