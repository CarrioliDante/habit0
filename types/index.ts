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

// Grupos: tags/categorías para organizar hábitos
export type Group = {
  id: number;
  userId: number;
  name: string;
  color?: string; // Color en formato hex
  icon?: string; // Nombre del icono lucide
  createdAt?: string;
};

export type HabitGroup = {
  id: number;
  habitId: number;
  groupId: number;
  createdAt?: string;
};

// Tipo para grupo con sus hábitos (para UI)
export type GroupWithHabits = Group & {
  habits: Habit[];
};

// Rutinas: checklists de hábitos (completadas cuando todos los hábitos están checked)
export type Routine = {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  color?: string; // Color en formato hex
  icon?: string; // Nombre del icono lucide
  daysOfWeek: number[]; // Array de días [1-7], 1=lunes, 7=domingo
  order: number; // Orden de visualización
  isArchived?: boolean;
  createdAt?: string;
};

export type RoutineHabit = {
  id: number;
  routineId: number;
  habitId: number;
  order: number;
  createdAt?: string;
};

// Tipo para rutina con sus hábitos (para UI)
export type RoutineWithHabits = Routine & {
  habits: Habit[];
};

// Tipo para progreso de rutina en un día específico
export type RoutineProgress = {
  routineId: number;
  date: ISODate;
  totalHabits: number;
  completedHabits: number;
  isComplete: boolean; // true si todos los hábitos están checked
  habits: Array<{
    habitId: number;
    title: string;
    isChecked: boolean;
    count: number;
  }>;
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

export type CreateGroupRequest = {
  name: string;
  color?: string;
  icon?: string;
};

export type UpdateGroupRequest = Partial<CreateGroupRequest>;

export type AddHabitToGroupRequest = {
  habitId: number;
};

export type CreateRoutineRequest = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  daysOfWeek?: number[]; // [1-7], 1=lunes, 7=domingo
  order?: number;
};

export type UpdateRoutineRequest = Partial<CreateRoutineRequest>;

export type AddHabitToRoutineRequest = {
  habitId: number;
  order?: number;
};

// ============= API RESPONSES (NORMALIZED) =============
/**
 * Standard API response shape - ALL endpoints should use this
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Legacy response format (to be migrated)
 * @deprecated Use ApiResponse instead
 */
export type LegacyApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

/**
 * @deprecated Use ApiResponse<{id: number; hard: boolean}> instead
 */
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
