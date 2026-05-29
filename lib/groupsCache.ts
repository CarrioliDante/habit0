/**
 * Sistema de caché local para grupos (offline-first)
 * Delegates to localCache.ts generic helpers.
 */

import { setCache, getCache, invalidateCache } from "@/lib/localCache";
import type { Group } from "@/types";

const GROUPS_CACHE_KEY = "habitar_groups_cache";
const HABIT_GROUPS_CACHE_KEY = "habitar_habit_groups_cache";

// Cache TTL: 1 hour for groups, 30 minutes for habit-groups relations
const TTL_GROUPS = 60 * 60 * 1000;
const TTL_HABIT_GROUPS = 30 * 60 * 1000;

// Grupos principales
export function getCachedGroups(): Group[] | null {
  return getCache<Group[]>(GROUPS_CACHE_KEY, TTL_GROUPS);
}

export function setCachedGroups(groups: Group[]): void {
  setCache(GROUPS_CACHE_KEY, groups);
}

export function invalidateGroupsCache(): void {
  invalidateCache(GROUPS_CACHE_KEY);
}

// Grupos de hábitos (relaciones habit -> groups)
export function getCachedHabitGroups(): Record<number, Group[]> | null {
  return getCache<Record<number, Group[]>>(HABIT_GROUPS_CACHE_KEY, TTL_HABIT_GROUPS);
}

export function setCachedHabitGroups(habitGroups: Record<number, Group[]>): void {
  setCache(HABIT_GROUPS_CACHE_KEY, habitGroups);
}

export function invalidateHabitGroupsCache(): void {
  invalidateCache(HABIT_GROUPS_CACHE_KEY);
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
