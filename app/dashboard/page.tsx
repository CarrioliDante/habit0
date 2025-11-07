"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { Habit, Cadence, TimeRange, Group } from "@/types";
import { parseISO, subDays, format as formatDate } from "date-fns";
import {
  getHabits,
  createHabit as apiCreateHabit,
  getAnalyticsOverview,
  deleteHabit,
  restoreHabit,
  updateHabit,
  // exportCheckinsCSV,
  // compareAnalytics,
  getCheckins,
} from "@/lib/api";
import { getDateRange } from "@/lib/dateHelpers";
import { computeStreak } from "@/lib/metrics";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import { Button } from "@/components/ui/Button";
import { HabitList } from "@/components/habits/HabitList";
import { HabitForm } from "@/components/habits/HabitForm";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/lib/hooks/useToast";
import { useCheckin } from "@/lib/hooks/useCheckin";
import { Navigation } from "@/components/ui/Navigation";
import { GroupManager } from "@/components/groups/GroupManager";
import { GroupFilter } from "@/components/groups/GroupFilter";
import {
  getCachedHabits,
  cacheHabits,
  invalidateHabitsCache,
  cacheCheckins,
  invalidateCheckinsCache,
  getLocalCheckinsForHabit,
  saveLocalCheckin,
  markCheckinAsSynced,
} from "@/lib/localCache";
import {
  getCachedGroups,
  setCachedGroups,
  getCachedHabitGroups,
  setCachedHabitGroups,
  removeGroupFromCache
} from "@/lib/groupsCache";
import { processGroupsSyncQueue, addToGroupsSyncQueue } from "@/lib/groupsSyncQueue";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ListFilter,
  SunMedium,
  Trash2,
  Undo2,
} from "lucide-react";
import { normalizeIconValue } from "@/lib/iconUtils";

const TIME_FILTERS: Array<{ value: TimeRange; label: string; Icon: LucideIcon }> = [
  { value: "year", label: "Anual", Icon: CalendarCheck },
  { value: "week", label: "Semana", Icon: CalendarRange },
  { value: "month", label: "Calendario", Icon: CalendarDays },
];

const CADENCE_FILTERS: Array<{ value: Cadence | "all"; label: string; Icon: LucideIcon }> = [
  { value: "all", label: "Todas", Icon: ListFilter },
  { value: "daily", label: "Diario", Icon: SunMedium },
  { value: "weekly", label: "Semanal", Icon: CalendarRange },
];

export default function Dashboard() {
  // Toast notifications
  const { toasts, removeToast, success, error: showError, info } = useToast();

  // Estado para modo oscuro (activado por defecto para matching con diseño)
  const [darkMode, setDarkMode] = useState(true);

  // Estado para hábitos
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCheckins, setHabitCheckins] = useState<Record<number, Record<string, number>>>({});
  const checkinsCacheRef = useRef<Record<number, { from: string; to: string; data: Record<string, number> }>>({});
  const pendingCheckinsRef = useRef<Record<number, Promise<Record<string, number>> | undefined>>({});
  const normalizeCadenceValue = useCallback((cadence: unknown): Cadence => {
    if (!cadence) return "daily";
    const normalized = String(cadence).toLowerCase();
    if (normalized === "weekly" || normalized.includes("semana") || normalized.includes("week")) {
      return "weekly";
    }
    if (normalized === "custom" || normalized.includes("mes") || normalized.includes("month")) {
      return "custom";
    }
    return "daily";
  }, []);

  const normalizeHabitData = useCallback(
    (habit: Habit): Habit => ({
      ...habit,
      cadence: normalizeCadenceValue(habit.cadence),
      targetPerDay: typeof habit.targetPerDay === "number" && habit.targetPerDay > 0 ? habit.targetPerDay : 1,
      allowMultiplePerDay: !!habit.allowMultiplePerDay,
      color: habit.color || DEFAULT_HABIT_COLOR,
    }),
    [normalizeCadenceValue]
  );

  const renderHabitIcon = (value?: string) => {
    const Icons = LucideIcons as unknown as Record<string, unknown>;
    const normalized = normalizeIconValue(value || "");
    const Comp = Icons[normalized || "Star"] as unknown as ComponentType<{ size?: number }> | undefined;
    if (Comp) return <Comp size={18} />;
    const StarFallback = Icons.Star as unknown as ComponentType<{ size?: number }> | undefined;
    return StarFallback ? <StarFallback size={18} /> : null;
  };

  // Estado para métricas y UI
  // const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Timer para debounce de métricas
  const metricsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Estado para grupos
  const [groups, setGroups] = useState<Group[]>([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [habitGroups, setHabitGroups] = useState<Record<number, Group[]>>({});

  // Estado para filtros de tiempo (por defecto: año)
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
  // const [customFrom, setCustomFrom] = useState("");
  // const [customTo, setCustomTo] = useState("");

  // Estado para filtros adicionales
  const [filterCadence, setFilterCadence] = useState<Cadence | "all">("all");
  // const [sortBy, setSortBy] = useState<"title" | "streak" | "lastCheckin">("title");

  // Estado para comparación de períodos
  // const [showComparison, setShowComparison] = useState(false);
  // const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  // const [loadingComparison, setLoadingComparison] = useState(false);

  // Calcular el rango de fechas para métricas Y heatmap
  const dateRange = useMemo(() => {
    return getDateRange(timeRange, "", "");
  }, [timeRange]);

  // ELIMINADO: Rango fijo de 12 meses
  // Ahora el heatmap usa el mismo rango que el filtro seleccionado

  // Cargar grupos con patrón stale-while-revalidate
  const loadGroups = useCallback(async () => {
    // 1) Cargar desde cache primero (instantáneo)
    const cached = getCachedGroups();
    if (cached && cached.length > 0) {
      setGroups(cached);
    }

    // 2) Revalidar en background
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const freshGroups = json.data as Group[];
          setGroups(freshGroups);
          setCachedGroups(freshGroups);
        }
      }
    } catch (error) {
      console.error("Error loading groups:", error);
      // Si falla y no hay caché, mostrar vacío
      if (!cached) {
        setGroups([]);
      }
    }
  }, []);

  // Cargar grupos de los hábitos con patrón stale-while-revalidate
  const loadHabitGroups = useCallback(async (habitIds: number[]) => {
    if (habitIds.length === 0) {
      setHabitGroups({});
      return;
    }

    // 1) Cargar desde cache primero (instantáneo)
    const cached = getCachedHabitGroups();
    if (cached) {
      setHabitGroups(cached);
    }

    // 2) Revalidar en background
    try {
      // Usar el nuevo endpoint eficiente para cada hábito
      const habitGroupMap: Record<number, Group[]> = {};

      // Cargar grupos para cada hábito en paralelo
      await Promise.all(
        habitIds.map(async (habitId) => {
          try {
            const response = await fetch(`/api/habits/${habitId}/groups`);
            if (response.ok) {
              const json = await response.json();
              if (json.success && json.data) {
                habitGroupMap[habitId] = json.data;
              } else {
                habitGroupMap[habitId] = [];
              }
            } else {
              habitGroupMap[habitId] = [];
            }
          } catch (error) {
            console.error(`Error loading groups for habit ${habitId}:`, error);
            habitGroupMap[habitId] = [];
          }
        })
      );

      setHabitGroups(habitGroupMap);
      setCachedHabitGroups(habitGroupMap);
    } catch (error) {
      console.error("Error loading habit groups:", error);
      // Si falla y no hay caché, usar vacío
      if (!cached) {
        setHabitGroups({});
      }
    }
  }, []);

  // Callback para refrescar los grupos de un hábito específico
  const refreshHabitGroups = useCallback(async () => {
    // Refrescar todos los hábitos activos
    const activeHabitIds = habits.filter(h => !h.isArchived).map(h => h.id);
    await loadHabitGroups(activeHabitIds);
  }, [habits, loadHabitGroups]);

    // Cargar hábitos con patrón stale-while-revalidate
  const loadHabits = useCallback(async () => {
    // 1) Cargar desde cache primero (instantáneo)
    const cached = getCachedHabits();
    if (cached && cached.length > 0) {
      const normalized = cached.map(normalizeHabitData);
      const existingIds = new Set(normalized.map((habit) => habit.id));

      setHabits(normalized);
      setHabitCheckins((prev) => {
        const next: Record<number, Record<string, number>> = {};
        normalized.forEach((habit) => {
          next[habit.id] = prev[habit.id] || {};
        });
        return next;
      });

      const filteredCache: Record<number, { from: string; to: string; data: Record<string, number> }> = {};
      for (const [key, value] of Object.entries(checkinsCacheRef.current)) {
        const id = Number(key);
        if (existingIds.has(id) && value) {
          filteredCache[id] = value;
        }
      }
      checkinsCacheRef.current = filteredCache;

      for (const key of Object.keys(pendingCheckinsRef.current)) {
        const id = Number(key);
        if (!existingIds.has(id)) {
          delete pendingCheckinsRef.current[id];
        }
      }

      setLoading(false); // UI lista inmediatamente
    }

    // 2) Revalidar en background (actualiza si hay cambios)
    try {
      const freshHabits = await getHabits(); // apiFetch ya extrae .data automáticamente
      const normalized = freshHabits.map(normalizeHabitData);
      const existingIds = new Set(normalized.map((habit) => habit.id));

      // Guardar en cache para próxima carga
      cacheHabits(freshHabits);

      setHabits(normalized);
      setHabitCheckins((prev) => {
        const next: Record<number, Record<string, number>> = {};
        normalized.forEach((habit) => {
          next[habit.id] = prev[habit.id] || {};
        });
        return next;
      });

      const filteredCache: Record<number, { from: string; to: string; data: Record<string, number> }> = {};
      for (const [key, value] of Object.entries(checkinsCacheRef.current)) {
        const id = Number(key);
        if (existingIds.has(id) && value) {
          filteredCache[id] = value;
        }
      }
      checkinsCacheRef.current = filteredCache;

      for (const key of Object.keys(pendingCheckinsRef.current)) {
        const id = Number(key);
        if (!existingIds.has(id)) {
          delete pendingCheckinsRef.current[id];
        }
      }

      setLoading(false);
    } catch (e: unknown) {
      // Si falla revalidación pero tenemos cache, seguimos con cache
      if (!cached || cached.length === 0) {
        if (e instanceof Error) {
          setErr(e.message);
        }
        setLoading(false);
      }
    }
  }, [normalizeHabitData]);

  // Cargar métricas
  const loadMetrics = useCallback(async () => {
    try {
      await getAnalyticsOverview({
        from: dateRange.from,
        to: dateRange.to,
      });
      // setMetrics(data); // Comentado - métricas no se muestran actualmente
    } catch (e: unknown) {
      console.error("Error loading metrics:", e);
    }
  }, [dateRange.from, dateRange.to]); // Solo deps necesarias

  // Check-in handling with queue + debouncing
  const { handleCheckin: handleCheckinOptimized } = useCheckin({
    habitCheckins,
    setHabitCheckins,
    checkinsCacheRef,
    loadMetrics,
    toast: { success, error: showError, info },
  });

  // // Cargar comparación
  // const loadComparison = useCallback(async () => {
  //   if (!showComparison) {
  //     setComparison(null);
  //     return;
  //   }

  //   setLoadingComparison(true);
  //   try {
  //     const data = await compareAnalytics({
  //       current_from: dateRange.from,
  //       current_to: dateRange.to,
  //     });
  //     setComparison(data);
  //   } catch (e: unknown) {
  //     console.error("Error loading comparison:", e);
  //   } finally {
  //     setLoadingComparison(false);
  //   }
  // }, [showComparison, dateRange]);

  // Cargar check-ins de hábitos activos (OPTIMIZADO: una sola llamada en paralelo)
  const loadHabitCheckins = useCallback(async (habitsToLoad: Habit[], replace = false) => {
    const activeHabits = habitsToLoad.filter((h) => !h.isArchived);

    if (activeHabits.length === 0) {
      if (replace) setHabitCheckins({});
      return;
    }

    const filterDataByRange = (data: Record<string, number>, from: string, to: string) => {
      const slice: Record<string, number> = {};
      for (const [date, value] of Object.entries(data)) {
        if (date >= from && date <= to) {
          slice[date] = value;
        }
      }
      return slice;
    };

    const ensureHabitCheckins = async (
      habit: Habit,
      requestedFrom: string,
      requestedTo: string
    ): Promise<Record<string, number>> => {
      // 1) CARGAR DESDE LOCALSTORAGE (source of truth - datos persistentes)
      const localData = getLocalCheckinsForHabit(habit.id);

      // 2) Intentar cache en memoria (checkinsCacheRef)
      const getSliceFromCache = () => {
        const cacheEntry = checkinsCacheRef.current[habit.id];
        if (
          cacheEntry &&
          cacheEntry.from <= requestedFrom &&
          cacheEntry.to >= requestedTo
        ) {
          return filterDataByRange(cacheEntry.data, requestedFrom, requestedTo);
        }
        return null;
      };

      const cachedSlice = getSliceFromCache();

      // Si tenemos datos locales, retornarlos inmediatamente (no bloquear UI)
      if (Object.keys(localData).length > 0) {
        // Actualizar cache en memoria con datos locales
        checkinsCacheRef.current[habit.id] = {
          from: requestedFrom,
          to: requestedTo,
          data: localData,
        };

        // Retornar slice filtrado
        return filterDataByRange(localData, requestedFrom, requestedTo);
      }

      // Si no hay datos locales pero hay cache en memoria, usarlo
      if (cachedSlice) return cachedSlice;

      // 3) Fetch desde API en background (con deduplicación usando pendingCheckinsRef)
      if (!pendingCheckinsRef.current[habit.id]) {
        pendingCheckinsRef.current[habit.id] = getCheckins({
          from: requestedFrom,
          to: requestedTo,
          habitId: habit.id,
        })
          .then((response) => {
            // response ya es GetCheckinsResponse = { from, to, data: Record<string, number> }
            const serverData = response.data || {};

            // 🔥 MERGE: Datos locales tienen prioridad sobre servidor
            const localData = getLocalCheckinsForHabit(habit.id);
            const mergedData = { ...serverData, ...localData };

            // Guardar datos del servidor en localStorage (marcar como synced)
            for (const [date, count] of Object.entries(serverData)) {
              if (!localData[date]) {
                // Solo guardar si no existe localmente (local tiene prioridad)
                saveLocalCheckin(habit.id, date, count, true);
              }
            }

            const existing = checkinsCacheRef.current[habit.id];
            const newFrom = existing
              ? existing.from < requestedFrom
                ? existing.from
                : requestedFrom
              : requestedFrom;
            const newTo = existing
              ? existing.to > requestedTo
                ? existing.to
                : requestedTo
              : requestedTo;

            const newEntry = {
              from: newFrom,
              to: newTo,
              data: mergedData,
            };

            // Actualizar memoria cache
            checkinsCacheRef.current[habit.id] = newEntry;

            // Guardar en legacy cache para compatibilidad
            cacheCheckins(habit.id, mergedData, newFrom, newTo);

            return mergedData;
          })
          .catch((error) => {
            console.error(`Error loading checkins for habit ${habit.id}:`, error);
            // Si falla API, retornar datos locales como fallback
            return getLocalCheckinsForHabit(habit.id);
          })
          .finally(() => {
            delete pendingCheckinsRef.current[habit.id];
          });
      }

      try {
        await pendingCheckinsRef.current[habit.id];
      } catch (error) {
        console.error(`Error awaiting checkins for habit ${habit.id}:`, error);
        // Fallback a datos locales
        return getLocalCheckinsForHabit(habit.id);
      }

      const cacheEntry = checkinsCacheRef.current[habit.id];
      if (!cacheEntry) return getLocalCheckinsForHabit(habit.id);

      return filterDataByRange(cacheEntry.data, requestedFrom, requestedTo);
    };

    try {
      const results = await Promise.all(
        activeHabits.map(async (habit) => {
          const baseFrom = parseISO(dateRange.from);
          const isValidBase = !Number.isNaN(baseFrom.getTime());
          const extraDays = habit.cadence === "weekly" ? 365 : 120;
          const requestedFrom = isValidBase
            ? formatDate(subDays(baseFrom, extraDays), "yyyy-MM-dd")
            : dateRange.from;
          const requestedTo = dateRange.to;

          const data = await ensureHabitCheckins(habit, requestedFrom, requestedTo);
          return { habitId: habit.id, data };
        })
      );

      const checkinsByHabit: Record<number, Record<string, number>> = {};
      results.forEach(({ habitId, data }) => {
        checkinsByHabit[habitId] = data;
      });

      // Debug: verificar carga de checkins en producción
      if (process.env.NODE_ENV === 'production') {
        console.log('[Checkins Debug] Loaded checkins:', {
          habitCount: Object.keys(checkinsByHabit).length,
          totalCheckins: Object.values(checkinsByHabit).reduce((sum, checkins) => sum + Object.keys(checkins).length, 0)
        });
      }

      setHabitCheckins((prev) => (replace ? checkinsByHabit : { ...prev, ...checkinsByHabit }));
    } catch (error) {
      console.error("Error loading checkins:", error);
    }
  }, [dateRange.from, dateRange.to]); // Depende del filtro seleccionado

  // Effects
  useEffect(() => {
    loadHabits();
    loadGroups();

    // Procesar cola de sincronización de grupos en segundo plano
    processGroupsSyncQueue().catch(error => {
      console.error("Error processing groups sync queue:", error);
    });
  }, [loadHabits, loadGroups]);

  // Función para eliminar grupo (offline-first)
  const handleDeleteGroup = async (groupId: number) => {
    // 1) Eliminar optimistamente de la UI
    setGroups((prev) => prev.filter((g) => g.id !== groupId));

    // 2) Eliminar del caché
    removeGroupFromCache(groupId);

    // 3) Agregar a cola de sincronización
    addToGroupsSyncQueue({
      type: "delete",
      groupId,
    });

    // 4) Intentar eliminar en background
    try {
      await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      success("Grupo eliminado correctamente");
    } catch (error) {
      console.error("Error deleting group:", error);
      // La cola de sincronización lo reintentará
    }
  };

  // Cargar métricas cuando cambia el rango de fechas
  useEffect(() => {
    if (habits.length === 0) return;
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, habits.length]);

  // Cargar checkins cuando cambia el filtro o los hábitos
  useEffect(() => {
    if (habits.length === 0) return;
    loadHabitCheckins(habits, true); // replace = true para carga completa
    loadHabitGroups(habits.map(h => h.id)); // Cargar grupos de los hábitos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, habits.length]); // Recargar cuando cambia el filtro

  // Filtrar hábitos
  const activeHabits = useMemo(() => habits.filter((h) => !h.isArchived), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => h.isArchived), [habits]);

  const filteredActiveHabits = useMemo(() => {
    let filtered = activeHabits;

    // Filtrar por cadencia
    if (filterCadence !== "all") {
      filtered = filtered.filter((h) => h.cadence === filterCadence);
    }

    // Filtrar por grupo seleccionado
    if (selectedGroupId !== null) {
      filtered = filtered.filter((h) => {
        const groups = habitGroups[h.id] || [];
        return groups.some(g => g.id === selectedGroupId);
      });
    }

    // Ordenar por título alfabéticamente
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [activeHabits, filterCadence, selectedGroupId, habitGroups]);
  const dashboardViewMode: "default" | "week" | "month" =
    timeRange === "month" ? "month" : timeRange === "week" ? "week" : "default";

  // Calcular rachas por hábito
  const habitStreaks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const streaks: Record<number, number> = {};

    // Debug: estado de habitCheckins
    if (process.env.NODE_ENV === 'production') {
      console.log('[Streak Debug] habitCheckins state:', {
        totalHabits: habits.length,
        habitCheckinsKeys: Object.keys(habitCheckins),
        habitCheckinsData: habitCheckins
      });
    }

    // Si no hay hábitos o no hay checkins cargados aún, retornar vacío
    if (habits.length === 0 || Object.keys(habitCheckins).length === 0) {
      return streaks;
    }

    for (const habit of habits) {
      const checkins = habitCheckins[habit.id] || {};
      const dates = Object.keys(checkins).filter(date => checkins[date] > 0);
      streaks[habit.id] = computeStreak(dates, today, { cadence: habit.cadence });
      
      // Debug: verificar datos en producción
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Streak Debug] Habit: ${habit.title}`, {
          habitId: habit.id,
          checkinCount: dates.length,
          streak: streaks[habit.id],
          lastCheckin: dates.length > 0 ? dates[dates.length - 1] : 'none',
          allDates: dates
        });
      }
    }

    return streaks;
  }, [habits, habitCheckins]);

  // Handlers
  const handleCreateHabit = async (habitData: {
    title: string;
    description?: string;
    cadence: Cadence;
    targetPerDay: number;
    icon?: string;
    color?: string;
    allowMultiplePerDay?: boolean;
    groupIds?: number[];
  }) => {
    try {
      setLoading(true);
      setErr(null);

      // Extraer groupIds antes de crear el hábito
      const { groupIds, ...habitDataWithoutGroups } = habitData;

      const created = await apiCreateHabit(habitDataWithoutGroups);
      const normalizedHabit = normalizeHabitData(created);

      // Asignar grupos si se seleccionaron
      if (groupIds && groupIds.length > 0) {
        await Promise.all(
          groupIds.map(groupId =>
            fetch(`/api/groups/${groupId}/habits`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ habitId: normalizedHabit.id }),
            })
          )
        );
      }

      setHabits((prev) => [...prev, normalizedHabit]);
      setHabitCheckins((prev) => ({ ...prev, [normalizedHabit.id]: {} }));
      delete checkinsCacheRef.current[normalizedHabit.id];
      delete pendingCheckinsRef.current[normalizedHabit.id];

      // Invalidar cache de hábitos para que próxima carga muestre el nuevo
      invalidateHabitsCache();

      await loadHabitCheckins([normalizedHabit], false);
      setShowCreateModal(false);
      success("Hábito creado correctamente");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
        showError(e.message);
      } else {
        setErr("Error al crear el hábito");
        showError("Error al crear el hábito");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHabit = async (
    habitId: number,
    habitData: {
      title: string;
      description?: string;
      cadence: Cadence;
      targetPerDay: number;
      icon?: string;
      color?: string;
      allowMultiplePerDay?: boolean;
      groupIds?: number[];
    }
  ) => {
    try {
      setLoading(true);
      setErr(null);

      // Extraer groupIds antes de actualizar el hábito
      const { groupIds, ...habitDataWithoutGroups } = habitData;

      const updated = await updateHabit(habitId, habitDataWithoutGroups);
      const normalized = normalizeHabitData(updated);

      // TODO: Actualizar grupos (eliminar los viejos y agregar los nuevos)
      // Por ahora solo agregamos los nuevos
      if (groupIds && groupIds.length > 0) {
        await Promise.all(
          groupIds.map(groupId =>
            fetch(`/api/groups/${groupId}/habits`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ habitId }),
            }).catch(() => {
              // Ignorar errores de duplicados
            })
          )
        );
      }

      setHabits((prev) => prev.map((habit) => (habit.id === habitId ? normalized : habit)));

      if (normalized.isArchived) {
        setHabitCheckins((prev) => {
          const next = { ...prev };
          delete next[habitId];
          return next;
        });
      }

      delete checkinsCacheRef.current[habitId];
      delete pendingCheckinsRef.current[habitId];

      // Invalidar caches para que reflejen cambios
      invalidateHabitsCache();
      invalidateCheckinsCache(habitId);

      if (!normalized.isArchived) {
        await loadHabitCheckins([normalized], false);
      }

      setEditingHabit(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al actualizar el hábito");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler para editar desde el modal (in-place)
  const handleEditFromModal = async (habit: Habit) => {
    try {
      setErr(null);

      // Actualizar optimísticamente en el estado local (sin recargar)
      const optimistic = normalizeHabitData(habit);
      setHabits((prevHabits) => prevHabits.map((h) => (h.id === habit.id ? optimistic : h)));

      const updated = await updateHabit(habit.id, {
        title: habit.title,
        description: habit.description || undefined,
        cadence: habit.cadence,
        targetPerDay: habit.targetPerDay,
        icon: habit.icon,
        color: habit.color,
        allowMultiplePerDay: habit.allowMultiplePerDay,
      });

      const normalized = normalizeHabitData(updated);
      setHabits((prevHabits) => prevHabits.map((h) => (h.id === habit.id ? normalized : h)));
      delete checkinsCacheRef.current[habit.id];
      delete pendingCheckinsRef.current[habit.id];
      if (!normalized.isArchived) {
        await loadHabitCheckins([normalized], false);
      } else {
        setHabitCheckins((prev) => {
          const next = { ...prev };
          delete next[habit.id];
          return next;
        });
      }
    } catch (e: unknown) {
      // Si falla, recargar desde el servidor para revertir
      await loadHabits();

      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al actualizar el hábito");
      }
    }
  };

  const handleCheckin = async (habitId: number) => {
    // Buscar el hábito
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      showError("Hábito no encontrado");
      return;
    }

    // Calcular fecha actual (local, no UTC)
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Delegar al hook optimizado (con queue + debouncing)
    await handleCheckinOptimized(habit, todayStr);
  };

  // Nueva función para batch updates (mucho más rápido para múltiples cambios)
  const handleBatchUpdateCheckins = async (habitId: number, updates: Array<{ date: string; count: number }>) => {
    // Actualizar localmente de forma optimista
    setHabitCheckins((prev) => {
      const current = prev[habitId] || {};
      const newCheckins = { ...current };
      updates.forEach(({ date, count }) => {
        newCheckins[date] = count;
      });
      return {
        ...prev,
        [habitId]: newCheckins,
      };
    });

    const cacheEntry = checkinsCacheRef.current[habitId];
    if (cacheEntry) {
      updates.forEach(({ date, count }) => {
        cacheEntry.data[date] = count;
        if (date < cacheEntry.from) cacheEntry.from = date;
        if (date > cacheEntry.to) cacheEntry.to = date;
      });
    } else if (updates.length > 0) {
      const dates = updates.map(({ date }) => date);
      const from = dates.reduce((min, current) => (current < min ? current : min), dates[0]);
      const to = dates.reduce((max, current) => (current > max ? current : max), dates[0]);
      const data: Record<string, number> = {};
      updates.forEach(({ date, count }) => {
        data[date] = count;
      });
      checkinsCacheRef.current[habitId] = { from, to, data };
    }

    // 🔥 PERSISTIR EN LOCALSTORAGE (offline-first)
    updates.forEach(({ date, count }) => {
      saveLocalCheckin(habitId, date, count, false); // false = not synced yet
    });

    // Persistir todos en una sola llamada en background
    fetch("/api/checkins", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, updates }),
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.success) {
          console.error("Batch API Error:", response.status, json);
        } else {
          // ✅ Marcar como sincronizados después de éxito
          updates.forEach(({ date }) => {
            markCheckinAsSynced(habitId, date);
          });
        }
      })
      .catch((e) => {
        console.error("Error in handleBatchUpdateCheckins:", e);
        // Si falla, recargar solo los checkins de este hábito
        const habit = habits.find(h => h.id === habitId);
        if (habit) loadHabitCheckins([habit]);
      });

    // Debounce: recargar métricas solo después de 1.5s sin cambios
    if (metricsTimerRef.current) {
      clearTimeout(metricsTimerRef.current);
    }
    metricsTimerRef.current = setTimeout(() => {
      loadMetrics();
    }, 1500);
  };

  const handleDelete = async (habitId: number, hard: boolean) => {
    const message = hard
      ? "⚠️ ¿Estás seguro de que quieres eliminar este hábito permanentemente?\n\nEsta acción NO se puede deshacer."
      : "¿Archivar este hábito?\n\nPodrás restaurarlo después.";

    if (!window.confirm(message)) return;

    try {
      setLoading(true);
      setErr(null);
      await deleteHabit(habitId, hard);

      if (hard) {
        setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
        setHabitCheckins((prev) => {
          const next = { ...prev };
          delete next[habitId];
          return next;
        });
        delete checkinsCacheRef.current[habitId];
        delete pendingCheckinsRef.current[habitId];
      } else {
        setHabits((prev) =>
          prev.map((habit) =>
            habit.id === habitId ? { ...habit, isArchived: true } : habit
          )
        );
      }

      // Invalidar caches
      invalidateHabitsCache();
      invalidateCheckinsCache(habitId);

      await loadMetrics();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al eliminar el hábito");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (habitId: number) => {
    try {
      setLoading(true);
      setErr(null);
      await restoreHabit(habitId);
      let restoredHabit: Habit | null = null;
      setHabits((prev) =>
        prev.map((habit) => {
          if (habit.id === habitId) {
            const updated = normalizeHabitData({ ...habit, isArchived: false });
            restoredHabit = updated;
            return updated;
          }
          return habit;
        })
      );

      // Invalidar caches
      invalidateHabitsCache();

      if (restoredHabit) {
        await loadHabitCheckins([restoredHabit], false);
      }
      await loadMetrics();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al restaurar el hábito");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler para toggle del modo oscuro

  // const handleExportCSV = async () => {
  //   try {
  //     setLoading(true);
  //     const blob = await exportCheckinsCSV({
  //       from: dateRange.from,
  //       to: dateRange.to,
  //     });

  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = `checkins_${dateRange.from}_${dateRange.to}.csv`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error("Error exporting CSV:", error);
  //     setErr("Error al exportar datos");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode
        ? "bg-linear-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-linear-to-br from-white via-gray-50 to-white"
    }`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Navigation Component */}
        <Navigation darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

        {/* Error message */}
        {err && (
          <div
            className={`mb-4 border rounded-lg p-3 text-sm ${
              darkMode
                ? "bg-red-900/20 border-red-800 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {err}
          </div>
        )}

        {/* Filtros centrales con estética minimalista - responsive */}
        {activeHabits.length > 0 && (
          <div className="mb-6 sm:mb-8 flex justify-center relative z-10">
            <div
              className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-2xl sm:rounded-full px-2 sm:px-3 py-2 border w-full sm:w-auto ${
                darkMode
                  ? "border-gray-700 bg-gray-900/70 backdrop-blur"
                  : "border-slate-200 bg-white/80 backdrop-blur shadow-sm"
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-[0.25em] font-semibold ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
              </span>
              {TIME_FILTERS.map(({ value, label, Icon }) => {
                const active = timeRange === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTimeRange(value)}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      active
                        ? darkMode
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-900 shadow-sm"
                        : darkMode
                        ? "text-gray-400 hover:text-white hover:bg-white/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon size={14} className="sm:w-[15px] sm:h-[15px]" />
                    <span className="hidden xs:inline">{label}</span>
                  </button>
                );
              })}

              <span className={`${darkMode ? "bg-gray-700/80" : "bg-slate-200"} h-6 w-px rounded-full`} aria-hidden="true" />

              <span
                className={`text-[11px] uppercase tracking-[0.25em] font-semibold ${
                  darkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
              </span>
              {CADENCE_FILTERS.map(({ value, label, Icon }) => {
                const active = filterCadence === value;
                return (
                  <button
                    key={value}
                    onClick={() => setFilterCadence(value)}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      active
                        ? darkMode
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-900 shadow-sm"
                        : darkMode
                        ? "text-gray-400 hover:text-white hover:bg-white/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon size={14} className="sm:w-[15px] sm:h-[15px]" />
                    <span className="hidden xs:inline">{label}</span>
                  </button>
                );
              })}

              {/* Separador y filtro de grupos */}
              {groups.length > 0 && (
                <>
                  <span className={`${darkMode ? "bg-gray-700/80" : "bg-slate-200"} h-6 w-px rounded-full`} aria-hidden="true" />
                  <GroupFilter
                    groups={groups}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={setSelectedGroupId}
                    onDeleteGroup={handleDeleteGroup}
                    darkMode={darkMode}
                  />
                </>
              )}

              {/* Botón gestionar grupos */}
              <span className={`${darkMode ? "bg-gray-700/80" : "bg-slate-200"} h-6 w-px rounded-full hidden sm:block`} aria-hidden="true" />
              <button
                onClick={() => setShowGroupManager(true)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
                title="Gestionar grupos"
              >
                <ClipboardList size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="hidden xs:inline">Grupos</span>
              </button>
            </div>
          </div>
        )}

        {/* Lista de hábitos o mensaje vacío */}
        {/* Loading state inicial */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent mb-4"></div>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Cargando hábitos...
            </p>
          </div>
        ) : activeHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ClipboardList
              size={64}
              className={`mb-4 ${
                darkMode ? "text-gray-600" : "text-gray-300"
              }`}
            />
            <h3
              className={`text-xl font-semibold mb-2 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No hay hábitos aún
            </h3>
            <p
              className={`text-sm mb-6 ${
                darkMode ? "text-gray-600" : "text-gray-500"
              }`}
            >
              Comienza creando tu primer hábito
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="px-6"
            >
              + Añadir hábito
            </Button>
          </div>
        ) : (
          <HabitList
            habits={filteredActiveHabits}
            habitCheckins={habitCheckins}
            habitStreaks={habitStreaks}
            habitGroups={habitGroups}
            allGroups={groups}
            dateRange={dateRange}
            viewMode={dashboardViewMode}
            darkMode={darkMode}
            onCheckin={handleCheckin}
            onEdit={handleEditFromModal}
            onArchive={(id) => handleDelete(id, false)}
            onDelete={(id) => handleDelete(id, true)}
            onBatchUpdateCheckins={handleBatchUpdateCheckins}
            onGroupsChange={refreshHabitGroups}
            loading={loading}
            emptyMessage={
              filterCadence !== "all"
                ? "No hay hábitos con esta cadencia"
                : selectedGroupId !== null
                ? "No hay hábitos en este grupo"
                : "Todavía no tenés hábitos"
            }
          />
        )}

        {/* Hábitos archivados - colapsable */}
        {archivedHabits.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-sm font-medium flex items-center gap-2 mb-3 ${
                darkMode ? "text-gray-500 hover:text-gray-400" : "text-gray-600 hover:text-gray-700"
              }`}
            >
              {showArchived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Archivados ({archivedHabits.length})
            </button>

            {showArchived && (
              <div className="space-y-2">
                {archivedHabits.map((habit) => (
                  <div
                    key={habit.id}
                    className={`rounded-lg border p-3 flex items-center justify-between opacity-60 ${
                      darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: habit.color || DEFAULT_HABIT_COLOR }}
                      >
                        {renderHabitIcon(habit.icon)}
                      </div>
                      <div>
                        <div className={`font-medium text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {habit.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRestore(habit.id)}
                        disabled={loading}
                        variant="ghost"
                        size="sm"
                        aria-label="Restaurar hábito"
                        title="Restaurar hábito"
                      >
                        <Undo2 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(habit.id, true)}
                        disabled={loading}
                        variant="ghost"
                        size="sm"
                        aria-label="Eliminar hábito"
                        title="Eliminar hábito"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botón flotante para agregar hábito - solo visible si hay hábitos - responsive */}
      {activeHabits.length > 0 && (
      <button
        onClick={() => setShowCreateModal(true)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center text-xl sm:text-2xl transition-transform hover:scale-110 active:scale-95 ${
          darkMode ? "bg-green-500 hover:bg-green-600" : "bg-green-500 hover:bg-green-600"
        } text-white z-50`}
        title="Añadir hábito"
        aria-label="Añadir hábito"
      >
        +
      </button>
      )}

      {/* Modal para crear hábito */}
      {showCreateModal && (
        <HabitForm
          onSubmit={handleCreateHabit}
          onCancel={() => setShowCreateModal(false)}
          loading={loading}
          darkMode={darkMode}
          isModal
          groups={groups}
        />
      )}

      {/* Modal para editar hábito */}
      {editingHabit && (
                <HabitForm
          habit={editingHabit}
          onSubmit={(data) => handleUpdateHabit(editingHabit.id, data)}
          onCancel={() => setEditingHabit(null)}
          loading={loading}
          darkMode={darkMode}
          isModal
          groups={groups}
        />
      )}

      {/* Modal para gestionar grupos */}
      <GroupManager
        isOpen={showGroupManager}
        onClose={() => setShowGroupManager(false)}
        onSuccess={() => {
          // El caché ya fue actualizado por GroupManager, solo refrescamos desde ahí
          const cached = getCachedGroups();
          if (cached) {
            setGroups(cached);
          }
          success("Grupo guardado correctamente");
        }}
        darkMode={darkMode}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
