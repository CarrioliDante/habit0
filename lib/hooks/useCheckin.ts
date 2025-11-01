/**
 * useCheckin Hook
 *
 * Handles check-in operations with:
 * - Operation queueing (prevents race conditions)
 * - Aggressive debouncing (5 seconds - coalesces rapid clicks)
 * - Optimistic updates with rollback
 * - Batch sync (sends final state, not increments)
 * - Retry logic with exponential backoff
 * - Toast notifications
 *
 * Strategy: Like popular habit apps (Habitica, Streaks), we show
 * changes immediately but sync with server after user stops clicking.
 */

import { useCallback, useRef } from "react";
import { retryWithBackoff } from "@/lib/retryUtils";
import { operationQueue } from "@/lib/operationQueue";
import type { Habit } from "@/types";

type CheckinState = Record<string, Record<string, number>>;
type CheckinCache = {
  from: string;
  to: string;
  data: Record<string, number>;
};

type UseCheckinOptions = {
  habitCheckins: CheckinState;
  setHabitCheckins: React.Dispatch<React.SetStateAction<CheckinState>>;
  checkinsCacheRef: React.MutableRefObject<Record<string, CheckinCache>>;
  loadMetrics: () => Promise<void>;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
};

export function useCheckin({
  habitCheckins,
  setHabitCheckins,
  checkinsCacheRef,
  loadMetrics,
  toast,
}: UseCheckinOptions) {
  // Debounce timers per habit
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Pending operations per habit (for debouncing)
  const pendingOperations = useRef<
    Record<string, { habit: Habit; date: string; finalCount: number }>
  >({});

  // Check if there are pending syncs
  const hasPendingSync = (habitId: number): boolean => {
    const queueKey = habitId.toString();
    return queueKey in pendingOperations.current;
  };

  const handleCheckin = useCallback(
    async (habit: Habit, dateStr: string) => {
      const habitId = habit.id; // Keep as number, not string
      const currentCount = habitCheckins[habitId]?.[dateStr] || 0;
      const maxCount = habit.targetPerDay || 1;

      // Calculate next count
      let nextCount: number;
      if (habit.allowMultiplePerDay) {
        nextCount = currentCount >= maxCount ? 0 : currentCount + 1;
      } else {
        nextCount = currentCount > 0 ? 0 : 1;
      }

      // Optimistic update
      const previousState = { ...habitCheckins };
      setHabitCheckins((prev) => ({
        ...prev,
        [habitId]: {
          ...(prev[habitId] || {}),
          [dateStr]: nextCount,
        },
      }));

      // Update cache
      const cacheEntry = checkinsCacheRef.current[habitId];
      const previousCacheValue = cacheEntry?.data[dateStr];
      if (cacheEntry) {
        cacheEntry.data[dateStr] = nextCount;
        if (dateStr < cacheEntry.from) cacheEntry.from = dateStr;
        if (dateStr > cacheEntry.to) cacheEntry.to = dateStr;
      } else {
        checkinsCacheRef.current[habitId] = {
          from: dateStr,
          to: dateStr,
          data: { [dateStr]: nextCount },
        };
      }

      // Use habitId as string for queue keys (to avoid issues with object keys)
      const queueKey = habitId.toString();

      // Clear existing debounce timer
      if (debounceTimers.current[queueKey]) {
        clearTimeout(debounceTimers.current[queueKey]);
      }

      // Store pending operation
      pendingOperations.current[queueKey] = {
        habit,
        date: dateStr,
        finalCount: nextCount,
      };

      // Debounce: wait 5 seconds before syncing (aggressive - like other habit apps)
      // This allows users to click multiple times without spamming the server
      debounceTimers.current[queueKey] = setTimeout(async () => {
        const pending = pendingOperations.current[queueKey];
        if (!pending) return;

        // Clear pending
        delete pendingOperations.current[queueKey];
        delete debounceTimers.current[queueKey];

        const { habit: h, date: d, finalCount: count } = pending;

        // Queue the operation to prevent race conditions (use queueKey string for queue)
        // Use PATCH instead of POST to set absolute value, not increment
        try {
          await operationQueue.enqueue(queueKey, async () => {
            await retryWithBackoff(
              async () => {
                // Use PATCH endpoint to set absolute count (not increment)
                const response = await fetch("/api/checkins", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    habitId: h.id,
                    date: d,
                    count
                  }),
                });

                if (!response.ok) {
                  const error = await response.json().catch(() => ({ error: "Unknown error" }));
                  throw new Error(error.error || `HTTP ${response.status}`);
                }

                return response.json();
              },
              { maxRetries: 3 }
            );
          });

          // Success toast
          if (count === 0) {
            toast.info(`○ ${h.title} desmarcado`);
          } else if (h.allowMultiplePerDay) {
            toast.success(`✓ ${h.title} (${count}/${maxCount})`);
          } else {
            toast.success(`✓ ${h.title}`);
          }

          // Reload metrics
          await loadMetrics();
        } catch (error) {
          console.error("Error in handleCheckin:", error);
          const errorMsg = error instanceof Error ? error.message : "Error al registrar check-in";
          toast.error(errorMsg);

          // Rollback optimistic update (use habitId number for state)
          setHabitCheckins(previousState);
          if (checkinsCacheRef.current[habitId]) {
            checkinsCacheRef.current[habitId].data[dateStr] = previousCacheValue ?? currentCount;
          }
        }
      }, 5000); // 5 seconds - aggressive debouncing like popular habit apps
    },
    [habitCheckins, setHabitCheckins, checkinsCacheRef, loadMetrics, toast]
  );

  return { handleCheckin, hasPendingSync };
}
