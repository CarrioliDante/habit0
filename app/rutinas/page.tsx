"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import type { Routine, RoutineProgress, Habit } from "@/types";
import { useToast } from "@/lib/hooks/useToast";
import { RoutineCard } from "@/components/routines/RoutineCard";
import { getCachedRoutines, setCachedRoutines, removeRoutineFromCache } from "@/lib/routinesCache";
import { addToRoutinesSyncQueue, processRoutinesSyncQueue } from "@/lib/routinesSyncQueue";
import { ToastContainer } from "@/components/ui/Toast";

type RoutineWithHabits = Routine & { habits: Habit[]; progress?: RoutineProgress };

export default function RutinasPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [routines, setRoutines] = useState<RoutineWithHabits[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, removeToast, success, error: showError } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    async function load() {
      try {
        const cached = getCachedRoutines();
        if (cached && cached.length > 0) {
          setRoutines(cached as any);
          setLoading(false);
        }
        const res = await fetch("/api/routines");
        if (!res.ok) throw new Error("Error al cargar rutinas");
        const data = await res.json();
        const items = data?.data || data || [];
        if (!cancelled) {
          setRoutines(items);
          setCachedRoutines(items);
          setLoading(false);
        }
        // Load progress
        for (const r of items) {
          try {
            const pr = await fetch(`/api/routines/${r.id}/progress?date=${today}`);
            if (pr.ok) {
              const pd = await pr.json();
              if (!cancelled) setRoutines(prev => prev.map(p => p.id === r.id ? { ...p, progress: pd.data || pd } : p));
            }
          } catch {}
        }
      } catch (e: any) {
        if (!cancelled) showError(e.message);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, today]);

  const handleToggleHabit = async (routineId: number, habitId: number, isChecked: boolean) => {
    try {
      const res = await fetch(`/api/routines/${routineId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, habitId, isChecked }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
    } catch {
      // Refresh progress on error
      const pr = await fetch(`/api/routines/${routineId}/progress?date=${today}`);
      if (pr.ok) {
        const pd = await pr.json();
        setRoutines(prev => prev.map(p => p.id === routineId ? { ...p, progress: pd.data || pd } : p));
      }
    }
  };

  const todayRoutines = routines.filter(r => {
    if (!r.daysOfWeek || r.daysOfWeek.length === 0) return true;
    const dow = new Date().getDay(); // 0=dom
    const adjusted = dow === 0 ? 7 : dow; // 1=lun..7=dom
    return r.daysOfWeek.includes(adjusted);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--ink)", margin: 0 }}>
            Rutinas
          </h1>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
            {todayRoutines.length} para hoy
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div>
        </div>
      )}

      {!loading && routines.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>No hay rutinas aún</p>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: 0 }}>Creá rutinas desde la API por ahora</p>
        </div>
      )}

      {!loading && todayRoutines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {todayRoutines.map(r => (
            <RoutineCard key={r.id} routine={r} onToggleHabit={handleToggleHabit} />
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
