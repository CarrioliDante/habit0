"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Habit, Metrics, Cadence, TimeRange } from "@/types";
import {
  getHabits,
  createHabit as apiCreateHabit,
  createCheckin,
  getAnalyticsOverview,
  deleteHabit,
  restoreHabit,
  updateHabit,
  // exportCheckinsCSV,
  // compareAnalytics,
  getCheckins,
} from "@/lib/api";
import { getDateRange, getTimeRangeLabel } from "@/lib/dateHelpers";
import { computeStreak } from "@/lib/metrics";
import { Button } from "@/components/ui/Button";
import { HabitList } from "@/components/habits/HabitList";
import { HabitForm } from "@/components/habits/HabitForm";

export default function Dashboard() {
  // Estado para modo oscuro (activado por defecto para matching con diseño)
  const [darkMode, setDarkMode] = useState(true);

  // Estado para hábitos
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCheckins, setHabitCheckins] = useState<Record<number, Record<string, number>>>({});

  // Estado para métricas y UI
  const [metrics, setMetrics] = useState<Metrics | null>(null);
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

  // Calcular el rango de fechas
  const dateRange = useMemo(() => {
    return getDateRange(timeRange, "", "");
  }, [timeRange]);

    // Cargar hábitos
  const loadHabits = useCallback(async () => {
    try {
      const data = await getHabits();
      setHabits(data);
      setLoading(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      }
      setLoading(false);
    }
  }, []);

  // Cargar métricas
  const loadMetrics = useCallback(async () => {
    try {
      const data = await getAnalyticsOverview({
        from: dateRange.from,
        to: dateRange.to,
      });
      setMetrics(data);
    } catch (e: unknown) {
      console.error("Error loading metrics:", e);
    }
  }, [dateRange.from, dateRange.to]); // Solo deps necesarias

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
  const loadHabitCheckins = useCallback(async (habitsToLoad: Habit[]) => {
    const activeHabits = habitsToLoad.filter((h) => !h.isArchived);

    if (activeHabits.length === 0) {
      setHabitCheckins({});
      return;
    }

    try {
      // Hacer todas las llamadas en paralelo en lugar de secuencial
      const promises = activeHabits.map((habit) =>
        getCheckins({
          from: dateRange.from,
          to: dateRange.to,
          habitId: habit.id,
        }).then((response) => ({ habitId: habit.id, data: response.data }))
        .catch((e) => {
          console.error(`Error loading checkins for habit ${habit.id}:`, e);
          return { habitId: habit.id, data: {} };
        })
      );

      const results = await Promise.all(promises);

      const checkinsByHabit: Record<number, Record<string, number>> = {};
      results.forEach(({ habitId, data }) => {
        checkinsByHabit[habitId] = data;
      });

      setHabitCheckins(checkinsByHabit);
    } catch (e) {
      console.error("Error loading checkins:", e);
    }
  }, [dateRange.from, dateRange.to]);  // Effects
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Cargar métricas y checkins solo cuando cambia el rango de fechas O la cantidad de hábitos
  // Usamos habits.length en lugar de habits para evitar recargas al editar
  useEffect(() => {
    if (habits.length === 0) return;

    // Ejecutar ambas llamadas en paralelo
    loadMetrics();
    loadHabitCheckins(habits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to, habits.length]);

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

  // Calcular rachas por hábito
  const habitStreaks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const streaks: Record<number, number> = {};

    for (const habit of habits) {
      const checkins = habitCheckins[habit.id] || {};
      const dates = Object.keys(checkins).filter(date => checkins[date] > 0);
      streaks[habit.id] = computeStreak(dates, today);
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
      await apiCreateHabit(habitData);
      await loadHabits();
      setShowCreateModal(false); // Cerrar modal después de crear
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
      await updateHabit(habitId, habitData);
      await loadHabits();
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
      setHabits((prevHabits) =>
        prevHabits.map((h) => (h.id === habit.id ? habit : h))
      );

      // Hacer la actualización en background
      await updateHabit(habit.id, {
        title: habit.title,
        description: habit.description || undefined,
        cadence: habit.cadence,
        targetPerDay: habit.targetPerDay,
        icon: habit.icon,
        color: habit.color,
        allowMultiplePerDay: habit.allowMultiplePerDay,
      });

      // NO llamar loadHabits() ni loadHabitCheckins() - ya actualizamos el estado localmente
      // Solo recargar si hubo un error (catch block)
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
    try {
      setLoading(true);
      setErr(null);

      // Crear el check-in
      await createCheckin({ habitId });

      // Recargar check-ins del hábito específico ANTES de loadHabits
      const response = await getCheckins({
        from: dateRange.from,
        to: dateRange.to,
        habitId,
      });

      // Actualizar inmediatamente el state
      setHabitCheckins((prev) => ({
        ...prev,
        [habitId]: response.data
      }));

      // Recargar métricas (sin recargar hábitos para no trigger loadHabitCheckins)
      await loadMetrics();

    } catch (e: unknown) {
      console.error("Error in handleCheckin:", e);
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al registrar check-in");
      }
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para batch updates (mucho más rápido para múltiples cambios)
  const handleBatchUpdateCheckins = async (habitId: number, updates: Array<{ date: string; count: number }>) => {
    // Actualizar localmente de forma optimista
    setHabitCheckins((prev) => {
      const newCheckins = { ...prev[habitId] };
      updates.forEach(({ date, count }) => {
        newCheckins[date] = count;
      });
      return {
        ...prev,
        [habitId]: newCheckins,
      };
    });

    // Persistir todos en una sola llamada en background
    fetch("/api/checkins", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, updates }),
    })
      .then((response) => {
        if (!response.ok) {
          response.json().then((errorData) => {
            console.error("Batch API Error:", response.status, errorData);
          });
        }
      })
      .catch((e) => {
        console.error("Error in handleBatchUpdateCheckins:", e);
        // Solo recargar si falla
        loadHabits();
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
      await loadHabits();
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
      await loadHabits();
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
      {/* Header minimalista */}
      <div className={`border-b backdrop-blur-sm ${
        darkMode
          ? "border-gray-800 bg-black/50"
          : "border-gray-200 bg-white/80"
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className={`text-xl font-bold ${darkMode ? "text-gray-50" : "text-gray-900"}`}>
            Habit0
          </h1>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"
            }`}
            title="Cambiar tema"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
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

        {/* Filtros en pills - solo si hay hábitos */}
        {activeHabits.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {/* Time range pills */}
            {(["week", "month", "year"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                  timeRange === range
                    ? darkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                    : darkMode
                    ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {getTimeRangeLabel(range)}
              </button>
            ))}

            {/* Divider */}
            <div className={`h-6 w-px ${darkMode ? "bg-gray-800" : "bg-gray-300"}`} />

            {/* Cadence filter pills */}
            {(["all", "daily", "weekly"] as (Cadence | "all")[]).map((cad) => (
              <button
                key={cad}
                onClick={() => setFilterCadence(cad)}
                className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                  filterCadence === cad
                    ? darkMode
                      ? "bg-purple-600 text-white"
                      : "bg-purple-600 text-white"
                    : darkMode
                    ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {cad === "all" ? "Todas" : cad === "daily" ? "Diario" : "Semanal"}
              </button>
            ))}
          </div>
        )}

        {/* Métricas - solo si hay hábitos */}
        {metrics && activeHabits.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div
              className={`rounded-xl p-4 text-center ${
                darkMode ? "bg-gray-800/50" : "bg-green-50"
              }`}
            >
              <div className={`text-2xl font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                {metrics.adherence}%
              </div>
              <div className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                Adherencia
              </div>
            </div>
            <div
              className={`rounded-xl p-4 text-center ${
                darkMode ? "bg-gray-800/50" : "bg-blue-50"
              }`}
            >
              <div className={`text-2xl font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                ✓ {metrics.totalCheckins}
              </div>
              <div className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                Check-ins
              </div>
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
            <div
              className={`text-6xl mb-4 ${
                darkMode ? "opacity-20" : "opacity-30"
              }`}
            >
              📋
            </div>
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
              <span>{showArchived ? "▼" : "▶"}</span>
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
                        style={{ backgroundColor: habit.color || "#3b82f6" }}
                      >
                        {habit.icon || "⭐"}
                      </div>
                      <div>
                        <div className={`font-medium text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {habit.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleRestore(habit.id)} disabled={loading} variant="ghost" size="sm">
                        ♻️
                      </Button>
                      <Button
                        onClick={() => handleDelete(habit.id, true)}
                        disabled={loading}
                        variant="ghost"
                        size="sm"
                      >
                        🗑️
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
    </div>
  );
}
