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

// ============= HELPERS ESPECÍFICOS PARA HABIT0 =============

const CACHE_KEY_HABITS = "cache:habits";

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

// ============= LOCAL CHECKINS (PERSISTENT, SOURCE OF TRUTH) =============

const LOCAL_CHECKINS_KEY = "local:checkins"; // Persistente, sin TTL

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
