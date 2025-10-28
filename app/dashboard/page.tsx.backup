"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Habit, Metrics, Cadence, TimeRange, PeriodComparison } from "@/types";
import {
  getHabits,
  createHabit as apiCreateHabit,
  createCheckin,
  getAnalyticsOverview,
  deleteHabit,
  restoreHabit,
  updateHabit,
  exportCheckinsCSV,
  compareAnalytics,
  getCheckins,
} from "@/lib/api";
import { getDateRange, getTimeRangeLabel } from "@/lib/dateHelpers";
import { Button } from "@/components/ui/Button";
import { IconPicker } from "@/components/ui/IconPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";

export default function Dashboard() {
  // Estado para modo oscuro
  const [darkMode, setDarkMode] = useState(false);

  // Estado para la lista de hábitos del usuario
  const [habits, setHabits] = useState<Habit[]>([]);

  // Estado para los check-ins de cada hábito
  const [habitCheckins, setHabitCheckins] = useState<Record<number, Record<string, number>>>({});

  // Estado para el formulario de nuevo hábito
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [icon, setIcon] = useState("⭐");
  const [color, setColor] = useState("#3b82f6");

  // Estado para almacenar las métricas de adherencia y racha
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Estado para el modal de edición
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCadence, setEditCadence] = useState<Cadence>("daily");
  const [editTargetPerDay, setEditTargetPerDay] = useState(1);
  const [editIcon, setEditIcon] = useState("⭐");
  const [editColor, setEditColor] = useState("#3b82f6");

  // Estado para el filtro de tiempo
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Estado para filtros adicionales
  const [filterCadence, setFilterCadence] = useState<Cadence | "all">("all");
  const [sortBy, setSortBy] = useState<"title" | "streak" | "lastCheckin">("title");

  // Estado para comparación de períodos
  const [showComparison, setShowComparison] = useState(false);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Calcular el rango de fechas actual basado en el filtro
  const dateRange = useMemo(() => {
    return getDateRange(timeRange, customFrom, customTo);
  }, [timeRange, customFrom, customTo]);

  // Función para cargar los hábitos del usuario
  const loadHabits = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await getHabits();
      setHabits(data);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al cargar hábitos");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para cargar las métricas con el rango de fechas actual
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
  }, [dateRange]);

  // Función para cargar comparación de períodos
  const loadComparison = useCallback(async () => {
    if (!showComparison) {
      setComparison(null);
      return;
    }

    setLoadingComparison(true);
    try {
      const data = await compareAnalytics({
        current_from: dateRange.from,
        current_to: dateRange.to,
      });
      setComparison(data);
    } catch (e: unknown) {
      console.error("Error loading comparison:", e);
    } finally {
      setLoadingComparison(false);
    }
  }, [showComparison, dateRange]);

  // Cargar hábitos y métricas al montar el componente
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Cargar comparación cuando cambia el toggle o el rango
  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  // Filtrar hábitos activos y archivados
  const activeHabits = useMemo(() => habits.filter((h) => !h.isArchived), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => h.isArchived), [habits]);

  // Función para cargar check-ins de todos los hábitos activos
  const loadHabitCheckins = useCallback(async () => {
    if (activeHabits.length === 0) return;

    try {
      const checkinsData: Record<number, Record<string, number>> = {};

      // Cargar check-ins para cada hábito activo
      await Promise.all(
        activeHabits.map(async (habit) => {
          const response = await getCheckins({
            habitId: habit.id,
            from: dateRange.from,
            to: dateRange.to,
          });
          checkinsData[habit.id] = response.data;
        })
      );

      setHabitCheckins(checkinsData);
    } catch (e: unknown) {
      console.error("Error loading habit checkins:", e);
    }
  }, [activeHabits, dateRange]);

  // Cargar check-ins cuando cambian los hábitos o el rango de fechas
  useEffect(() => {
    loadHabitCheckins();
  }, [loadHabitCheckins]);

  // Filtrar y ordenar hábitos activos
  const filteredActiveHabits = useMemo(() => {
    let filtered = activeHabits;

    if (filterCadence !== "all") {
      filtered = filtered.filter((h) => h.cadence === filterCadence);
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "streak":
        case "lastCheckin":
          return 0;
        default:
          return 0;
      }
    });

    return sorted;
  }, [activeHabits, filterCadence, sortBy]);

  /**
   * Crear un nuevo hábito
   */
  const createHabit = async () => {
    if (!title.trim()) {
      setErr("El título no puede estar vacío");
      return;
    }

    try {
      setLoading(true);
      setErr(null);

      await apiCreateHabit({
        title: title.trim(),
        cadence,
        targetPerDay: 1,
        icon,
        color,
      });

      await loadHabits();

      // Limpiar formulario
      setTitle("");
      setCadence("daily");
      setIcon("⭐");
      setColor("#3b82f6");
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

  /**
   * Hacer check-in de un hábito
   */
  const handleCheckin = async (habitId: number) => {
    try {
      setLoading(true);
      setErr(null);

      await createCheckin({ habitId });
      await loadHabits();
      await loadMetrics();

      // Recargar check-ins para actualizar el heatmap
      await loadHabitCheckins();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Error al registrar check-in");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Eliminar o archivar un hábito
   */
  const handleDelete = async (habitId: number, hard: boolean) => {
    if (hard) {
      const confirmed = window.confirm(
        "⚠️ ¿Estás seguro de que quieres eliminar este hábito permanentemente?\n\n" +
          "Esta acción NO se puede deshacer y se perderán todos los check-ins asociados."
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        "¿Archivar este hábito?\n\nPodrás restaurarlo después desde la sección de archivados."
      );
      if (!confirmed) return;
    }

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

  /**
   * Restaurar un hábito archivado
   */
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

  /**
   * Abrir modal de edición con los datos del hábito
   */
  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditCadence(habit.cadence);
    setEditTargetPerDay(habit.targetPerDay);
    setEditIcon(habit.icon || "⭐");
    setEditColor(habit.color || "#3b82f6");
  };

  /**
   * Cerrar modal de edición
   */
  const closeEditModal = () => {
    setEditingHabit(null);
    setEditTitle("");
    setEditCadence("daily");
    setEditTargetPerDay(1);
    setEditIcon("⭐");
    setEditColor("#3b82f6");
  };

  /**
   * Guardar cambios del hábito editado
   */
  const handleUpdateHabit = async () => {
    if (!editingHabit) return;

    if (!editTitle.trim()) {
      setErr("El título no puede estar vacío");
      return;
    }

    try {
      setLoading(true);
      setErr(null);

      await updateHabit(editingHabit.id, {
        title: editTitle.trim(),
        cadence: editCadence,
        targetPerDay: editTargetPerDay,
        icon: editIcon,
        color: editColor,
      });

      await loadHabits();
      closeEditModal();
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

  /**
   * Expandir/colapsar estadísticas de un hábito
   */
  /**
   * Exportar check-ins a CSV
   */
  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const blob = await exportCheckinsCSV({
        from: dateRange.from,
        to: dateRange.to,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `checkins_${dateRange.from}_${dateRange.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setErr("Error al exportar datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen py-8 transition-colors ${
      darkMode ? "bg-gray-900" : "bg-gray-50"
    }`}>
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header con toggle de modo oscuro */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Mis Hábitos
            </h1>
            <p className={`mt-1 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}>
              Construye mejores hábitos, un día a la vez
            </p>
          </div>

          {/* Toggle modo oscuro */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={darkMode ? "Modo día" : "Modo noche"}
          >
            {darkMode ? "☀️ Día" : "🌙 Noche"}
          </button>
        </div>

        {/* Mostrar indicador de carga */}
        {loading && (
          <div className={`border rounded-lg p-3 text-sm ${
            darkMode
              ? "bg-blue-900/30 border-blue-700 text-blue-300"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            Cargando...
          </div>
        )}

        {/* Mostrar mensaje de error si existe */}
        {err && (
          <div className={`border rounded-lg p-3 text-sm ${
            darkMode
              ? "bg-red-900/30 border-red-700 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {err}
          </div>
        )}

        {/* Formulario para crear nuevo hábito */}
        <div className={`rounded-lg shadow-sm border p-6 ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            Crear nuevo hábito
          </h2>

          <div className="space-y-4">
            {/* Selector de icono y color */}
            <div className="flex gap-4 items-center">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Icono
                </label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Color
                </label>
                <ColorPicker value={color} onChange={setColor} />
              </div>

              {/* Preview */}
              <div className="flex-1 ml-4">
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Vista previa
                </label>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-2xl">{icon}</span>
                  <span>{title || "Nuevo hábito"}</span>
                </div>
              </div>
            </div>

            {/* Título */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Beber agua, Hacer ejercicio..."
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                disabled={loading}
              />
            </div>

            {/* Cadencia */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Cadencia
              </label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as Cadence)}
                className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                disabled={loading}
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Botón crear */}
            <Button
              onClick={createHabit}
              disabled={loading || !title.trim()}
              variant="primary"
              className="w-full"
            >
              {loading ? "Creando..." : "Crear hábito"}
            </Button>
          </div>
        </div>

        {/* Filtros de tiempo y visualización */}
        <div className={`rounded-lg shadow-sm border p-6 space-y-4 ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <h3 className={`font-semibold text-lg ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            Filtros y período
          </h3>

          {/* Selector de rango de tiempo */}
          <div className="grid grid-cols-4 gap-2">
            {(["today", "week", "month", "30days", "90days", "6months", "year", "all"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  timeRange === range
                    ? darkMode
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-blue-600 text-white border-blue-600"
                    : darkMode
                    ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {getTimeRangeLabel(range)}
              </button>
            ))}
          </div>

          {/* Rango personalizado */}
          {timeRange === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={`border rounded-lg px-3 py-2 text-sm ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={`border rounded-lg px-3 py-2 text-sm ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          )}

          {/* Filtros adicionales */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Cadencia:
              </label>
              <select
                value={filterCadence}
                onChange={(e) => setFilterCadence(e.target.value as Cadence | "all")}
                className={`border rounded-lg px-3 py-1.5 text-sm ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="all">Todas</option>
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Ordenar:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "title" | "streak" | "lastCheckin")}
                className={`border rounded-lg px-3 py-1.5 text-sm ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="title">Nombre</option>
                <option value="streak">Racha</option>
                <option value="lastCheckin">Última actividad</option>
              </select>
            </div>
          </div>

          <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Mostrando: {getTimeRangeLabel(timeRange)} ({dateRange.from} → {dateRange.to})
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} disabled={loading} variant="secondary" size="sm">
            📥 Exportar CSV
          </Button>
          <Button
            onClick={() => setShowComparison(!showComparison)}
            variant={showComparison ? "primary" : "secondary"}
            size="sm"
          >
            📊 {showComparison ? "Ocultar" : "Comparar"} períodos
          </Button>
        </div>

        {/* Panel de métricas generales */}
        {metrics && (
          <div className={`rounded-lg shadow-sm border p-6 ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
            <h3 className={`font-semibold text-lg mb-4 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Métricas Generales
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className={`text-center p-4 rounded-lg ${
                darkMode ? "bg-orange-900/30" : "bg-orange-50"
              }`}>
                <div className={`text-3xl font-bold ${
                  darkMode ? "text-orange-400" : "text-orange-600"
                }`}>
                  🔥 {metrics.streak}
                </div>
                <div className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Racha actual
                </div>
              </div>
              <div className={`text-center p-4 rounded-lg ${
                darkMode ? "bg-green-900/30" : "bg-green-50"
              }`}>
                <div className={`text-3xl font-bold ${
                  darkMode ? "text-green-400" : "text-green-600"
                }`}>
                  {metrics.adherence}%
                </div>
                <div className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Adherencia
                </div>
              </div>
              <div className={`text-center p-4 rounded-lg ${
                darkMode ? "bg-blue-900/30" : "bg-blue-50"
              }`}>
                <div className={`text-3xl font-bold ${
                  darkMode ? "text-blue-400" : "text-blue-600"
                }`}>
                  ✓ {metrics.totalCheckins}
                </div>
                <div className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  Check-ins totales
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparación de períodos */}
        {showComparison && comparison && (
          <div className={`border rounded-lg p-6 ${
            darkMode
              ? "bg-blue-900/30 border-blue-700"
              : "bg-blue-50 border-blue-200"
          }`}>
            <h3 className={`font-semibold text-lg mb-4 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Comparación con período anterior
            </h3>

            {loadingComparison ? (
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Cargando comparación...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Adherencia
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {comparison.current.adherence}%
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        comparison.changes.adherence > 0
                          ? darkMode ? "text-green-400" : "text-green-600"
                          : darkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {comparison.changes.adherence > 0 ? "+" : ""}
                      {comparison.changes.adherence.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <div className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Racha
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {comparison.current.streak}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        comparison.changes.streak > 0
                          ? darkMode ? "text-green-400" : "text-green-600"
                          : darkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {comparison.changes.streak > 0 ? "+" : ""}
                      {comparison.changes.streak}
                    </span>
                  </div>
                </div>

                <div>
                  <div className={`text-sm mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Check-ins
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {comparison.current.totalCheckins}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        comparison.changes.totalCheckins > 0
                          ? darkMode ? "text-green-400" : "text-green-600"
                          : darkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {comparison.changes.totalCheckins > 0 ? "+" : ""}
                      {comparison.changes.totalCheckins}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className={`text-xs mt-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              vs {comparison.previous.from} → {comparison.previous.to}
            </div>
          </div>
        )}

        {/* Lista de hábitos activos */}
        <div className="space-y-4">
          <h2 className={`text-2xl font-semibold ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            Hábitos activos ({filteredActiveHabits.length})
          </h2>

          {filteredActiveHabits.length === 0 ? (
            <div className={`rounded-lg shadow-sm border p-8 text-center ${
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-400"
                : "bg-white border-gray-200 text-gray-500"
            }`}>
              {filterCadence !== "all"
                ? "No hay hábitos con esta cadencia"
                : "Todavía no tenés hábitos — creá el primero 🙂"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActiveHabits.map((habit) => (
                <div
                  key={habit.id}
                  className={`rounded-lg shadow-sm border ${
                    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  {/* Header de la card con info básica */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      {/* Icono y título */}
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-sm shrink-0"
                          style={{ backgroundColor: habit.color || "#3b82f6" }}
                        >
                          {habit.icon || "⭐"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-lg ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}>
                            {habit.title}
                          </div>
                          <div className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}>
                            {habit.cadence} · objetivo: {habit.targetPerDay}/día
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => handleCheckin(habit.id)}
                          disabled={loading}
                          variant="primary"
                          size="sm"
                        >
                          ✓ Check-in
                        </Button>
                        <Button
                          onClick={() => openEditModal(habit)}
                          disabled={loading}
                          variant="ghost"
                          size="sm"
                        >
                          ✏️
                        </Button>
                        <Button
                          onClick={() => handleDelete(habit.id, false)}
                          disabled={loading}
                          variant="ghost"
                          size="sm"
                          title="Archivar"
                        >
                          📦
                        </Button>
                        <Button
                          onClick={() => handleDelete(habit.id, true)}
                          disabled={loading}
                          variant="danger"
                          size="sm"
                          title="Eliminar permanentemente"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>

                    {/* Heatmap estilo GitHub */}
                    <div className={`pt-4 border-t ${
                      darkMode ? "border-gray-700" : "border-gray-200"
                    }`}>
                      <HabitHeatmap
                        data={habitCheckins[habit.id] || {}}
                        from={dateRange.from}
                        to={dateRange.to}
                        color={habit.color || "#3b82f6"}
                        targetPerDay={habit.targetPerDay}
                        darkMode={darkMode}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección de hábitos archivados */}
        {archivedHabits.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-sm hover:opacity-80 mb-2 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {showArchived ? "▼" : "▶"} Hábitos archivados ({archivedHabits.length})
            </button>

            {showArchived && (
              <ul className="space-y-2">
                {archivedHabits.map((h) => (
                  <li
                    key={h.id}
                    className={`flex items-center justify-between border rounded-md p-3 ${
                      darkMode
                        ? "bg-gray-800/50 border-gray-700"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl opacity-60"
                        style={{ backgroundColor: h.color || "#3b82f6" }}
                      >
                        {h.icon || "⭐"}
                      </div>
                      <div className="flex-1">
                        {/* Título del hábito archivado */}
                        <div className={`font-medium opacity-60 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}>
                          {h.title}
                        </div>
                        {/* Información de cadencia */}
                        <div className={`text-sm opacity-50 ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}>
                          {h.cadence} · archivado
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción para archivados */}
                    <div className="flex gap-2">
                      {/* Botón para restaurar */}
                      <button
                        onClick={() => handleRestore(h.id)}
                        className={`border px-3 py-1 rounded-md transition-colors ${
                          darkMode
                            ? "border-gray-600 hover:bg-green-900/30 text-gray-300"
                            : "border-gray-300 hover:bg-green-50 text-gray-700"
                        }`}
                        title="Restaurar"
                      >
                        ♻️ Restaurar
                      </button>

                      {/* Botón para eliminar permanentemente */}
                      <button
                        onClick={() => handleDelete(h.id, true)}
                        className={`border px-3 py-1 rounded-md transition-colors ${
                          darkMode
                            ? "border-gray-600 hover:bg-red-900/30 text-gray-300"
                            : "border-gray-300 hover:bg-red-50 text-gray-700"
                        }`}
                        title="Eliminar permanentemente"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Modal de edición */}
        {editingHabit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg p-6 max-w-md w-full space-y-4 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}>
              <h3 className={`text-xl font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                Editar hábito
              </h3>

              {/* Icono y color */}
              <div className="flex gap-4 items-end">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Icono
                  </label>
                  <IconPicker value={editIcon} onChange={setEditIcon} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Color
                  </label>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </div>
              </div>

              {/* Título */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Título
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  placeholder="Ej: Beber agua"
                  disabled={loading}
                />
              </div>

              {/* Cadencia */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Cadencia
                </label>
                <select
                  value={editCadence}
                  onChange={(e) => setEditCadence(e.target.value as Cadence)}
                  className={`w-full border rounded-md px-3 py-2 ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  disabled={loading}
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Objetivo por día */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Objetivo por día
                </label>
                <input
                  type="number"
                  min="1"
                  value={editTargetPerDay}
                  onChange={(e) => setEditTargetPerDay(Number(e.target.value))}
                  className={`w-full border rounded-md px-3 py-2 ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  disabled={loading}
                />
              </div>

              {/* Mensaje de error */}
              {err && (
                <div className={`text-sm p-2 rounded ${
                  darkMode
                    ? "text-red-300 bg-red-900/30"
                    : "text-red-600 bg-red-50"
                }`}>
                  {err}
                </div>
              )}

              {/* Botones del modal */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeEditModal}
                  disabled={loading}
                  className={`px-4 py-2 border rounded disabled:opacity-50 ${
                    darkMode
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateHabit}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
