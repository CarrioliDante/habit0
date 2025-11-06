/**
 * Local cache using localStorage with TTL (time-to-live) support
 * Implements stale-while-revalidate pattern for instant UX
 */

import type { Habit } from "@/types";

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  version: string; // Para invalidar cache al cambiar schema
};

const CACHE_VERSION = "v1"; // Incrementar cuando cambie estructura de datos
const TTL_HABITS = 1000 * 60 * 5; // 5 minutos
const TTL_CHECKINS = 1000 * 60 * 2; // 2 minutos (más corto porque cambia frecuentemente)

/**
 * Guarda datos en localStorage con timestamp
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to save to cache:", error);
    // Si falla (ej: QuotaExceededError), limpiar cache viejo
    if (error instanceof Error && error.name === "QuotaExceededError") {
      clearOldCache();
    }
  }
}

/**
 * Recupera datos del cache si no están expirados
 * Retorna null si no existe, está expirado, o versión incorrecta
 */
export function getCache<T>(key: string, ttl: number): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);

    // Validar versión
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    // Validar TTL
    const age = Date.now() - entry.timestamp;
    if (age > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn("Failed to read from cache:", error);
    return null;
  }
}

/**
 * Invalida (elimina) entrada específica del cache
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to invalidate cache:", error);
  }
}

/**
 * Limpia todas las entradas de cache viejas (más de 24h)
 */
export function clearOldCache(): void {
  try {
    const MAX_AGE = 1000 * 60 * 60 * 24; // 24 horas
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Solo procesar claves de cache (por convención empiezan con "cache:")
      if (!key.startsWith("cache:")) continue;

      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const entry: CacheEntry<unknown> = JSON.parse(item);
        const age = Date.now() - entry.timestamp;

        if (age > MAX_AGE || entry.version !== CACHE_VERSION) {
          keysToRemove.push(key);
        }
      } catch {
        // Si no se puede parsear, eliminar
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Failed to clear old cache:", error);
  }
}

// ============= HELPERS ESPECÍFICOS PARA HABIT0 =============

const CACHE_KEY_HABITS = "cache:habits";
const CACHE_KEY_CHECKINS_PREFIX = "cache:checkins:";
const LOCAL_CHECKINS_KEY = "local:checkins"; // Persistente, sin TTL

/**
 * Guarda hábitos en cache
 */
export function cacheHabits(habits: Habit[]): void {
  setCache(CACHE_KEY_HABITS, habits);
}

/**
 * Recupera hábitos del cache (retorna null si expirado o no existe)
 */
export function getCachedHabits(): Habit[] | null {
  return getCache<Habit[]>(CACHE_KEY_HABITS, TTL_HABITS);
}

/**
 * Invalida cache de hábitos (útil al crear/editar/eliminar)
 */
export function invalidateHabitsCache(): void {
  invalidateCache(CACHE_KEY_HABITS);
}

// ============= LOCAL CHECKINS (PERSISTENT, SOURCE OF TRUTH) =============

export type LocalCheckin = {
  habitId: number;
  date: string; // YYYY-MM-DD
  count: number;
  synced: boolean; // Si ya se sincronizó con servidor
  lastModified: number; // timestamp
};

/**
 * Obtiene TODOS los check-ins locales (persistentes)
 */
export function getLocalCheckins(): Record<string, LocalCheckin> {
  try {
    const stored = localStorage.getItem(LOCAL_CHECKINS_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, LocalCheckin>;
  } catch (error) {
    console.warn("Error reading local checkins:", error);
    return {};
  }
}

/**
 * Guarda un check-in localmente (INMEDIATO, source of truth)
 */
export function saveLocalCheckin(
  habitId: number,
  date: string,
  count: number,
  synced = false
): void {
  try {
    const key = `${habitId}:${date}`;
    const checkins = getLocalCheckins();

    checkins[key] = {
      habitId,
      date,
      count,
      synced,
      lastModified: Date.now(),
    };

    localStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(checkins));
  } catch (error) {
    console.error("Error saving local checkin:", error);
  }
}

/**
 * Marca check-in como sincronizado
 */
export function markCheckinAsSynced(habitId: number, date: string): void {
  try {
    const key = `${habitId}:${date}`;
    const checkins = getLocalCheckins();

    if (checkins[key]) {
      checkins[key].synced = true;
      localStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(checkins));
    }
  } catch (error) {
    console.error("Error marking checkin as synced:", error);
  }
}

/**
 * Obtiene check-ins locales de un hábito
 */
export function getLocalCheckinsForHabit(habitId: number): Record<string, number> {
  const allCheckins = getLocalCheckins();
  const result: Record<string, number> = {};

  for (const checkin of Object.values(allCheckins)) {
    if (checkin.habitId === habitId) {
      result[checkin.date] = checkin.count;
    }
  }

  return result;
}

/**
 * Obtiene check-ins NO sincronizados de un hábito
 */
export function getUnsyncedCheckins(habitId?: number): LocalCheckin[] {
  const allCheckins = getLocalCheckins();
  const unsynced: LocalCheckin[] = [];

  for (const checkin of Object.values(allCheckins)) {
    if (!checkin.synced && (habitId === undefined || checkin.habitId === habitId)) {
      unsynced.push(checkin);
    }
  }

  return unsynced;
}

/**
 * Limpia check-ins locales de un hábito eliminado
 */
export function clearLocalCheckinsForHabit(habitId: number): void {
  try {
    const checkins = getLocalCheckins();
    const filtered: Record<string, LocalCheckin> = {};

    for (const [key, checkin] of Object.entries(checkins)) {
      if (checkin.habitId !== habitId) {
        filtered[key] = checkin;
      }
    }

    localStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error clearing local checkins:", error);
  }
}

// ============= LEGACY CACHE (mantener para transición suave) =============

/**
 * Guarda check-ins de un hábito en cache (DEPRECATED - usar saveLocalCheckin)
 * @deprecated Use saveLocalCheckin instead
 */
export function cacheCheckins(
  habitId: number,
  data: Record<string, number>,
  from: string,
  to: string
): void {
  const key = `${CACHE_KEY_CHECKINS_PREFIX}${habitId}`;
  setCache(key, { data, from, to });
}

/**
 * Recupera check-ins de un hábito del cache (DEPRECATED)
 * @deprecated Use getLocalCheckinsForHabit instead
 */
export function getCachedCheckins(
  habitId: number
): { data: Record<string, number>; from: string; to: string } | null {
  const key = `${CACHE_KEY_CHECKINS_PREFIX}${habitId}`;
  return getCache(key, TTL_CHECKINS);
}

/**
 * Invalida cache de check-ins de un hábito específico
 */
export function invalidateCheckinsCache(habitId: number): void {
  const key = `${CACHE_KEY_CHECKINS_PREFIX}${habitId}`;
  invalidateCache(key);
}

/**
 * Invalida todos los check-ins cacheados
 */
export function invalidateAllCheckinsCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_CHECKINS_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Failed to invalidate checkins cache:", error);
  }
}

// Limpiar cache viejo al cargar módulo
if (typeof window !== "undefined") {
  // Solo en cliente
  clearOldCache();
}
