"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { Habit, Cadence, TimeRange } from "@/types";
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
import { UserButton } from "@clerk/nextjs";
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
  Moon,
  Sun,
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
      const data = await getAnalyticsOverview({
        from: dateRange.from,
        to: dateRange.to,
      });
      // setMetrics(data); // Comentado - métricas no se muestran actualmente
    } catch (e: unknown) {
      console.error("Error loading metrics:", e);
    }
  }, [dateRange.from, dateRange.to]); // Solo deps necesarias

  // Check-in handling with queue + debouncing
  const { handleCheckin: handleCheckinOptimized, hasPendingSync } = useCheckin({
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

      setHabitCheckins((prev) => (replace ? checkinsByHabit : { ...prev, ...checkinsByHabit }));
    } catch (error) {
      console.error("Error loading checkins:", error);
    }
  }, [dateRange.from, dateRange.to]); // Depende del filtro seleccionado

  // Effects
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, habits.length]); // Recargar cuando cambia el filtro

  // Filtrar hábitos
  const activeHabits = useMemo(() => habits.filter((h) => !h.isArchived), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => h.isArchived), [habits]);

  const filteredActiveHabits = useMemo(() => {
    let filtered = activeHabits;

    if (filterCadence !== "all") {
      filtered = filtered.filter((h) => h.cadence === filterCadence);
    }

    // Ordenar por título alfabéticamente
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [activeHabits, filterCadence]);
  const dashboardViewMode: "default" | "week" | "month" =
    timeRange === "month" ? "month" : timeRange === "week" ? "week" : "default";

  // Calcular rachas por hábito
  const habitStreaks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const streaks: Record<number, number> = {};

    for (const habit of habits) {
      const checkins = habitCheckins[habit.id] || {};
      const dates = Object.keys(checkins).filter(date => checkins[date] > 0);
      streaks[habit.id] = computeStreak(dates, today, { cadence: habit.cadence });
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
  }) => {
    try {
      setLoading(true);
      setErr(null);
      const created = await apiCreateHabit(habitData);
      const normalizedHabit = normalizeHabitData(created);

      setHabits((prev) => [...prev, normalizedHabit]);
      setHabitCheckins((prev) => ({ ...prev, [normalizedHabit.id]: {} }));
      delete checkinsCacheRef.current[normalizedHabit.id];
      delete pendingCheckinsRef.current[normalizedHabit.id];

      // Invalidar cache de hábitos para que próxima carga muestre el nuevo
      invalidateHabitsCache();

      await loadHabitCheckins([normalizedHabit], false);
      setShowCreateModal(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al crear el hábito");
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
    }
  ) => {
    try {
      setLoading(true);
      setErr(null);
      const updated = await updateHabit(habitId, habitData);
      const normalized = normalizeHabitData(updated);

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
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-white via-gray-50 to-white"
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header con UserButton y Dark Mode */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Habit<span className="text-blue-500">0</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Button from Clerk */}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

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

        {/* Filtros centrales con estética minimalista */}
        {activeHabits.length > 0 && (
          <div className="mb-8 flex justify-center">
            <div
              className={`flex flex-wrap items-center gap-2 rounded-full px-3 py-2 border ${
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                    <Icon size={15} />
                    {label}
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                    <Icon size={15} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de hábitos o mensaje vacío */}
        {/* Loading state inicial */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
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
            dateRange={dateRange}
            viewMode={dashboardViewMode}
            darkMode={darkMode}
            onCheckin={handleCheckin}
            onEdit={handleEditFromModal}
            onArchive={(id) => handleDelete(id, false)}
            onDelete={(id) => handleDelete(id, true)}
            onBatchUpdateCheckins={handleBatchUpdateCheckins}
            loading={loading}
            emptyMessage={
              filterCadence !== "all"
                ? "No hay hábitos con esta cadencia"
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

      {/* Botón flotante para agregar hábito - solo visible si hay hábitos */}
      {activeHabits.length > 0 && (
      <button
        onClick={() => setShowCreateModal(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 ${
          darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"
        } text-white`}
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
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
