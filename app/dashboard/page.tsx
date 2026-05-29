"use client";

import { useEffect, useState } from "react";
import type { Habit, TimeRange, Group } from "@/types";
import { format as formatDate, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { getHabits, createHabit as apiCreateHabit, getCheckins } from "@/lib/api";
import { computeStreak } from "@/lib/metrics";
import { useToast } from "@/lib/hooks/useToast";
import { getCachedHabits, cacheHabits, getLocalCheckinsForHabit, saveLocalCheckin } from "@/lib/localCache";
import { getCachedGroups, getCachedHabitGroups } from "@/lib/groupsCache";
import { Stat, Hairline } from "@/components/ui/primitives";
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
  const [habitCheckins, setHabitCheckins] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [streaks, setStreaks] = useState<Record<number, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const today = formatDate(new Date(), "yyyy-MM-dd");
  const activeHabits = habits.filter(h => !h.isArchived);
  const filtered = selectedGroupId
    ? activeHabits.filter(h => getCachedHabitGroups()?.[h.id]?.some(g => g.id === selectedGroupId))
    : activeHabits;

  // Load data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const cached = getCachedHabits();
        let h: Habit[];
        if (cached?.length) { h = cached; setHabits(h); setLoading(false); }
        else { h = await getHabits(); if (cancelled) return; cacheHabits(h); setHabits(h); setLoading(false); }
        const results = await Promise.all(h.map(async habit => {
          const local = getLocalCheckinsForHabit(habit.id);
          const data = await getCheckins({ from: "2020-01-01", to: "2099-12-31", habitId: habit.id });
          const merged = { ...data.data };
          for (const [d, c] of Object.entries(local)) merged[d] = (merged[d] || 0) + c;
          return { id: habit.id, data: merged };
        }));
        const map: Record<number, Record<string, number>> = {};
        for (const r of results) map[r.id] = r.data;
        if (!cancelled) setHabitCheckins(map);
        const cg = getCachedGroups();
        if (cg) setGroups(cg);
      } catch (e: any) { if (!cancelled) setErr(e.message); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Compute streaks
  useEffect(() => {
    const s: Record<number, number> = {};
    for (const h of habits) {
      const checkins = habitCheckins[h.id] || {};
      const dates = Object.entries(checkins).filter(([_, c]) => c > 0).map(([d]) => d);
      s[h.id] = computeStreak(dates, today, { cadence: h.cadence });
    }
    setStreaks(s);
  }, [habits, habitCheckins]);

  const todayCheckins = filtered.reduce((s, h) => s + (habitCheckins[h.id]?.[today] || 0), 0);
  const todayTotal = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
  const bestStreak = Math.max(0, ...Object.values(streaks));

  const handleCheckin = (habitId: number) => {
    saveLocalCheckin(habitId, today, 1);
    setHabitCheckins(prev => ({
      ...prev,
      [habitId]: { ...(prev[habitId] || {}), [today]: (prev[habitId]?.[today] || 0) + 1 }
    }));
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const h = await apiCreateHabit({ title: newTitle.trim(), cadence: "daily", targetPerDay: 1 });
      setHabits(prev => [h, ...prev]);
      setNewTitle(""); setShowCreate(false);
      success("Hábito creado");
    } catch (e: any) { showError(e.message); }
  };

  // Calendar data
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7; // Monday=0

  // 365-day heatmap data
  const heatmapDays = Array.from({ length: 365 }, (_, i) => {
    const d = formatDate(subDays(new Date(), 364 - i), "yyyy-MM-dd");
    const total = filtered.reduce((s, h) => s + (habitCheckins[h.id]?.[d] || 0), 0);
    const target = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
    return { date: d, pct: target > 0 ? Math.min(1, total / target) : 0 };
  });

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
      {!loading && activeHabits.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
          <Stat value={filtered.length} label="Hábitos" size={28} />
          <Stat value={bestStreak} label="Mejor racha" size={28} suffix="días" />
          <Stat value={todayCheckins} label="Hoy" size={28} suffix={`/ ${todayTotal}`} />
        </div>
      )}

      {!loading && activeHabits.length > 0 && <Hairline />}

      {/* View toggle */}
      {!loading && activeHabits.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 24, marginBottom: 24 }}>
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
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && !loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.map(habit => {
            const streak = streaks[habit.id] || 0;
            const checkins = habitCheckins[habit.id] || {};
            const done = (checkins[today] || 0) >= (habit.targetPerDay || 1);
            return (
              <div key={habit.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer" }}>
                <button onClick={() => handleCheckin(habit.id)} style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: done ? "none" : "1.5px solid var(--faint)",
                  background: done ? "var(--ink)" : "transparent",
                  cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {done && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="var(--inverse)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <span style={{ flex: 1, fontSize: 14, color: done ? "var(--mute)" : "var(--ink)", textDecoration: done ? "line-through" : "none", textDecorationColor: "var(--faint)" }}>{habit.title}</span>
                {streak > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.08em" }}>{streak}d</span>}
                {checkins[today] > 1 && <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>×{checkins[today]}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* HEATMAP VIEW — GitHub-style 365 days */}
      {viewMode === "heatmap" && !loading && (
        <div style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 20, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {/* Weekday labels */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 6 }}>
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="mono" style={{ fontSize: 8, color: "var(--faint)", height: 10, width: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i % 2 === 0 ? d : ""}
                </span>
              ))}
            </div>
            {/* Heatmap grid (53 columns ≈ 1 year) */}
            {Array.from({ length: 53 }, (_, col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {WEEKDAYS.map((_, row) => {
                  const idx = col * 7 + row - (7 - (365 % 7 === 0 ? 7 : 365 % 7)) + (7 - (new Date().getDay() === 0 ? 7 : new Date().getDay()));
                  if (idx < 0 || idx >= 365) return <div key={row} style={{ width: 10, height: 10 }} />;
                  const day = heatmapDays[idx];
                  if (!day) return <div key={row} style={{ width: 10, height: 10 }} />;
                  const opacity = day.pct === 0 ? 0.08 : day.pct >= 1 ? 1 : 0.15 + day.pct * 0.6;
                  return (
                    <div key={row} title={`${day.date}: ${Math.round(day.pct * 100)}%`} style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: `rgba(0,0,0,${opacity})`,
                      ...(document.documentElement.getAttribute("data-theme") === "dark" ? { background: `rgba(255,255,255,${opacity})` } : {}),
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 8, color: "var(--faint)" }}>Menos</span>
            {[0.08, 0.25, 0.5, 0.75, 1].map(o => (
              <div key={o} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(0,0,0,${o})` }} />
            ))}
            <span className="mono" style={{ fontSize: 8, color: "var(--faint)" }}>Más</span>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW — current month */}
      {viewMode === "calendar" && !loading && (
        <div style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 20 }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", textAlign: "center", marginBottom: 16 }}>
            {formatDate(monthStart, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {WEEKDAYS.map(d => (
              <div key={d} className="mono" style={{ fontSize: 9, color: "var(--faint)", textAlign: "center", padding: "4px 0", letterSpacing: "0.06em" }}>{d}</div>
            ))}
            {/* Padding */}
            {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
            {/* Days */}
            {monthDays.map(day => {
              const d = formatDate(day, "yyyy-MM-dd");
              const total = filtered.reduce((s, h) => s + (habitCheckins[h.id]?.[d] || 0), 0);
              const target = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
              const pct = target > 0 ? Math.min(1, total / target) : 0;
              const isToday = d === today;
              return (
                <div key={d} style={{
                  padding: "6px 4px", borderRadius: 6, textAlign: "center",
                  background: pct >= 1 ? "var(--ink)" : pct > 0 ? "var(--hairline)" : "transparent",
                  border: isToday ? "1.5px solid var(--ink)" : "1px solid transparent",
                  color: pct >= 1 ? "var(--inverse)" : "var(--ink)",
                  fontSize: 12,
                }}>{formatDate(day, "d")}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && activeHabits.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>No hay hábitos aún</p>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 24px" }}>Creá tu primer hábito para empezar a trackear</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Inter Tight', sans-serif" }}>Crear hábito</button>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
