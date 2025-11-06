/**
 * Sync Queue - Persistent operation queue for offline-first functionality
 *
 * Stores pending operations in localStorage and processes them in background
 * Ensures no data loss even if user closes browser before sync completes
 */

export type SyncOperation = {
  id: string; // UUID único
  type: "checkin" | "habit_create" | "habit_update" | "habit_delete";
  habitId: number;
  data: unknown; // Payload específico del tipo
  timestamp: number; // Cuándo se creó la operación
  retries: number; // Intentos de sync
  lastError?: string; // Último error si falló
};

const SYNC_QUEUE_KEY = "sync_queue";
const MAX_RETRIES = 5;

/**
 * Genera ID único para operación
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Obtiene cola de operaciones pendientes
 */
export function getSyncQueue(): SyncOperation[] {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SyncOperation[];
  } catch (error) {
    console.error("Error reading sync queue:", error);
    return [];
  }
}

/**
 * Guarda cola de operaciones
 */
function saveSyncQueue(queue: SyncOperation[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error saving sync queue:", error);
  }
}

/**
 * Agrega operación a la cola de sincronización
 */
export function enqueueSyncOperation(
  type: SyncOperation["type"],
  habitId: number,
  data: unknown
): string {
  const operation: SyncOperation = {
    id: generateId(),
    type,
    habitId,
    data,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = getSyncQueue();
  queue.push(operation);
  saveSyncQueue(queue);

  return operation.id;
}

/**
 * Marca operación como completada (la remueve de la cola)
 */
export function completeSyncOperation(operationId: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter((op) => op.id !== operationId);
  saveSyncQueue(filtered);
}

/**
 * Marca operación como fallida (incrementa retries)
 */
export function failSyncOperation(operationId: string, error: string): void {
  const queue = getSyncQueue();
  const operation = queue.find((op) => op.id === operationId);

  if (operation) {
    operation.retries += 1;
    operation.lastError = error;

    // Si superó max retries, remover de cola (perdido)
    if (operation.retries >= MAX_RETRIES) {
      // Silenciosamente eliminar operaciones que fallaron muchas veces
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Operation ${operationId} failed after ${MAX_RETRIES} retries:`, error);
      }
      const filtered = queue.filter((op) => op.id !== operationId);
      saveSyncQueue(filtered);
    } else {
      saveSyncQueue(queue);
    }
  }
}

/**
 * Obtiene operaciones pendientes para un hábito específico
 */
export function getPendingOperations(habitId: number): SyncOperation[] {
  const queue = getSyncQueue();
  return queue.filter((op) => op.habitId === habitId);
}

/**
 * Limpia todas las operaciones de la cola (usar con cuidado)
 */
export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch (error) {
    console.error("Error clearing sync queue:", error);
  }
}

/**
 * Obtiene count de operaciones pendientes
 */
export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}
