"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import * as LucideIcons from "lucide-react";
import type { Routine, RoutineProgress, Habit, ApiResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/hooks/useToast";
import { Navigation } from "@/components/ui/Navigation";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { RoutineCard } from "@/components/routines/RoutineCard";
import { getCachedRoutines, setCachedRoutines, removeRoutineFromCache } from "@/lib/routinesCache";
import { addToRoutinesSyncQueue, processRoutinesSyncQueue } from "@/lib/routinesSyncQueue";

type RoutineWithHabits = Routine & {
  habits: Habit[];
  progress?: RoutineProgress;
};

export default function RutinasPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [darkMode, setDarkMode] = useState(false);
  const [routines, setRoutines] = useState<RoutineWithHabits[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const selectedDate = format(new Date(), "yyyy-MM-dd");
  const { success, error: showError } = useToast();

  // Detectar dark mode
  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(isDark);
  }, []);

  // Cargar hábitos activos
  const loadHabits = useCallback(async () => {
    try {
      const response = await fetch("/api/habits");
      const json: ApiResponse<Habit[]> = await response.json();
      if (json.success && json.data) {
        const activeHabits = json.data.filter(h => !h.isArchived);
        setHabits(activeHabits);
      }
    } catch (error) {
      console.error("Error loading habits:", error);
    }
  }, []);

  // Cargar rutinas del día actual con offline-first
  const loadRoutines = useCallback(async () => {
    const dayOfWeek = getDay(new Date(selectedDate));
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

    // 1) Cargar desde caché primero (instantáneo) si existe
    const cached = getCachedRoutines();
    if (cached && cached.length > 0) {
      // Filtrar rutinas temporales (con ID negativo) del caché
      const validCached = cached.filter(r => r.id > 0);

      const todayRoutines = showAllDays
        ? validCached
        : validCached.filter((routine) => {
            const hasNoDays = !routine.daysOfWeek || routine.daysOfWeek.length === 0;
            const includesDay = routine.daysOfWeek?.includes?.(adjustedDay);
            return hasNoDays || includesDay || false;
          });

      // Cargar progreso y hábitos para las rutinas del caché
      const routinesWithData = await Promise.all(
        todayRoutines.map(async (routine) => {
          let habits: Habit[] = [];
          let progress: RoutineProgress | undefined = undefined;

          try {
            const habitsResponse = await fetch(`/api/routines/${routine.id}/habits`);
            if (habitsResponse.ok) {
              const habitsJson = await habitsResponse.json();
              if (habitsJson.success && habitsJson.data) {
                habits = habitsJson.data;
              }
            }
          } catch (error) {
            console.error(`Error loading habits for routine ${routine.id}:`, error);
          }

          try {
            const progressResponse = await fetch(
              `/api/routines/${routine.id}/progress?date=${selectedDate}`
            );
            if (progressResponse.ok) {
              const progressJson = await progressResponse.json();
              if (progressJson.success && progressJson.data) {
                progress = progressJson.data;
              }
            }
          } catch (error) {
            console.error(`Error loading progress for routine ${routine.id}:`, error);
          }

          return { ...routine, habits, progress };
        })
      );

      setRoutines(routinesWithData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2) Siempre revalidar desde la API
    try {
      const response = await fetch("/api/routines");
      const json: ApiResponse<Routine[]> = await response.json();

      if (!json.success || !json.data) {
        throw new Error(json.error || "Error al cargar rutinas");
      }

      // Guardar en caché (solo rutinas reales, sin temporales)
      const realRoutines = json.data.filter(r => r.id > 0);
      setCachedRoutines(realRoutines);

      const todayRoutines = showAllDays
        ? realRoutines
        : realRoutines.filter((routine) => {
            const hasNoDays = !routine.daysOfWeek || routine.daysOfWeek.length === 0;
            const includesDay = routine.daysOfWeek?.includes?.(adjustedDay);
            return hasNoDays || includesDay || false;
          });

      const routinesWithData = await Promise.all(
        todayRoutines.map(async (routine) => {
          const habitsResponse = await fetch(`/api/routines/${routine.id}/habits`);
          const habitsJson: ApiResponse<Habit[]> = await habitsResponse.json();
          const habits = habitsJson.success && habitsJson.data ? habitsJson.data : [];

          const progressResponse = await fetch(
            `/api/routines/${routine.id}/progress?date=${selectedDate}`
          );
          const progressJson: ApiResponse<RoutineProgress> = await progressResponse.json();
          const progress = progressJson.success ? progressJson.data : undefined;

          return { ...routine, habits, progress };
        })
      );

      setRoutines(routinesWithData);
    } catch (error) {
      console.error("Error loading routines:", error);
      // Si falla y no hay caché, mostrar error
      if (!cached || cached.length === 0) {
        showError("Error al cargar rutinas");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showError, showAllDays]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Limpiar caché de rutinas temporales/duplicadas al iniciar
      const cached = getCachedRoutines();
      if (cached) {
        const validRoutines = cached.filter(r => r.id > 0);
        const seen = new Set<number>();
        const deduplicated = validRoutines.filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        if (deduplicated.length !== cached.length) {
          setCachedRoutines(deduplicated);
        }
      }

      loadHabits();
      loadRoutines();

      // Procesar cola de sincronización en segundo plano
      processRoutinesSyncQueue().catch((error) => {
        console.error("Error processing routines sync queue:", error);
      });
    }
  }, [isLoaded, isSignedIn, loadHabits, loadRoutines]);

  // Crear rutina con offline-first
  const handleCreateRoutine = async (data: {
    name: string;
    description?: string;
    daysOfWeek: number[];
    icon?: string;
    color?: string;
    habitIds?: number[];
  }) => {
    const tempId = -Date.now(); // ID temporal negativo
    const tempRoutine: Routine = {
      id: tempId,
      userId: -1,
      name: data.name,
      description: data.description,
      daysOfWeek: data.daysOfWeek,
      icon: data.icon || "ListChecks",
      color: data.color || "#22C55E",
      order: routines.length,
      createdAt: new Date().toISOString(),
    };

    // 1) Agregar a la UI inmediatamente (optimistic update)
    const newRoutineWithHabits: RoutineWithHabits = {
      ...tempRoutine,
      habits: [],
      progress: undefined,
    };
    setRoutines((prev) => [...prev, newRoutineWithHabits]);

    // 2) Cerrar modal
    setShowCreateModal(false);
    success("Rutina creada correctamente");

    // 3) Agregar a cola de sincronización
    addToRoutinesSyncQueue({
      type: "create",
      data: {
        name: data.name,
        description: data.description,
        daysOfWeek: data.daysOfWeek,
        icon: data.icon,
        color: data.color,
        order: routines.length,
        tempId: String(tempId),
        habitIds: data.habitIds,
      },
    });

    // 4) Sincronizar en background
    try {
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          daysOfWeek: data.daysOfWeek,
          icon: data.icon,
          color: data.color,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const newRoutine = json.data as Routine;

        // Asignar hábitos si hay
        if (data.habitIds && data.habitIds.length > 0) {
          await Promise.all(
            data.habitIds.map((habitId) =>
              fetch(`/api/routines/${newRoutine.id}/habits`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ habitId }),
              })
            )
          );
        }

        // Cargar hábitos y progreso para la nueva rutina
        try {
          const habitsResponse = await fetch(`/api/routines/${newRoutine.id}/habits`);
          const habitsJson: ApiResponse<Habit[]> = await habitsResponse.json();
          const habits = habitsJson.success && habitsJson.data ? habitsJson.data : [];

          const progressResponse = await fetch(
            `/api/routines/${newRoutine.id}/progress?date=${selectedDate}`
          );
          const progressJson: ApiResponse<RoutineProgress> = await progressResponse.json();
          const progress = progressJson.success ? progressJson.data : undefined;

          const completeRoutine = { ...newRoutine, habits, progress };

          // Reemplazar la rutina temporal con la real completa en el estado
          setRoutines((prev) =>
            prev.map((r) => (r.id === tempId ? completeRoutine : r))
          );

          // Actualizar caché con la nueva rutina real
          const cached = getCachedRoutines() || [];
          const updatedCache = cached.filter(r => r.id !== tempId && r.id !== newRoutine.id);
          updatedCache.push(newRoutine);
          setCachedRoutines(updatedCache);
        } catch (error) {
          console.error("Error loading routine details:", error);
        }
      }
    } catch (error) {
      console.error("Error creating routine:", error);
      // La cola de sincronización lo reintentará
    }
  };

  // Marcar/desmarcar hábito en rutina (offline-first)
  const handleToggleHabit = async (routineId: number, habitId: number, isChecked: boolean) => {
    // La actualización optimista ya se hace en el componente RoutineCard
    // Aquí solo sincronizamos con el servidor en background usando el API de checkins
    try {
      const response = await fetch("/api/checkins", {
        method: isChecked ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          habitId,
          count: isChecked ? 1 : 0, // 1 para marcar, 0 para desmarcar
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to sync habit toggle:", errorData);
      }
    } catch (error) {
      console.error("Error toggling habit:", error);
    }
  };

  // Eliminar rutina
  const handleDeleteRoutine = async (routineId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta rutina?")) return;

    // 1) Eliminar optimistamente
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    removeRoutineFromCache(routineId);

    // 2) Agregar a cola de sincronización
    addToRoutinesSyncQueue({ type: "delete", routineId });

    // 3) Sincronizar en background
    try {
      await fetch(`/api/routines/${routineId}`, { method: "DELETE" });
      success("Rutina eliminada");
    } catch (error) {
      console.error("Error deleting routine:", error);
      // La cola de sincronización lo reintentará
    }
  };

  // Editar rutina (offline-first)
  const handleEditRoutine = async (data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    daysOfWeek: number[];
    habitIds?: number[];
  }) => {
    if (!editingRoutine) return;

    // Find the current routine with habits from the routines list
    const currentRoutine = routines.find(r => r.id === editingRoutine.id);

    const updatedRoutine: RoutineWithHabits = {
      ...editingRoutine,
      name: data.name,
      description: data.description,
      color: data.color || editingRoutine.color,
      icon: data.icon || editingRoutine.icon,
      daysOfWeek: data.daysOfWeek,
      habits: currentRoutine?.habits || [],
    };

    // 1) Actualizar optimistamente
    setRoutines((prev) =>
      prev.map((r) => (r.id === editingRoutine.id ? updatedRoutine : r))
    );

    // 2) Actualizar cache
    const cached = getCachedRoutines();
    if (cached) {
      const updatedList = cached.map((r) =>
        r.id === editingRoutine.id ? updatedRoutine : r
      );
      setCachedRoutines(updatedList);
    }

    // 3) Agregar a cola de sincronización
    addToRoutinesSyncQueue({
      type: "update",
      routineId: editingRoutine.id,
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        daysOfWeek: data.daysOfWeek,
      },
    });

    // 4) Cerrar modal
    setEditingRoutine(null);

    // 5) Sincronizar en background
    try {
      const response = await fetch(`/api/routines/${editingRoutine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error("Failed to update routine");
        return;
      }

      // Actualizar la lista completa
      loadRoutines();
      success("Rutina actualizada");
    } catch (error) {
      console.error("Error updating routine:", error);
      // La cola de sincronización lo reintentará
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Debes iniciar sesión</div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode
          ? "bg-linear-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-linear-to-br from-white via-gray-50 to-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        {/* Navigation Component */}
        <Navigation darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

        {/* Header - responsive */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Rutinas
              </h1>
              <p className={`text-sm sm:text-base ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: es })}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                {showAllDays
                  ? "Mostrando todas las rutinas"
                  : `Mostrando rutinas para hoy (día ${getDay(new Date(selectedDate)) === 0 ? 7 : getDay(new Date(selectedDate))})`
                }
              </p>
            </div>

            {/* Toggle para mostrar todas o solo de hoy - responsive */}
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                showAllDays
                  ? darkMode
                    ? "bg-green-500 text-white"
                    : "bg-green-500 text-white"
                  : darkMode
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {showAllDays ? (
                <>
                  <LucideIcons.Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Ver solo hoy</span>
                  <span className="xs:hidden">Hoy</span>
                </>
              ) : (
                <>
                  <LucideIcons.CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Ver todas</span>
                  <span className="xs:hidden">Todas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Cargando rutinas...</div>
          </div>
        ) : routines.length === 0 ? (
          <div
            className={`text-center py-12 rounded-xl border ${
              darkMode
                ? "bg-gray-800/50 border-gray-700/50"
                : "bg-white/50 border-gray-200/50"
            }`}
          >
            <LucideIcons.ListChecks
              className={`w-16 h-16 mx-auto mb-4 ${
                darkMode ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <p className={`text-lg mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              No tienes rutinas para hoy
            </p>
            <p className={darkMode ? "text-gray-500" : "text-gray-500"}>
              Crea rutinas y asígnalas a días específicos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                darkMode={darkMode}
                onToggleHabit={handleToggleHabit}
                onEdit={(r) => setEditingRoutine(r)}
                onDelete={handleDeleteRoutine}
              />
            ))}
          </div>
        )}

        {/* Botón para crear rutina - responsive */}
        <div className="mt-6 sm:mt-8 flex justify-center">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base px-4 sm:px-6"
          >
            <LucideIcons.Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Nueva Rutina
          </Button>
        </div>

        {/* Modal de creación */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Nueva Rutina"
            maxWidth="lg"
          >
            <RoutineForm
              onSubmit={handleCreateRoutine}
              onCancel={() => setShowCreateModal(false)}
              loading={loading}
              darkMode={darkMode}
              habits={habits}
            />
          </Modal>
        )}

        {/* Modal de edición */}
        {editingRoutine && (
          <Modal
            isOpen={!!editingRoutine}
            onClose={() => setEditingRoutine(null)}
            title="Editar Rutina"
            maxWidth="lg"
          >
            <RoutineForm
              routine={editingRoutine}
              onSubmit={handleEditRoutine}
              onCancel={() => setEditingRoutine(null)}
              loading={loading}
              darkMode={darkMode}
              habits={habits}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}

// Componente RoutineCard movido a /components/routines/RoutineCard.tsx
