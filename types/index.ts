// ============= DOMAIN TYPES =============
export type ISODate = string;
export type Cadence = "daily" | "weekly" | "custom";

export type Habit = {
  id: number;
  title: string;
  description?: string | null;
  icon?: string; // Nombre del icono lucide
  color?: string; // Color en formato hex
  cadence: Cadence;
  targetPerDay: number;
  allowMultiplePerDay?: boolean; // Si permite múltiples check-ins por día
  isArchived?: boolean; // Indica si el hábito está archivado (soft delete)
};

// ============= ANALYTICS =============
export type Metrics = {
  range: { from: ISODate; to: ISODate };
  streak: number;
  adherence: number;
  totalCheckins: number;
};

// ============= API REQUEST/RESPONSE =============
export type CreateHabitRequest = {
  title: string;
  description?: string;
  icon?: string; // Nombre del icono lucide
  color?: string; // Color en formato hex
  cadence: Cadence;
  targetPerDay: number;
  allowMultiplePerDay?: boolean; // Permitir múltiples check-ins por día
};

export type CreateCheckinRequest = {
  habitId: number;
  date?: ISODate;
  count?: number;
  note?: string;
};

export type CreateCheckinResponse = {
  id: number;
};

export type GetCheckinsParams = {
  from?: ISODate;
  to?: ISODate;
  habitId?: number;
};

export type GetCheckinsResponse = {
  from: ISODate;
  to: ISODate;
  data: Record<ISODate, number>;
};

export type GetAnalyticsParams = {
  from?: ISODate;
  to?: ISODate;
};

// Genérico para manejar respuestas enriquecidas
export type ApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

export type DeleteHabitResponse = { ok: boolean; id: number; hard: boolean };

// Tipo para actualizar un hábito (todos los campos opcionales)
export type UpdateHabitRequest = Partial<CreateHabitRequest>;

// ============= FILTROS =============
export type TimeRange =
  | "today"
  | "week"
  | "month"
  | "30days"
  | "90days"
  | "6months"
  | "year"
  | "all"
  | "custom";

export type HabitFilter = {
  timeRange: TimeRange;
  customFrom?: ISODate;
  customTo?: ISODate;
  cadence?: Cadence;
  sortBy?: "title" | "streak" | "adherence" | "lastCheckin" | "created";
  sortOrder?: "asc" | "desc";
};

// Estadísticas detalladas de un hábito específico
export type HabitStats = {
  habitId: number;
  habitTitle: string;
  range: { from: ISODate; to: ISODate };
  streak: number;
  bestStreak: number;
  adherence: number;
  totalCheckins: number;
  daysCompleted: number;
  daysInRange: number;
  lastCheckin: ISODate | null;
  avgPerDay: number;
};

// Comparación de períodos
export type PeriodComparison = {
  current: {
    from: ISODate;
    to: ISODate;
    adherence: number;
    streak: number;
    totalCheckins: number;
  };
  previous: {
    from: ISODate;
    to: ISODate;
    adherence: number;
    streak: number;
    totalCheckins: number;
  };
  changes: {
    adherence: number; // Diferencia en puntos porcentuales
    streak: number; // Diferencia absoluta
    totalCheckins: number; // Diferencia absoluta
  };
};
