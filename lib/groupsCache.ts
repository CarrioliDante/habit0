/**
 * Sistema de caché local para grupos (offline-first)
 */

import type { Group } from "@/types";

const GROUPS_CACHE_KEY = "habit0_groups_cache";
const HABIT_GROUPS_CACHE_KEY = "habit0_habit_groups_cache";

// Grupos principales
export function getCachedGroups(): Group[] | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(GROUPS_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Cache válido por 1 hora
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - timestamp > ONE_HOUR) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading groups cache:", error);
    return null;
  }
}

export function setCachedGroups(groups: Group[]): void {
  if (typeof window === "undefined") return;

  try {
    const cacheData = {
      data: groups,
      timestamp: Date.now(),
    };
    localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting groups cache:", error);
  }
}

export function invalidateGroupsCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GROUPS_CACHE_KEY);
}

// Grupos de hábitos (relaciones habit -> groups)
export function getCachedHabitGroups(): Record<number, Group[]> | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(HABIT_GROUPS_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Cache válido por 30 minutos
    const THIRTY_MINUTES = 30 * 60 * 1000;
    if (Date.now() - timestamp > THIRTY_MINUTES) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading habit groups cache:", error);
    return null;
  }
}

export function setCachedHabitGroups(habitGroups: Record<number, Group[]>): void {
  if (typeof window === "undefined") return;

  try {
    const cacheData = {
      data: habitGroups,
      timestamp: Date.now(),
    };
    localStorage.setItem(HABIT_GROUPS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting habit groups cache:", error);
  }
}

export function invalidateHabitGroupsCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HABIT_GROUPS_CACHE_KEY);
}

// Actualizar grupos de un hábito específico en el caché
export function updateHabitGroupsInCache(habitId: number, groups: Group[]): void {
  const cached = getCachedHabitGroups();
  if (cached) {
    cached[habitId] = groups;
    setCachedHabitGroups(cached);
  }
}

// Agregar un grupo nuevo al caché
export function addGroupToCache(group: Group): void {
  const cached = getCachedGroups();
  if (cached) {
    // Verificar si el grupo ya existe (por ID)
    const exists = cached.some(g => g.id === group.id);
    if (!exists) {
      cached.push(group);
      setCachedGroups(cached);
    }
  } else {
    // Si no hay caché, crear uno nuevo con este grupo
    setCachedGroups([group]);
  }
}

// Actualizar un grupo en el caché
export function updateGroupInCache(groupId: number, updates: Partial<Group>): void {
  const cached = getCachedGroups();
  if (cached) {
    const index = cached.findIndex(g => g.id === groupId);
    if (index !== -1) {
      cached[index] = { ...cached[index], ...updates };
      setCachedGroups(cached);
    }
  }
}

// Eliminar un grupo del caché
export function removeGroupFromCache(groupId: number): void {
  const cached = getCachedGroups();
  if (cached) {
    const filtered = cached.filter(g => g.id !== groupId);
    setCachedGroups(filtered);
  }
}
