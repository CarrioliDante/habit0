"use client";

import { useEffect, useState, useMemo } from "react";
import type { Habit, Group } from "@/types";
import { format as formatDate, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { getHabits, createHabit as apiCreateHabit, deleteHabit, updateHabit, getCheckins, getAnalyticsOverview } from "@/lib/api";
import { computeStreak } from "@/lib/metrics";
import { useToast } from "@/lib/hooks/useToast";
import { getCachedHabits, cacheHabits, getLocalCheckinsForHabit, saveLocalCheckin } from "@/lib/localCache";
import { getCachedGroups, getCachedHabitGroups } from "@/lib/groupsCache";
import { Stat, Hairline } from "@/components/ui/primitives";
import { GroupFilter } from "@/components/groups/GroupFilter";
import { ToastContainer } from "@/components/ui/Toast";

type ViewMode = "list" | "heatmap" | "calendar";
const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "list", label: "Lista" },
  { value: "heatmap", label: "Heatmap" },
  { value: "calendar", label: "Calendario" },
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function Dashboard() {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const today = formatDate(new Date(), "yyyy-MM-dd");
  const active = habits.filter(h => !h.isArchived);

  // Reapply theme on mount
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    setTheme((t === "dark" ? "dark" : "light"));
    const obs = new MutationObserver(() => {
      const nt = document.documentElement.getAttribute("data-theme");
      setTheme((nt === "dark" ? "dark" : "light"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Group-filtered habits
  const filtered = useMemo(() => {
    if (!selectedGroupId) return active;
    const hgs = getCachedHabitGroups();
    return active.filter(h => hgs?.[h.id]?.some(g => g.id === selectedGroupId));
  }, [active, selectedGroupId]);

  // Load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const cached = getCachedHabits();
        let h: Habit[];
        if (cached?.length) { h = cached; setHabits(h); }
        else { h = await getHabits(); if (cancelled) return; cacheHabits(h); setHabits(h); }
        setLoading(false);
        const results = await Promise.all(h.map(async habit => {
          const local = getLocalCheckinsForHabit(habit.id);
          const data = await getCheckins({ from: "2020-01-01", to: "2099-12-31", habitId: habit.id });
          const m = { ...data.data };
          for (const [d, c] of Object.entries(local)) m[d] = (m[d] || 0) + c;
          return { id: habit.id, data: m };
        }));
        const map: Record<number, Record<string, number>> = {};
        for (const r of results) map[r.id] = r.data;
        if (!cancelled) setCheckins(map);
        const cg = getCachedGroups();
        if (cg) setGroups(cg);
      } catch (e: any) { if (!cancelled) setErr(e.message); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Streaks
  const streaks = useMemo(() => {
    const s: Record<number, number> = {};
    for (const h of habits) {
      const c = checkins[h.id] || {};
      const dates = Object.entries(c).filter(([, v]) => v > 0).map(([d]) => d);
      s[h.id] = computeStreak(dates, today, { cadence: h.cadence });
    }
    return s;
  }, [habits, checkins]);

  const todayDone = filtered.reduce((s, h) => s + (checkins[h.id]?.[today] || 0), 0);
  const todayTotal = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
  const bestStreak = Math.max(0, ...Object.values(streaks));

  // Checkin — optimistic + sync
  const handleCheckin = async (habitId: number) => {
    const newCount = (checkins[habitId]?.[today] || 0) + 1;
    saveLocalCheckin(habitId, today, 1);
    setCheckins(prev => ({ ...prev, [habitId]: { ...(prev[habitId] || {}), [today]: newCount } }));
    try {
      await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: today, count: 1 }),
      });
      success("✓");
    } catch {
      setCheckins(prev => ({ ...prev, [habitId]: { ...(prev[habitId] || {}), [today]: (prev[habitId]?.[today] || 1) - 1 } }));
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const h = await apiCreateHabit({ title: newTitle.trim(), cadence: "daily", targetPerDay: 1 });
      setHabits(prev => [h, ...prev]);
      setNewTitle(""); setShowCreate(false);
      success("Creado");
    } catch (e: any) { showError(e.message); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHabit(id, true);
      setHabits(prev => prev.filter(h => h.id !== id));
      success("Eliminado");
    } catch (e: any) { showError(e.message); }
  };

  // Heatmap data: last 365 days of aggregated progress
  const heatmapDays = useMemo(() =>
    Array.from({ length: 365 }, (_, i) => {
      const d = formatDate(subDays(new Date(), 364 - i), "yyyy-MM-dd");
      const total = filtered.reduce((s, h) => s + (checkins[h.id]?.[d] || 0), 0);
      const target = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
      return { date: d, pct: target > 0 ? Math.min(1, total / target) : 0 };
    }), [filtered, checkins]);

  // Calendar: current month
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--ink)", margin: 0 }}>Inicio</h1>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
            {formatDate(new Date(), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--ink)", color: "var(--inverse)",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, lineHeight: 1, transition: "transform 120ms ease",
        }}>+</button>
      </div>

      {/* Quick create */}
      {showCreate && (
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 10, border: "1px solid var(--hairline)", background: "var(--surface)", display: "flex", gap: 10, alignItems: "center" }}>
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
            placeholder="Nombre del hábito..." style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleCreate} style={{ padding: "6px 14px", borderRadius: 6, background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>Crear</button>
          <button onClick={() => setShowCreate(false)} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", color: "var(--mute)", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancelar</button>
        </div>
      )}

      {loading && <div style={{ padding: "60px 0", textAlign: "center" }}><div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div></div>}
      {err && <div style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--hairline2)", marginBottom: 20 }}><p className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: 0 }}>{err}</p></div>}

      {/* Stats */}
      {!loading && active.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
          <Stat value={active.length} label="Hábitos" size={28} />
          <Stat value={bestStreak} label="Mejor racha" size={28} suffix="días" />
          <Stat value={todayDone} label="Hoy" size={28} suffix={`/ ${todayTotal}`} />
        </div>
      )}

      {!loading && active.length > 0 && <Hairline />}

      {/* Group filter + view toggle */}
      {!loading && active.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          {groups.length > 0 && <GroupFilter groups={groups} selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            {VIEWS.map(v => (
              <button key={v.value} onClick={() => setViewMode(v.value)} className="mono" style={{
                padding: "4px 12px", borderRadius: 6,
                border: viewMode === v.value ? "1px solid var(--hairline2)" : "1px solid transparent",
                background: viewMode === v.value ? "var(--whisper)" : "transparent",
                color: viewMode === v.value ? "var(--ink)" : "var(--mute)",
                fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 120ms ease",
              }}>{v.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && !loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.map(habit => {
            const s = streaks[habit.id] || 0;
            const c = checkins[habit.id] || {};
            const done = (c[today] || 0) >= (habit.targetPerDay || 1);
            return (
              <div key={habit.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8 }}>
                <button onClick={() => handleCheckin(habit.id)} style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: done ? "none" : "1.5px solid var(--faint)",
                  background: done ? "var(--ink)" : "transparent",
                  cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 150ms ease",
                }}>
                  {done && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="var(--inverse)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <span style={{ flex: 1, fontSize: 14, color: done ? "var(--mute)" : "var(--ink)", textDecoration: done ? "line-through" : "none", textDecorationColor: "var(--faint)" }}>{habit.title}</span>
                {s > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.08em" }}>{s}d</span>}
                {c[today] > 1 && <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>×{c[today]}</span>}
                <button onClick={() => handleDelete(habit.id)} className="row-hover" style={{ padding: "2px 6px", borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)", fontSize: 16, lineHeight: 1 }} title="Eliminar">×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* HEATMAP */}
      {viewMode === "heatmap" && !loading && (
        <div style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 20, overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 3, minWidth: 530 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 6, paddingTop: 2 }}>
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="mono" style={{ fontSize: 8, color: "var(--faint)", height: 10, width: 12, display: "flex", alignItems: "center" }}>
                  {i % 2 === 0 ? d : ""}
                </span>
              ))}
            </div>
            {Array.from({ length: 53 }, (_, col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {Array.from({ length: 7 }, (_, row) => {
                  const idx = col * 7 + row;
                  if (idx >= heatmapDays.length) return <div key={row} style={{ width: 10, height: 10 }} />;
                  const day = heatmapDays[idx];
                  // Scale opacity: 0 → whisper, 1 → ink
                  const isDark = theme === "dark";
                  const r = isDark ? 244 : 0;
                  const g = isDark ? 243 : 0;
                  const b = isDark ? 238 : 0;
                  const alpha = day.pct === 0 ? 0.08 : day.pct >= 1 ? 1 : 0.15 + day.pct * 0.7;
                  return (
                    <div key={row} title={`${day.date}: ${Math.round(day.pct * 100)}%`} style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: `rgba(${r},${g},${b},${alpha})`,
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 10 }}>
            <span className="mono" style={{ fontSize: 8, color: "var(--faint)" }}>Menos</span>
            {[0.08, 0.25, 0.5, 0.75, 1].map(o => {
              const isDark = theme === "dark";
              const r = isDark ? 244 : 0; const g = isDark ? 243 : 0; const b_ = isDark ? 238 : 0;
              return <div key={o} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(${r},${g},${b_},${o})` }} />;
            })}
            <span className="mono" style={{ fontSize: 8, color: "var(--faint)" }}>Más</span>
          </div>
        </div>
      )}

      {/* CALENDAR */}
      {viewMode === "calendar" && !loading && (
        <div style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 20 }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", textAlign: "center", marginBottom: 16 }}>
            {formatDate(monthStart, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {WEEKDAYS.map(d => <div key={d} className="mono" style={{ fontSize: 9, color: "var(--faint)", textAlign: "center", padding: "4px 0", letterSpacing: "0.06em" }}>{d}</div>)}
            {Array.from({ length: startPad }, (_, i) => <div key={`p${i}`} />)}
            {monthDays.map(day => {
              const d = formatDate(day, "yyyy-MM-dd");
              const total = filtered.reduce((s, h) => s + (checkins[h.id]?.[d] || 0), 0);
              const target = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
              const pct = target > 0 ? Math.min(1, total / target) : 0;
              const isToday = d === today;
              return (
                <div key={d} style={{
                  padding: "8px 4px", borderRadius: 8, textAlign: "center",
                  background: pct >= 1 ? "var(--ink)" : pct > 0 ? "var(--hairline)" : "transparent",
                  border: isToday ? "1.5px solid var(--ink)" : "1px solid transparent",
                  color: pct >= 1 ? "var(--inverse)" : "var(--ink)",
                  fontSize: 13, fontWeight: isToday ? 600 : 400,
                  transition: "all 120ms ease",
                }}>{formatDate(day, "d")}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && active.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>No hay hábitos aún</p>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 24px" }}>Creá tu primer hábito para empezar</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Inter Tight', sans-serif" }}>Crear hábito</button>
        </div>
      )}

      {filtered.length === 0 && active.length > 0 && !loading && (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: 0 }}>Sin resultados para este grupo</p>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
