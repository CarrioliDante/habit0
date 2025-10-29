"use client";
import { useCallback, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { CalendarCheck, CalendarClock, CalendarRange, Flame } from "lucide-react";
import type { ComponentType } from "react";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { normalizeIconValue } from "@/lib/iconUtils";
import { DEFAULT_HABIT_COLOR } from "@/lib/colors";
import { Habit } from "@/types";
import { HabitHeatmap } from "./HabitHeatmap";
import { HabitDetailModal } from "./HabitDetailModal";
import { HabitCalendar } from "./HabitCalendar";

interface HabitCardProps {
  habit: Habit;
  checkins: Record<string, number>;
  streak: number;
  dateRange: { from: string; to: string };
  viewMode?: "default" | "week" | "month";
  darkMode: boolean;
  onCheckin: (habitId: number) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: number) => void;
  onDelete: (habitId: number) => void;
  onBatchUpdateCheckins: (habitId: number, updates: Array<{ date: string; count: number }>) => void;
  loading: boolean;
}

/**
 * Card individual de hábito con heatmap como protagonista
 */
export function HabitCard({
  habit,
  checkins,
  streak,
  dateRange,
  viewMode = "default",
  darkMode,
  onCheckin,
  onEdit,
  onArchive,
  onDelete,
  onBatchUpdateCheckins,
  loading,
}: HabitCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Lógica para el botón de check-in
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  let count = checkins[todayStr] || 0;
  const segments = habit.targetPerDay || 1;
  const hex = habit.color || DEFAULT_HABIT_COLOR;
  const hexToRgba = (hex: string, alpha: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const bgColor = hexToRgba(hex, darkMode ? 0.18 : 0.13);
  const Icons = LucideIcons as unknown as Record<string, unknown>;
  const normalizedIcon = normalizeIconValue(habit.icon || "");
  const HabitIcon = Icons[normalizedIcon || "Star"] as unknown as ComponentType<{ size?: number }> | undefined;
  const StarFallback = Icons.Star as unknown as ComponentType<{ size?: number }> | undefined;
  const cadenceMap: Record<string, { label: string; Icon: ComponentType<{ size?: number; className?: string }> }> = {
    daily: { label: "Diario", Icon: CalendarCheck },
    weekly: { label: "Semanal", Icon: CalendarRange },
    custom: { label: "Personalizado", Icon: CalendarClock },
  };
  const cadenceBadge = cadenceMap[habit.cadence] || cadenceMap.daily;
  const CadenceIcon = cadenceBadge.Icon;
  const weekDates = useMemo(() => {
    if (viewMode !== "week") return [];
    try {
      const start = startOfWeek(parseISO(dateRange.from), { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [viewMode, dateRange.from]);
  const checkinsEntries = useMemo(() => Object.entries(checkins), [checkins]);
  const weeklySelectedDates = useMemo(() => {
    if (habit.cadence !== "weekly") return new Set<string>();
    const selected = new Set<string>();
    checkinsEntries.forEach(([date, count]) => {
      if (count > 0) selected.add(date);
    });
    return selected;
  }, [checkinsEntries, habit.cadence]);
  const weeklyWeekKeys = useMemo(() => {
    if (habit.cadence !== "weekly") return new Set<string>();
    const weeks = new Set<string>();
    weeklySelectedDates.forEach((date) => {
      weeks.add(format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd"));
    });
    return weeks;
  }, [weeklySelectedDates, habit.cadence]);
  const colorWithAlpha = (alpha: number) => hexToRgba(hex, alpha);
  const getWeekWindowFor = (date: Date) =>
    eachDayOfInterval({
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    });
  const getIntensityFromCount = (value: number): number => {
    if (value === 0) return 0;
    if (!habit.allowMultiplePerDay && value >= 1) return 5;
    const rawTarget = habit.targetPerDay || 1;
    const target = Math.max(1, Math.min(5, rawTarget));
    const progress = value / target;
    if (progress >= 0.81) return 5;
    if (progress >= 0.61) return 4;
    if (progress >= 0.41) return 3;
    if (progress >= 0.21) return 2;
    return 1;
  };
  const getWeeklyHighlightState = useCallback(
    (date: Date): "selected" | "adjacent" | "none" => {
      if (habit.cadence !== "weekly") return "none";
      const dateStr = format(date, "yyyy-MM-dd");
      if (weeklySelectedDates.has(dateStr) && (checkins[dateStr] || 0) > 0) {
        return "selected";
      }
      const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
      if (weeklyWeekKeys.has(weekKey)) {
        return "adjacent";
      }
      return "none";
    },
    [habit.cadence, weeklySelectedDates, weeklyWeekKeys, checkins]
  );
  const getCalendarIntensity = (date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    const count = checkins[dateStr] || 0;
    return getIntensityFromCount(count);
  };
  const handleCalendarDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (dateStr > todayStr) return;
    const currentCount = checkins[dateStr] || 0;

    if (habit.cadence === "weekly") {
      const willActivate = currentCount === 0;
      const range = getWeekWindowFor(date);
      const updates: Array<{ date: string; count: number }> = [];
      range.forEach((d) => {
        const dStr = format(d, "yyyy-MM-dd");
        if (dStr === dateStr) {
          updates.push({ date: dStr, count: willActivate ? 1 : 0 });
        } else if (willActivate && (checkins[dStr] || 0) > 0) {
          updates.push({ date: dStr, count: 0 });
        }
      });
      if (updates.length > 0) {
        onBatchUpdateCheckins(habit.id, updates);
      }
      return;
    }

    if (habit.allowMultiplePerDay) {
      const maxCount = habit.targetPerDay || 1;
      const next = currentCount >= maxCount ? 0 : currentCount + 1;
      onBatchUpdateCheckins(habit.id, [{ date: dateStr, count: next }]);
    } else {
      const next = currentCount > 0 ? 0 : 1;
      onBatchUpdateCheckins(habit.id, [{ date: dateStr, count: next }]);
    }
  };
  const handleWeekCellToggle = (date: Date) => {
    if (viewMode !== "week") return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (dateStr > todayStr) return;
    const currentCount = checkins[dateStr] || 0;

    if (habit.cadence === "weekly") {
      const willActivate = currentCount === 0;
      const range = getWeekWindowFor(date);
      const updates: Array<{ date: string; count: number }> = [];
      range.forEach((d) => {
        const dStr = format(d, "yyyy-MM-dd");
        if (dStr === dateStr) {
          updates.push({ date: dStr, count: willActivate ? 1 : 0 });
        } else if (willActivate && (checkins[dStr] || 0) > 0) {
          updates.push({ date: dStr, count: 0 });
        }
      });
      if (updates.length > 0) onBatchUpdateCheckins(habit.id, updates);
      return;
    }

    if (habit.allowMultiplePerDay) {
      const maxCount = habit.targetPerDay || 1;
      const next = currentCount >= maxCount ? 0 : currentCount + 1;
      onBatchUpdateCheckins(habit.id, [{ date: dateStr, count: next }]);
    } else {
      const next = currentCount > 0 ? 0 : 1;
      onBatchUpdateCheckins(habit.id, [{ date: dateStr, count: next }]);
    }
  };

  // Semanal: ¿ya está marcado en la semana?
  let alreadyCheckedWeek = false;
  if (habit.cadence === "weekly") {
    const startOfWeekLocal = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      return d;
    };
    const endOfWeekLocal = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 7);
      return d;
    };
    const weekStart = startOfWeekLocal(today);
    const weekEnd = endOfWeekLocal(today);
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (checkins[dStr] > 0) alreadyCheckedWeek = true;
    }
  }

  // Spinner para meta
  let spinnerButton = null;
  if (habit.allowMultiplePerDay && segments > 1) {
    // Only reset when the stored count is strictly greater than segments
    if (count > segments) count = 0;
    const size = 32; // slightly smaller spinner so it fits centered inside the button
    const stroke = 3;
    const radius = (size - stroke) / 2;
    const anglePerSegment = 360 / segments;
    spinnerButton = (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCheckin(habit.id);
        }}
        disabled={loading}
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-md relative ${
          loading
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
        }`}
        style={{ backgroundColor: bgColor }}
        title={`Check-ins hoy: ${count}/${segments}`}
      >
        <svg
          width={size}
          height={size}
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            transition: "all 0.28s cubic-bezier(.4,2,.3,1)",
            overflow: "visible",
          }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={darkMode ? "#444" : "#ddd"}
            strokeWidth={stroke}
            fill="none"
          />
          {Array.from({ length: segments }).map((_, i) => {
            const filled = i < count;
            const startAngle = (i * anglePerSegment - 90) * Math.PI / 180;
            const endAngle = ((i + 1) * anglePerSegment - 90) * Math.PI / 180;
            const x1 = size / 2 + radius * Math.cos(startAngle);
            const y1 = size / 2 + radius * Math.sin(startAngle);
            const x2 = size / 2 + radius * Math.cos(endAngle);
            const y2 = size / 2 + radius * Math.sin(endAngle);
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                stroke={filled ? hex : (darkMode ? "#222" : "#eee")}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                style={{
                  transition: "stroke 160ms ease, stroke-width 160ms ease, transform 180ms ease, opacity 180ms ease",
                  transform: filled ? `scale(1.06)` : `scale(1)`,
                  transformOrigin: `${size / 2}px ${size / 2}px`,
                  opacity: filled ? 1 : 0.9,
                }}
              />
            );
          })}
        </svg>
      </button>
    );
  }

  // Estado: marcado hoy (o esta semana para semanales)
  const isCheckedToday = habit.cadence === "weekly" ? alreadyCheckedWeek : (count > 0);

  return (
    <>
      <div
        className={`rounded-2xl overflow-hidden transition-all cursor-pointer ${
          darkMode
            ? "bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 shadow-2xl shadow-black/30 hover:border-gray-600/50"
            : "bg-white border border-gray-200 shadow-lg shadow-gray-200/60 hover:border-gray-300"
        }`}
        onClick={() => setShowDetailModal(true)}
      >
      {/* Header con icono, título y botón de check */}
      <div
        className={`p-4 flex ${
          viewMode === "week"
            ? "items-center gap-3"
            : "items-start justify-between gap-3"
        }`}
      >
        {/* Icono circular con color del hábito */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
          style={{ backgroundColor: hex }}
        >
          {HabitIcon ? <HabitIcon size={20} /> : StarFallback ? <StarFallback size={20} /> : null}
        </div>

        {/* Título y descripción */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-semibold text-base ${
                darkMode ? "text-gray-50" : "text-gray-900"
              }`}
            >
              {habit.title}
            </h3>

            {/* Badge de cadencia */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}
            >
              <CadenceIcon
                size={12}
                className="inline-block mr-1 align-middle"
              />
              {cadenceBadge.label}
            </span>

            {streak > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
                style={{
                  backgroundColor: `${(habit.color || DEFAULT_HABIT_COLOR)}30`, // 30 = 20% opacity in hex
                  color: habit.color || DEFAULT_HABIT_COLOR
                }}
              >
                <Flame size={12} className="inline-block mr-1 align-middle" />
                {streak}
              </span>
            )}
          </div>
          {habit.description && (
            <p
              className={`text-xs mt-1 line-clamp-1 ${
                darkMode ? "text-gray-400" : "text-gray-700"
              }`}
            >
              {habit.description}
            </p>
          )}
        </div>

        {/* Botón de Check grande - esquina superior derecha (oculto en vista semanal) */}
        {viewMode !== "week" && (
          habit.cadence === "weekly" ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!alreadyCheckedWeek) onCheckin(habit.id);
              }}
              disabled={loading || alreadyCheckedWeek}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 transition-all shadow-md ${
                loading || alreadyCheckedWeek
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
              }`}
              style={{ backgroundColor: alreadyCheckedWeek ? hex : bgColor, color: alreadyCheckedWeek ? "#fff" : hex }}
              title={alreadyCheckedWeek ? "Ya marcado esta semana" : "Completar semana"}
            >
              <LucideIcons.Check size={24} color={alreadyCheckedWeek ? "#fff" : hex} />
            </button>
          ) : habit.allowMultiplePerDay && segments > 1 ? (
            spinnerButton
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCheckin(habit.id);
              }}
              disabled={loading}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 transition-all shadow-md ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-110 hover:shadow-xl active:scale-95 cursor-pointer hover:brightness-90"
              }`}
              style={isCheckedToday ? { backgroundColor: hex, color: "#fff" } : { backgroundColor: "transparent", border: `2px solid ${hex}`, color: hex }}
              title="Completar hoy"
            >
              {isCheckedToday ? <LucideIcons.Check size={20} color="#fff" /> : <LucideIcons.Check size={20} color={hex} />}
            </button>
          )
        )}
      </div>

      {viewMode === "default" && (
        <div
          className={`px-4 pb-4 ${darkMode ? "bg-gray-900/20" : "bg-gray-50/50"}`}
        >
          <HabitHeatmap
            data={checkins}
            from={dateRange.from}
            to={dateRange.to}
            color={habit.color || DEFAULT_HABIT_COLOR}
            targetPerDay={habit.targetPerDay}
            allowMultiplePerDay={habit.allowMultiplePerDay}
            darkMode={darkMode}
            cadence={habit.cadence}
          />
        </div>
      )}

      {viewMode === "month" && (
        <div
          className={`px-4 pb-4 ${darkMode ? "bg-gray-900/20" : "bg-gray-50/60"}`}
        >
          <HabitCalendar
            habit={habit}
            data={checkins}
            darkMode={darkMode}
            onDayClick={handleCalendarDayClick}
            getIntensity={getCalendarIntensity}
            getHighlight={getWeeklyHighlightState}
            colorWithAlpha={colorWithAlpha}
          />
        </div>
      )}

      {viewMode === "week" && weekDates.length > 0 && (
        <div
          className={`px-4 pb-4 ${darkMode ? "bg-gray-900/10" : "bg-slate-50"}`}
        >
          <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-[0.2em] mb-2 text-center">
            {weekDates.map((date) => (
              <span
                key={`label-${format(date, "yyyy-MM-dd")}`}
                className={darkMode ? "text-gray-500" : "text-slate-500"}
              >
                {format(date, "EEE", { locale: es }).replace(".", "").slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const dayCount = checkins[dateStr] || 0;
              const isFuture = dateStr > todayStr;
              const isToday = dateStr === todayStr;
              const maxCount = habit.targetPerDay || 1;
              const progress = habit.allowMultiplePerDay
                ? Math.min(dayCount / maxCount, 1)
                : dayCount > 0 ? 1 : 0;
              const filled = dayCount > 0;
              const highlightState = getWeeklyHighlightState(date);
              const backgroundColor = (() => {
                if (filled) {
                  return habit.allowMultiplePerDay
                    ? hexToRgba(hex, 0.25 + progress * 0.55)
                    : hex;
                }
                if (highlightState === "selected") {
                  return hex;
                }
                if (highlightState === "adjacent") {
                  return hexToRgba(hex, 0.33);
                }
                return darkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)";
              })();
              const borderColor = filled || highlightState !== "none"
                ? "transparent"
                : darkMode
                ? "rgba(148, 163, 184, 0.18)"
                : "rgba(148, 163, 184, 0.22)";
              const textColor = (() => {
                if (filled) {
                  return habit.allowMultiplePerDay
                    ? darkMode
                      ? "rgba(255,255,255,0.9)"
                      : "#0f172a"
                    : "#ffffff";
                }
                if (highlightState === "selected") {
                  return "#ffffff";
                }
                if (highlightState === "adjacent") {
                  return darkMode ? "rgba(226, 232, 240, 0.9)" : hex;
                }
                return darkMode ? "rgba(148, 163, 184, 0.85)" : "#64748b";
              })();
              const dayNumberColor = highlightState !== "none" || filled
                ? textColor
                : darkMode
                ? "rgba(148, 163, 184, 0.75)"
                : "#94a3b8";

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWeekCellToggle(date);
                  }}
                  disabled={isFuture}
                  className={`h-12 rounded-2xl border flex items-center justify-center text-xs font-medium transition-all ${
                    isFuture
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:translate-y-[-1px]"
                  } ${
                    isToday && !isFuture
                      ? darkMode
                        ? "ring-2 ring-offset-2 ring-blue-500/70 ring-offset-gray-950"
                        : "ring-2 ring-offset-2 ring-blue-500/40 ring-offset-white"
                      : ""
                  }`}
                  style={{ backgroundColor, borderColor, color: textColor }}
                  title={`${dateStr}: ${dayCount} registro${dayCount === 1 ? "" : "s"}`}
                  aria-label={`${dateStr}: ${dayCount} registro${dayCount === 1 ? "" : "s"}`}
                  aria-pressed={filled}
                >
                  <div className="flex flex-col items-center gap-1 leading-none">
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: dayNumberColor }}
                    >
                      {format(date, "d")}
                    </span>
                    {habit.allowMultiplePerDay ? (
                      <span className="text-[11px] font-semibold" style={{ color: textColor }}>
                        {dayCount}/{maxCount}
                      </span>
                    ) : (
                      <LucideIcons.Check
                        size={14}
                        color={textColor}
                        className={filled ? "opacity-100" : "opacity-0"}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Modal de detalle */}
      {showDetailModal && (
        <HabitDetailModal
          habit={habit}
          data={checkins}
          darkMode={darkMode}
          onClose={() => setShowDetailModal(false)}
          onBatchUpdateCheckins={(updates: Array<{ date: string; count: number }>) => onBatchUpdateCheckins(habit.id, updates)}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      )}

      </>
    );
  }
