/**
 * Sistema de caché local para rutinas (offline-first)
 * Delegates to localCache.ts generic helpers.
 */

import { setCache, getCache, invalidateCache } from "@/lib/localCache";
import type { Routine, RoutineProgress } from "@/types";

const ROUTINES_CACHE_KEY = "habitar_routines_cache";
const ROUTINE_PROGRESS_CACHE_KEY = "habitar_routine_progress_cache";

// Cache TTLs
const TTL_ROUTINES = 60 * 60 * 1000; // 1 hora
const TTL_PROGRESS = 10 * 60 * 1000; // 10 minutos

// Rutinas principales
export function getCachedRoutines(): Routine[] | null {
  return getCache<Routine[]>(ROUTINES_CACHE_KEY, TTL_ROUTINES);
}

export function setCachedRoutines(routines: Routine[]): void {
  // Filtrar duplicados por ID (solo IDs positivos, sin temporales)
  const uniqueRoutines = routines.filter(r => r.id > 0);
  const seen = new Set<number>();
  const deduplicated = uniqueRoutines.filter(r => {
    if (seen.has(r.id)) {
      return false;
    }
    seen.add(r.id);
    return true;
  });

  setCache(ROUTINES_CACHE_KEY, deduplicated);
}

export function invalidateRoutinesCache(): void {
  invalidateCache(ROUTINES_CACHE_KEY);
}

// Progreso de rutinas
export function getCachedRoutineProgress(): Record<string, RoutineProgress> | null {
  return getCache<Record<string, RoutineProgress>>(ROUTINE_PROGRESS_CACHE_KEY, TTL_PROGRESS);
}

export function setCachedRoutineProgress(progress: Record<string, RoutineProgress>): void {
  setCache(ROUTINE_PROGRESS_CACHE_KEY, progress);
}

export function invalidateRoutineProgressCache(): void {
  invalidateCache(ROUTINE_PROGRESS_CACHE_KEY);
}

// Agregar una rutina al caché
export function addRoutineToCache(routine: Routine): void {
  const cached = getCachedRoutines();
  if (cached) {
    cached.push(routine);
    setCachedRoutines(cached);
  }
}

// Actualizar una rutina en el caché
export function updateRoutineInCache(routineId: number, updates: Partial<Routine>): void {
  const cached = getCachedRoutines();
  if (cached) {
    const index = cached.findIndex((r) => r.id === routineId);
    if (index !== -1) {
      cached[index] = { ...cached[index], ...updates };
      setCachedRoutines(cached);
    }
  }
}

// Eliminar una rutina del caché
export function removeRoutineFromCache(routineId: number): void {
  const cached = getCachedRoutines();
  if (cached) {
    const filtered = cached.filter((r) => r.id !== routineId);
    setCachedRoutines(filtered);
  }
}

// Actualizar progreso de una rutina en caché
export function updateRoutineProgressInCache(
  routineId: number,
  date: string,
  progress: RoutineProgress
): void {
  const cached = getCachedRoutineProgress();
  const key = `${routineId}-${date}`;

  if (cached) {
    cached[key] = progress;
    setCachedRoutineProgress(cached);
  } else {
    setCachedRoutineProgress({ [key]: progress });
  }
}
