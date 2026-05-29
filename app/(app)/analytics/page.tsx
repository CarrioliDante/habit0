"use client";
import { useEffect, useState, useMemo } from "react";
import { format as formatDate, subDays, subMonths, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { getHabits, getCheckins, getAnalyticsOverview } from "@/lib/api";
import { computeStreak } from "@/lib/metrics";
import { getCachedHabits, cacheHabits } from "@/lib/localCache";
import { Stat, Hairline } from "@/components/ui/primitives";
import { HabitIcon } from "@/components/ui/habit-icon";
import type { Habit } from "@/types";

const RANGES = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "365", label: "1 año" },
];

export default function AnalyticsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const today = formatDate(new Date(), "yyyy-MM-dd");
  const days = parseInt(range);

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        const cached = getCachedHabits();
        let h: Habit[];
        if (cached?.length) { h = cached; setHabits(h); } else { h = await getHabits(); if (c) return; cacheHabits(h); setHabits(h); }
        const results = await Promise.all(h.map(async habit => {
          const data = await getCheckins({ from: formatDate(subDays(new Date(), 365), "yyyy-MM-dd"), to: today, habitId: habit.id });
          return { id: habit.id, data: data.data };
        }));
        const map: Record<number, Record<string, number>> = {};
        for (const r of results) map[r.id] = r.data;
        if (!c) setCheckins(map);
      } catch {} finally { if (!c) setLoading(false); }
    }
    load();
    return () => { c = true; };
  }, []);

  const active = habits.filter(h => !h.isArchived);

  // Stats per habit
  const stats = useMemo(() =>
    active.map(h => {
      const c = checkins[h.id] || {};
      const rangeDates = Array.from({ length: days }, (_, i) => formatDate(subDays(new Date(), days - 1 - i), "yyyy-MM-dd"));
      const total = rangeDates.reduce((s, d) => s + (c[d] || 0), 0);
      const target = h.targetPerDay || 1;
      const expected = days * target;
      const adherence = expected > 0 ? Math.round((total / expected) * 100) : 0;
      const dates = Object.entries(c).filter(([, v]) => v > 0).map(([d]) => d);
      const streak = computeStreak(dates, today, { cadence: h.cadence });
      return { ...h, total, adherence, streak };
    }).sort((a, b) => b.adherence - a.adherence),
    [active, checkins, days]
  );

  // Aggregated trend (daily totals)
  const trend = useMemo(() => {
    const result: { date: string; total: number; expected: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = formatDate(subDays(new Date(), i), "yyyy-MM-dd");
      const total = active.reduce((s, h) => s + (checkins[h.id]?.[d] || 0), 0);
      const expected = active.reduce((s, h) => s + (h.targetPerDay || 1), 0);
      result.push({ date: d, total, expected });
    }
    return result;
  }, [active, checkins, days]);

  const maxTotal = Math.max(1, ...trend.map(t => Math.max(t.total, t.expected)));

  if (loading) return <div style={{ padding: "60px 0", textAlign: "center" }}><div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div></div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--ink)", margin: 0 }}>Analytics</h1>
        <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>Rendimiento por hábito</div>
      </div>

      {/* Range selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {RANGES.map(r => (
          <button key={r.value} onClick={() => setRange(r.value)} className="mono" style={{
            padding: "4px 12px", borderRadius: 6,
            border: range === r.value ? "1px solid var(--hairline2)" : "1px solid transparent",
            background: range === r.value ? "var(--whisper)" : "transparent",
            color: range === r.value ? "var(--ink)" : "var(--mute)",
            fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 120ms ease",
          }}>{r.label}</button>
        ))}
      </div>

      {/* Trend chart */}
      {active.length > 0 && (
        <div style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 20, marginBottom: 24 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Tendencia</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 120 }}>
            {trend.map((t, i) => {
              const h = (t.total / maxTotal) * 120;
              const eh = (t.expected / maxTotal) * 120;
              return (
                <div key={i} title={`${t.date}: ${t.total}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
                  <div style={{ height: Math.max(2, h), background: "var(--ink)", borderRadius: "1px 1px 0 0", opacity: t.total > 0 ? 1 : 0.15 }} />
                  <div style={{ height: Math.max(1, eh - h), background: "var(--hairline)", borderRadius: "1px 1px 0 0", opacity: eh > h ? 1 : 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Hairline />

      {/* Per-habit stats */}
      <div style={{ marginTop: 24 }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Por hábito</div>
        {stats.map(h => (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--hairline)" }}>
            <HabitIcon name={h.icon || "star"} size={20} color="var(--ink)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{h.title}</div>
              <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>Racha: {h.streak}d · Total: {h.total} en {days}d</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="display tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.03em" }}>{h.adherence}%</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--faint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>adherencia</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
