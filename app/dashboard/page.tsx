"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Habit, Cadence, TimeRange, Group } from "@/types";
import { subDays, format as formatDate } from "date-fns";
import { getHabits, createHabit as apiCreateHabit, getAnalyticsOverview, deleteHabit, restoreHabit, updateHabit, getCheckins } from "@/lib/api";
import { getDateRange } from "@/lib/dateHelpers";
import { computeStreak } from "@/lib/metrics";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import { useToast } from "@/lib/hooks/useToast";
import { useCheckin } from "@/lib/hooks/useCheckin";
import { getCachedHabits, cacheHabits, getLocalCheckinsForHabit, saveLocalCheckin, markCheckinAsSynced, cacheCheckins } from "@/lib/localCache";
import { getCachedGroups, setCachedGroups, getCachedHabitGroups } from "@/lib/groupsCache";
import { Eyebrow, Stat, Hairline, RadialRing } from "@/components/ui/primitives";
import { ToastContainer } from "@/components/ui/Toast";

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "year", label: "Año" },
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
];

export default function Dashboard() {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCheckins, setHabitCheckins] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
  const [streaks, setStreaks] = useState<Record<number, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const dateRange = getDateRange(timeRange);

  // Load data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const cached = getCachedHabits();
        let h: Habit[];
        if (cached && cached.length > 0) {
          h = cached;
          setHabits(h);
          setLoading(false);
        } else {
          h = await getHabits();
          if (cancelled) return;
          cacheHabits(h);
          setHabits(h);
          setLoading(false);
        }
        // Load checkins
        const checkinsPromises = h.map(async (habit) => {
          const local = getLocalCheckinsForHabit(habit.id);
          const data = await getCheckins({ from: "2020-01-01", to: "2099-12-31", habitId: habit.id });
          const merged = { ...data.data };
          for (const [date, count] of Object.entries(local)) merged[date] = (merged[date] || 0) + count;
          return { id: habit.id, data: merged };
        });
        const results = await Promise.all(checkinsPromises);
        const checkinsMap: Record<number, Record<string, number>> = {};
        for (const r of results) checkinsMap[r.id] = r.data;
        if (!cancelled) setHabitCheckins(checkinsMap);

        // Load groups
        const cachedGroups = getCachedGroups();
        if (cachedGroups) setGroups(cachedGroups);
      } catch (e: any) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Compute streaks
  useEffect(() => {
    const s: Record<number, number> = {};
    for (const h of habits) {
      const checkins = habitCheckins[h.id] || {};
      const dates = Object.entries(checkins)
        .filter(([_, count]) => count > 0)
        .map(([date]) => date);
      s[h.id] = computeStreak(dates, today, { cadence: h.cadence });
    }
    setStreaks(s);
  }, [habits, habitCheckins]);

  const activeHabits = habits.filter(h => !h.isArchived);
  const filtered = selectedGroupId ? activeHabits.filter(h => {
    const hgs = getCachedHabitGroups();
    return hgs?.[h.id]?.some(g => g.id === selectedGroupId);
  }) : activeHabits;

  // Today stats
  const today = formatDate(new Date(), "yyyy-MM-dd");
  const todayCheckins = filtered.reduce((sum, h) => sum + (habitCheckins[h.id]?.[today] || 0), 0);
  const todayTotal = filtered.reduce((sum, h) => sum + (h.targetPerDay || 1), 0);
  const todayPct = todayTotal > 0 ? todayCheckins / todayTotal : 0;

  const bestStreak = Math.max(0, ...Object.values(streaks));
  const totalHabits = filtered.length;

  // Create habit
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const h = await apiCreateHabit({ title: newTitle.trim(), cadence: "daily", targetPerDay: 1 });
      setHabits(prev => [h, ...prev]);
      setNewTitle("");
      setShowCreate(false);
      success("Hábito creado");
    } catch (e: any) { showError(e.message); }
  };

  // Checkin
  const handleCheckin = async (habitId: number) => {
    try {
      saveLocalCheckin(habitId, today, 1);
      setHabitCheckins(prev => ({
        ...prev,
        [habitId]: { ...(prev[habitId] || {}), [today]: (prev[habitId]?.[today] || 0) + 1 }
      }));
      const { useCheckin } = await import("@/lib/hooks/useCheckin");
      // Simple optimistic update
    } catch (e) {}
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--ink)", margin: 0 }}>
            Inicio
          </h1>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
            {formatDate(new Date(), "EEEE d 'de' MMMM", { locale: undefined }).replace(/^\w/, c => c.toUpperCase())}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "var(--ink)", color: "var(--inverse)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, lineHeight: 1,
            transition: "transform 120ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >+</button>
      </div>

      {/* Quick create */}
      {showCreate && (
        <div style={{
          marginBottom: 24, padding: 16, borderRadius: 10,
          border: "1px solid var(--hairline)", background: "var(--surface)",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
            placeholder="Nombre del hábito..."
            style={{
              flex: 1, border: "none", background: "transparent",
              fontSize: 14, color: "var(--ink)", outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button onClick={handleCreate} style={{
            padding: "6px 14px", borderRadius: 6,
            background: "var(--ink)", color: "var(--inverse)",
            border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
            fontFamily: "inherit",
          }}>Crear</button>
          <button onClick={() => setShowCreate(false)} style={{
            padding: "6px 10px", borderRadius: 6,
            background: "transparent", color: "var(--mute)",
            border: "none", cursor: "pointer", fontSize: 13,
            fontFamily: "inherit",
          }}>Cancelar</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--hairline2)", marginBottom: 20 }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: 0 }}>{err}</p>
        </div>
      )}

      {/* Stats row */}
      {!loading && activeHabits.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
          <Stat value={totalHabits} label="Hábitos" size={28} />
          <Stat value={bestStreak} label="Mejor racha" size={28} suffix="días" />
          <Stat value={todayCheckins} label="Hoy" size={28} suffix={`/ ${todayTotal}`} />
        </div>
      )}

      {!loading && activeHabits.length > 0 && <Hairline />}

      {/* Time filters */}
      {!loading && activeHabits.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 24, marginBottom: 24 }}>
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className="mono"
              style={{
                padding: "4px 12px", borderRadius: 6,
                border: timeRange === opt.value ? "1px solid var(--hairline2)" : "1px solid transparent",
                background: timeRange === opt.value ? "var(--whisper)" : "transparent",
                color: timeRange === opt.value ? "var(--ink)" : "var(--mute)",
                fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                transition: "all 120ms ease",
              }}
            >{opt.label}</button>
          ))}
        </div>
      )}

      {/* Habit list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.map(habit => {
            const streak = streaks[habit.id] || 0;
            const checkins = habitCheckins[habit.id] || {};
            const done = (checkins[today] || 0) >= (habit.targetPerDay || 1);
            return (
              <div key={habit.id} className="row-hover" style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8,
                cursor: "pointer",
                transition: "background 120ms ease",
              }}>
                {/* Check circle */}
                <button
                  onClick={() => handleCheckin(habit.id)}
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: done ? "none" : "1.5px solid var(--faint)",
                    background: done ? "var(--ink)" : "transparent",
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 150ms ease",
                  }}
                >
                  {done && (
                    <svg width="11" height="11" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="var(--inverse)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                {/* Title */}
                <span style={{
                  flex: 1, fontSize: 14, fontWeight: 400, color: done ? "var(--mute)" : "var(--ink)",
                  textDecoration: done ? "line-through" : "none",
                  textDecorationColor: "var(--faint)",
                  transition: "color 150ms ease",
                }}>{habit.title}</span>
                {/* Streak */}
                {streak > 0 && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.08em" }}>
                    {streak}d
                  </span>
                )}
                {/* Count */}
                {checkins[today] > 1 && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>
                    ×{checkins[today]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && activeHabits.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>No hay hábitos aún</p>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 24px" }}>Creá tu primer hábito para empezar a trackear</p>
          <button onClick={() => setShowCreate(true)} style={{
            padding: "8px 20px", borderRadius: 8,
            background: "var(--ink)", color: "var(--inverse)",
            border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
            fontFamily: "'Inter Tight', sans-serif",
          }}>Crear hábito</button>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
