"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import type { Routine, RoutineProgress, Habit } from "@/types";
import { useToast } from "@/lib/hooks/useToast";
import { RoutineCard } from "@/components/routines/RoutineCard";
import { getCachedRoutines, setCachedRoutines } from "@/lib/routinesCache";
import { ToastContainer } from "@/components/ui/Toast";

type RoutineWithHabits = Routine & { habits: Habit[]; progress?: RoutineProgress };

export default function RutinasPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [routines, setRoutines] = useState<RoutineWithHabits[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const { toasts, removeToast, success, error: showError } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const loadRoutines = async () => {
    try {
      const cached = getCachedRoutines();
      if (cached?.length) setRoutines(cached as any);
      const res = await fetch("/api/routines");
      if (!res.ok) throw new Error("Error al cargar");
      const data = await res.json();
      const items = data?.data || data || [];
      setRoutines(items);
      setCachedRoutines(items);
      setLoading(false);
      for (const r of items) {
        try {
          const pr = await fetch(`/api/routines/${r.id}/progress?date=${today}`);
          if (pr.ok) {
            const pd = await pr.json();
            setRoutines(prev => prev.map(p => p.id === r.id ? { ...p, progress: pd.data || pd } : p));
          }
        } catch {}
      }
    } catch (e: any) {
      showError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadRoutines();
  }, [isLoaded, isSignedIn]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), daysOfWeek: [], order: 0 }),
      });
      if (!res.ok) throw new Error("Error al crear");
      const data = await res.json();
      const r = data?.data || data;
      setRoutines(prev => [r, ...prev]);
      setNewName(""); setShowCreate(false);
      success("Rutina creada");
      await loadRoutines();
    } catch (e: any) { showError(e.message); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setRoutines(prev => prev.filter(r => r.id !== id));
      success("Eliminada");
    } catch (e: any) { showError(e.message); }
  };

  const handleToggleHabit = async (routineId: number, habitId: number, isChecked: boolean) => {
    try {
      await fetch(`/api/routines/${routineId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, habitId, isChecked }),
      });
    } catch {}
  };

  const todayRoutines = routines.filter(r => {
    if (!r.daysOfWeek?.length) return true;
    const dow = new Date().getDay();
    const adjusted = dow === 0 ? 7 : dow;
    return r.daysOfWeek.includes(adjusted);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--ink)", margin: 0 }}>Rutinas</h1>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
            {todayRoutines.length} para hoy
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--ink)", color: "var(--inverse)",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, lineHeight: 1,
        }}>+</button>
      </div>

      {showCreate && (
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 10, border: "1px solid var(--hairline)", background: "var(--surface)", display: "flex", gap: 10, alignItems: "center" }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
            placeholder="Nombre de la rutina..." style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleCreate} style={{ padding: "6px 14px", borderRadius: 6, background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>Crear</button>
          <button onClick={() => setShowCreate(false)} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", color: "var(--mute)", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancelar</button>
        </div>
      )}

      {loading && <div style={{ padding: "60px 0", textAlign: "center" }}><div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div></div>}

      {!loading && routines.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>No hay rutinas aún</p>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 24px" }}>Creá una rutina para agrupar hábitos diarios</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Inter Tight', sans-serif" }}>Crear rutina</button>
        </div>
      )}

      {!loading && todayRoutines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {todayRoutines.map(r => (
            <RoutineCard key={r.id} routine={r} onToggleHabit={handleToggleHabit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!loading && routines.length > 0 && todayRoutines.length === 0 && (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: 0 }}>Sin rutinas para hoy</p>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
