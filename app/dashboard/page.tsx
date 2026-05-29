"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type { Habit, Group } from "@/types";
import { format as formatDate, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { getHabits, createHabit as apiCreateHabit, deleteHabit, updateHabit, getCheckins } from "@/lib/api";
import { computeStreak } from "@/lib/metrics";
import { useToast } from "@/lib/hooks/useToast";
import { useCheckin } from "@/lib/hooks/useCheckin";
import { getCachedHabits, cacheHabits, getLocalCheckinsForHabit } from "@/lib/localCache";
import { getCachedGroups, getCachedHabitGroups } from "@/lib/groupsCache";
import { Stat, Hairline } from "@/components/ui/primitives";
import { GroupFilter } from "@/components/groups/GroupFilter";
import { GroupManager } from "@/components/groups/GroupManager";
import { ToastContainer } from "@/components/ui/Toast";
import { HabitIcon } from "@/components/ui/habit-icon";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitSettings } from "@/components/habits/HabitSettings";

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
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedHabit, setExpandedHabit] = useState<number | null>(null);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [settingsHabit, setSettingsHabit] = useState<Habit | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const checkinsCacheRef = useRef<Record<string, { from: string; to: string; data: Record<string, number> }>>({});

  const today = formatDate(new Date(), "yyyy-MM-dd");
  const active = habits.filter(h => !h.isArchived);

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

  const filtered = useMemo(() => {
    if (!selectedGroupId) return active;
    const hgs = getCachedHabitGroups();
    return active.filter(h => hgs?.[h.id]?.some(g => g.id === selectedGroupId));
  }, [active, selectedGroupId]);

  const loadCheckins = useCallback(async (h: Habit[], cancelledRef?: { current: boolean }) => {
    const isCancelled = () => cancelledRef?.current ?? false;
    const results = await Promise.all(h.map(async habit => {
      const local = getLocalCheckinsForHabit(habit.id);
      const data = await getCheckins({ from: "2020-01-01", to: "2099-12-31", habitId: habit.id });
      const m = { ...data.data };
      for (const [d, c] of Object.entries(local)) m[d] = (m[d] || 0) + c;
      return { id: habit.id, data: m };
    }));
    const map: Record<number, Record<string, number>> = {};
    for (const r of results) map[r.id] = r.data;
    if (!isCancelled()) setCheckins(map);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cancelledRef = { current: false };
    async function load() {
      try {
        setLoading(true);
        const cached = getCachedHabits();
        let h: Habit[];
        if (cached?.length) { h = cached; setHabits(h); }
        else { h = await getHabits(); if (cancelled) return; cacheHabits(h); setHabits(h); }
        setLoading(false);
        await loadCheckins(h, cancelledRef);
        const cg = getCachedGroups();
        if (cg) setGroups(cg);
      } catch (e: any) { if (!cancelled) setErr(e.message); setLoading(false); }
    }
    load();
    return () => { cancelled = true; cancelledRef.current = true; };
  }, [loadCheckins]);

  const { handleCheckin: hookHandleCheckin } = useCheckin({
    habitCheckins: checkins,
    setHabitCheckins: setCheckins,
    checkinsCacheRef,
    loadMetrics: useCallback(async () => {
      await loadCheckins(habits, { current: false });
    }, [loadCheckins, habits]),
    toast: { success, error: showError, info: (m) => success(m) },
  });

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

  const handleCheckin = (habit: Habit) => hookHandleCheckin(habit, today);

  const handleCreate = async (data: { title: string; description?: string; icon?: string; cadence: string; targetPerDay: number }) => {
    try {
      const h = await apiCreateHabit(data as any);
      setHabits(prev => [h, ...prev]);
      setShowCreate(false);
      success("Creado");
    } catch (e: any) { showError(e.message); }
  };

  const handleUpdate = async (data: { title: string; description?: string; icon?: string; cadence: string; targetPerDay: number }) => {
    if (!editingHabit) return;
    try {
      await updateHabit(editingHabit.id, data as any);
      setHabits(prev => prev.map(h => h.id === editingHabit.id ? { ...h, title: data.title, description: data.description || null, icon: data.icon, cadence: data.cadence as any, targetPerDay: data.targetPerDay } : h));
      setEditingHabit(null);
      setExpandedHabit(null);
      success("Actualizado");
    } catch (e: any) { showError(e.message); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteHabit(id, true); setHabits(prev => prev.filter(h => h.id !== id)); success("Eliminado"); }
    catch (e: any) { showError(e.message); }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/checkins");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "checkins.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { showError(e.message); }
  };

  const heatmapDays = useMemo(() =>
    Array.from({ length: 365 }, (_, i) => {
      const d = formatDate(subDays(new Date(), 364 - i), "yyyy-MM-dd");
      const total = filtered.reduce((s, h) => s + (checkins[h.id]?.[d] || 0), 0);
      const target = filtered.reduce((s, h) => s + (h.targetPerDay || 1), 0);
      return { date: d, pct: target > 0 ? Math.min(1, total / target) : 0 };
    }), [filtered, checkins]);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--ink)", margin: 0 }}>Inicio</h1>
          <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
            {formatDate(new Date(), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setEditingGroup(undefined); setShowGroupManager(true); }} className="row-hover" style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Grupo</button>
          <button onClick={handleExport} className="row-hover" style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Exportar</button>
          <button onClick={() => setShowCreate(true)} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1 }}>+</button>
        </div>
      </div>

      {showCreate && <HabitForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />}

      {loading && <div style={{ padding: "60px 0", textAlign: "center" }}><div className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>Cargando...</div></div>}
      {err && <div style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--hairline2)", marginBottom: 20 }}><p className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: 0 }}>{err}</p></div>}

      {!loading && active.length > 0 && (
        <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
          <Stat value={active.length} label="Hábitos" size={28} />
          <Stat value={bestStreak} label="Mejor racha" size={28} suffix="días" />
          <Stat value={todayDone} label="Hoy" size={28} suffix={`/ ${todayTotal}`} />
        </div>
      )}

      {!loading && active.length > 0 && <Hairline />}

      {!loading && active.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          {groups.length > 0 && <GroupFilter groups={groups} selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            {VIEWS.map(v => (
              <button key={v.value} onClick={() => setViewMode(v.value)} className="mono" style={{ padding: "4px 12px", borderRadius: 6, border: viewMode === v.value ? "1px solid var(--hairline2)" : "1px solid transparent", background: viewMode === v.value ? "var(--whisper)" : "transparent", color: viewMode === v.value ? "var(--ink)" : "var(--mute)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 120ms ease" }}>{v.label}</button>
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
            const count = c[today] || 0;
            const target = habit.targetPerDay || 1;
            const done = count >= target;
            const pct = Math.min(1, count / target);
            const isExpanded = expandedHabit === habit.id;
            const size = 36, sw = 2, r = (size - sw) / 2, circ = 2 * Math.PI * r;
            const last14 = Array.from({ length: 14 }, (_, i) => {
              const d = formatDate(subDays(new Date(), 13 - i), "yyyy-MM-dd");
              const cc = checkins[habit.id]?.[d] || 0;
              return { date: d, done: cc >= target, partial: cc > 0 && cc < target };
            });
            return (
              <div key={habit.id}>
                <div className="row-hover" onClick={() => setExpandedHabit(isExpanded ? null : habit.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer" }}>
                  <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={sw} />
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ink)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset 400ms ease" }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { e.stopPropagation(); handleCheckin(habit); }}>
                      {done ? <svg width="14" height="14" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <HabitIcon name={habit.icon || "star"} size={14} color="var(--faint)" />}
                    </div>
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: done ? "var(--mute)" : "var(--ink)", textDecorationLine: done ? "line-through" : "none", textDecorationColor: "var(--faint)" }}>{habit.title}</span>
                  {s > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.08em" }}>{s}d</span>}
                  {count > 1 && target > 1 && <span className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>×{count}</span>}
                  <span className="mono" style={{ fontSize: 9, color: "var(--faint)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}>▾</span>
                </div>
                {isExpanded && (
                  <div style={{ marginLeft: 48, marginBottom: 8, padding: "12px 16px", borderRadius: 8, background: "var(--surface)" }}>
                    <div style={{ display: "flex", gap: 3, marginBottom: 12, alignItems: "center" }}>
                      {last14.map(d => <div key={d.date} title={d.date} style={{ width: 16, height: 16, borderRadius: 4, background: d.done ? "var(--ink)" : d.partial ? "var(--hairline2)" : "var(--hairline)" }} />)}
                      <span className="mono" style={{ fontSize: 9, color: "var(--faint)", marginLeft: 6 }}>14d</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                      <Stat value={s} label="Racha" size={18} suffix="días" />
                      <Stat value={count} label="Hoy" size={18} suffix={`/ ${target}`} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); setSettingsHabit(habit); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Configurar</button>
                      <button onClick={e => { e.stopPropagation(); setEditingHabit(habit); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", color: "var(--mute)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(habit.id); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--hairline)", background: "transparent", color: "var(--faint)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Eliminar</button>
                    </div>
                  </div>
                )}
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
              {WEEKDAYS.map((d, i) => <span key={i} className="mono" style={{ fontSize: 8, color: "var(--faint)", height: 10, width: 12, display: "flex", alignItems: "center" }}>{i % 2 === 0 ? d : ""}</span>)}
            </div>
            {Array.from({ length: 53 }, (_, col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {Array.from({ length: 7 }, (_, row) => {
                  const idx = col * 7 + row;
                  if (idx >= heatmapDays.length) return <div key={row} style={{ width: 10, height: 10 }} />;
                  const d = heatmapDays[idx];
                  const isDark = theme === "dark";
                  const R = isDark ? 244 : 0, G = isDark ? 243 : 0, B = isDark ? 238 : 0;
                  const a = d.pct === 0 ? 0.08 : d.pct >= 1 ? 1 : 0.15 + d.pct * 0.7;
                  return <div key={row} title={`${d.date}: ${Math.round(d.pct * 100)}%`} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(${R},${G},${B},${a})` }} />;
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 10 }}>
            <span className="mono" style={{ fontSize: 8, color: "var(--faint)" }}>Menos</span>
            {[0.08, 0.25, 0.5, 0.75, 1].map(o => { const dk = theme === "dark"; const R = dk ? 244 : 0, G = dk ? 243 : 0, B = dk ? 238 : 0; return <div key={o} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(${R},${G},${B},${o})` }} />; })}
            <span className="mono" style={{ fontSize: 8, color: "var(--faint)" }}>Más</span>
          </div>
        </div>
      )}

      {/* CALENDAR */}
      {viewMode === "calendar" && !loading && (
        <div style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 20 }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", textAlign: "center", marginBottom: 16 }}>{formatDate(monthStart, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {WEEKDAYS.map(d => <div key={d} className="mono" style={{ fontSize: 9, color: "var(--faint)", textAlign: "center", padding: "4px 0", letterSpacing: "0.06em" }}>{d}</div>)}
            {Array.from({ length: startPad }, (_, i) => <div key={`p${i}`} />)}
            {monthDays.map(day => {
              const d = formatDate(day, "yyyy-MM-dd");
              const isToday = d === today, isSelected = d === selectedDay;
              const completed = filtered.filter(h => (checkins[h.id]?.[d] || 0) >= (h.targetPerDay || 1));
              const partial = filtered.filter(h => { const c = checkins[h.id]?.[d] || 0; return c > 0 && c < (h.targetPerDay || 1); });
              return (
                <button key={d} onClick={() => setSelectedDay(isSelected ? null : d)} style={{ padding: "6px 3px", borderRadius: 8, textAlign: "center", border: "none", cursor: "pointer", fontFamily: "inherit", background: isSelected ? "var(--whisper)" : "transparent", position: "relative", minHeight: 42, outline: isToday ? "1.5px solid var(--ink)" : "none", outlineOffset: -1 }}>
                  <span style={{ fontSize: 13, fontWeight: isToday ? 600 : 400, color: "var(--ink)", lineHeight: 1 }}>{formatDate(day, "d")}</span>
                  {filtered.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 1.5, marginTop: 3, flexWrap: "wrap", maxWidth: "100%", overflow: "hidden" }}>
                      {completed.slice(0, 5).map(h => <div key={h.id} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ink)", flexShrink: 0 }} />)}
                      {partial.slice(0, 3).map(h => <div key={h.id} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--hairline2)", flexShrink: 0 }} />)}
                      {filtered.length > 8 && <span className="mono" style={{ fontSize: 7, color: "var(--faint)" }}>+{filtered.length - 8}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: "var(--whisper)" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--mute)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{formatDate(new Date(selectedDay + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}</div>
              {filtered.filter(h => checkins[h.id]?.[selectedDay]).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--faint)", margin: 0 }}>Sin actividad este día</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {filtered.map(h => { const c = checkins[h.id]?.[selectedDay] || 0; const t = h.targetPerDay || 1; return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <HabitIcon name={h.icon || "star"} size={12} color={c >= t ? "var(--ink)" : "var(--faint)"} />
                      <span style={{ color: c >= t ? "var(--ink)" : "var(--mute)", flex: 1 }}>{h.title}</span>
                      <span className="mono" style={{ fontSize: 10, color: c >= t ? "var(--ink)" : "var(--faint)" }}>{c}/{t}</span>
                    </div>
                  );})}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && active.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>No hay hábitos aún</p>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 24px" }}>Creá tu primer hábito para empezar</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--ink)", color: "var(--inverse)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Inter Tight', sans-serif" }}>Crear hábito</button>
        </div>
      )}

      {filtered.length === 0 && active.length > 0 && !loading && (
        <div style={{ padding: "60px 0", textAlign: "center" }}><p className="mono" style={{ fontSize: 11, color: "var(--mute)", margin: 0 }}>Sin resultados para este grupo</p></div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <GroupManager isOpen={showGroupManager} onClose={() => { setShowGroupManager(false); setEditingGroup(undefined); }} onSuccess={() => { setGroups(getCachedGroups() || []); setShowGroupManager(false); setEditingGroup(undefined); }} group={editingGroup} />

      {settingsHabit && <HabitSettings habit={settingsHabit} onChange={async (updated) => { try { await updateHabit(settingsHabit.id, updated as any); setHabits(prev => prev.map(h => h.id === settingsHabit.id ? { ...h, ...updated } : h)); } catch (e: any) { showError(e.message); } setSettingsHabit(null); }} onClose={() => setSettingsHabit(null)} />}

      {editingHabit && <HabitForm habit={editingHabit} onSubmit={handleUpdate} onCancel={() => setEditingHabit(null)} />}
    </div>
  );
}
