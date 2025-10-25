import type {
  Habit,
  Metrics,
  CreateHabitRequest,
  CreateCheckinRequest,
  CreateCheckinResponse,
  GetCheckinsParams,
  GetCheckinsResponse,
  GetAnalyticsParams,
  UpdateHabitRequest,
  HabitStats,
  ISODate,
  PeriodComparison,
} from "@/types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  });
  return sp.toString() ? `?${sp.toString()}` : "";
}

async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  retry = 1
): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401 && retry > 0) {
      // Retry once (ej: cookie clerk revalida)
      return apiFetch<T>(url, options, retry - 1);
    }
    throw new ApiError(res.status, `${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ==================== HABITS ====================
//GET
export const getHabits = (): Promise<Habit[]> => apiFetch("/api/habits");

//CREATE
export const createHabit = (data: CreateHabitRequest): Promise<Habit> =>
  apiFetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

//DELETE
export async function deleteHabit(id: number, hard = false) {
  const url = `/api/habits/${id}${hard ? "?hard=true" : ""}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${res.status}`);
  return res.json() as Promise<{ ok: boolean; id: number; hard: boolean }>;
}
//RESTORE
export async function restoreHabit(id: number) {
  const res = await fetch(`/api/habits/${id}/restore`, { method: "POST" });
  if (!res.ok) throw new Error(`RESTORE ${res.status}`);
  return res.json() as Promise<{ ok: boolean; id: number }>;
}

/**
 * Actualizar un hábito existente
 */
export async function updateHabit(
  habitId: number,
  data: UpdateHabitRequest
): Promise<Habit> {
  return apiFetch<Habit>(`/api/habits/${habitId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ==================== CHECKINS ====================
export const createCheckin = (
  data: CreateCheckinRequest
): Promise<CreateCheckinResponse> =>
  apiFetch("/api/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getCheckins = (
  params?: GetCheckinsParams
): Promise<GetCheckinsResponse> =>
  apiFetch(`/api/checkins${buildQuery(params)}`);

// ==================== ANALYTICS ====================
export const getAnalyticsOverview = (
  params?: GetAnalyticsParams
): Promise<Metrics> =>
  apiFetch(`/api/analytics/overview${buildQuery(params)}`);

/**
 * Obtener estadísticas detalladas de un hábito específico
 */
export async function getHabitStats(
  habitId: number,
  params?: { from?: ISODate; to?: ISODate }
): Promise<HabitStats> {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.set("from", params.from);
  if (params?.to) queryParams.set("to", params.to);

  const query = queryParams.toString();
  return apiFetch<HabitStats>(
    `/api/habits/${habitId}/stats${query ? `?${query}` : ""}`
  );
}

/**
 * Exportar check-ins a CSV
 */
export async function exportCheckinsCSV(params?: GetCheckinsParams): Promise<Blob> {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.set("from", params.from);
  if (params?.to) queryParams.set("to", params.to);
  if (params?.habitId) queryParams.set("habitId", params.habitId.toString());

  const query = queryParams.toString();
  const response = await fetch(`/api/export/checkins?${query}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Error ${response.status}`);
  }

  return response.blob();
}

/**
 * Comparar período actual con anterior
 */
export async function compareAnalytics(params: {
  current_from: ISODate;
  current_to: ISODate;
}): Promise<PeriodComparison> {
  const queryParams = new URLSearchParams();
  queryParams.set("current_from", params.current_from);
  queryParams.set("current_to", params.current_to);

  return apiFetch(`/api/analytics/compare?${queryParams.toString()}`);
}
