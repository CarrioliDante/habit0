"use client";
import { Habit, Group } from "@/types";
import { HabitCard } from "./HabitCard";

interface HabitListProps {
  habits: Habit[];
  habitCheckins: Record<number, Record<string, number>>;
  habitStreaks: Record<number, number>;
  habitGroups?: Record<number, Group[]>; // Mapa de habitId -> grupos
  allGroups?: Group[]; // Todos los grupos disponibles
  dateRange: { from: string; to: string };
  viewMode?: "default" | "month" | "week";
  darkMode: boolean;
  onCheckin: (habitId: number) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: number) => void;
  onDelete: (habitId: number) => void;
  onBatchUpdateCheckins: (habitId: number, updates: Array<{ date: string; count: number }>) => void;
  onGroupsChange?: () => void; // Callback cuando cambian los grupos
  loading: boolean;
  emptyMessage?: string;
}

/**
 * Lista de cards de hábitos
 */
export function HabitList({
  habits,
  habitCheckins,
  habitStreaks,
  habitGroups = {},
  allGroups = [],
  dateRange,
  viewMode = "default",
  darkMode,
  onCheckin,
  onEdit,
  onArchive,
  onDelete,
  onBatchUpdateCheckins,
  onGroupsChange,
  loading,
  emptyMessage,
}: HabitListProps) {
  if (habits.length === 0) {
    return (
      <div
        className={`rounded-xl border p-8 text-center ${
          darkMode
            ? "bg-gray-800 border-gray-700 text-gray-400"
            : "bg-white border-gray-200 text-gray-500"
        }`}
      >
        {emptyMessage || "Todavía no tenés hábitos — creá el primero"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          checkins={habitCheckins[habit.id] || {}}
          streak={habitStreaks[habit.id] || 0}
          groups={habitGroups[habit.id] || []}
          allGroups={allGroups}
          dateRange={dateRange}
          viewMode={viewMode}
          darkMode={darkMode}
          onCheckin={onCheckin}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onBatchUpdateCheckins={onBatchUpdateCheckins}
          onGroupsChange={onGroupsChange}
          loading={loading}
        />
      ))}
    </div>
  );
}
