/**
 * Sistema de caché local para rutinas (offline-first)
 */

import type { Routine, RoutineProgress } from "@/types";

const ROUTINES_CACHE_KEY = "habit0_routines_cache";
const ROUTINE_PROGRESS_CACHE_KEY = "habit0_routine_progress_cache";

// Rutinas principales
export function getCachedRoutines(): Routine[] | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(ROUTINES_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Cache válido por 1 hora
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - timestamp > ONE_HOUR) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading routines cache:", error);
    return null;
  }
}

export function setCachedRoutines(routines: Routine[]): void {
  if (typeof window === "undefined") return;

  try {
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

    const cacheData = {
      data: deduplicated,
      timestamp: Date.now(),
    };
    localStorage.setItem(ROUTINES_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting routines cache:", error);
  }
}

export function invalidateRoutinesCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROUTINES_CACHE_KEY);
}

// Progreso de rutinas
export function getCachedRoutineProgress(): Record<string, RoutineProgress> | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(ROUTINE_PROGRESS_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Cache válido por 10 minutos (progreso cambia frecuentemente)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - timestamp > TEN_MINUTES) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading routine progress cache:", error);
    return null;
  }
}

export function setCachedRoutineProgress(progress: Record<string, RoutineProgress>): void {
  if (typeof window === "undefined") return;

  try {
    const cacheData = {
      data: progress,
      timestamp: Date.now(),
    };
    localStorage.setItem(ROUTINE_PROGRESS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting routine progress cache:", error);
  }
}

export function invalidateRoutineProgressCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROUTINE_PROGRESS_CACHE_KEY);
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
