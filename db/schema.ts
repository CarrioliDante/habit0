// Importar funciones de Drizzle ORM para definir tablas y tipos de columnas en PostgreSQL
import { pgTable, serial, varchar, text, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";

// Definir la tabla "users" para almacenar información de usuarios
export const users = pgTable("users", {
  // Columna id: entero autoincremental que sirve como clave primaria
  id: serial("id").primaryKey(),
  // Columna clerkId: string de hasta 256 caracteres para el ID de Clerk (autenticación), obligatorio
  clerkId: varchar("clerk_id", { length: 256 }).notNull().unique(),
  // Columna email: string de hasta 256 caracteres para el correo electrónico, obligatorio
  email: varchar("email", { length: 256 }).notNull(),
  // Columna tz: string de hasta 64 caracteres para la zona horaria, obligatorio, por defecto "UTC"
  tz: varchar("tz", { length: 64 }).notNull().default("UTC"),
  // Columna createdAt: timestamp de cuándo se creó el usuario, obligatorio, por defecto la fecha actual
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Definir la tabla "habits" para almacenar los hábitos de los usuarios
export const habits = pgTable("habits", {
  // Columna id: entero autoincremental que sirve como clave primaria
  id: serial("id").primaryKey(),
  // Columna userId: referencia al id del usuario en la tabla users, obligatorio
  userId: integer("user_id").notNull().references(() => users.id),
  // Columna title: string de hasta 256 caracteres para el título del hábito, obligatorio
  title: varchar("title", { length: 256 }).notNull(),
  // Columna description: texto largo opcional para describir el hábito
  description: text("description"),
  // Columna icon: string de hasta 32 caracteres para el nombre del icono, por defecto "Star"
  icon: varchar("icon", { length: 32 }).default("Star"),
  // Columna color: string de hasta 16 caracteres para un color hex, por defecto "#3b82f6"
  color: varchar("color", { length: 16 }).default("#3b82f6"),
  // Columna cadence: string de hasta 64 caracteres para la frecuencia del hábito (ej: "daily"), obligatorio
  cadence: varchar("cadence", { length: 64 }).notNull(),
  // Columna targetPerDay: número entero para el objetivo diario, obligatorio, por defecto 1
  targetPerDay: integer("target_per_day").notNull().default(1),
  // Columna allowMultiplePerDay: booleano para permitir múltiples check-ins por día, por defecto false
  allowMultiplePerDay: boolean("allow_multiple_per_day").default(false),
  // Columna jokerPolicy: string de hasta 32 caracteres para política de días libres, por defecto "weekly:1"
  jokerPolicy: varchar("joker_policy", { length: 32 }).default("weekly:1"),
  // Columna reminder: booleano para activar/desactivar recordatorios, obligatorio, por defecto false
  reminder: boolean("reminder").notNull().default(false),
  // Columna reminderTimeLocal: string de hasta 16 caracteres para la hora local del recordatorio, opcional
  reminderTimeLocal: varchar("reminder_time_local", { length: 16 }),
  // Columna reminderDays: string de hasta 32 caracteres para los días de recordatorio, opcional
  reminderDays: varchar("reminder_days", { length: 32 }),
  // Columna isArchived: booleano para marcar si el hábito está archivado, por defecto false
  isArchived: boolean("is_archived").default(false),
  // Columna createdAt: timestamp de cuándo se creó el hábito, obligatorio, por defecto la fecha actual
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // Definir índice único para garantizar un solo check-in por hábito, usuario y fecha
  index("idx_habits_user").on(table.userId),
  index("idx_habits_archived").on(table.isArchived),
]);

// Definir la tabla "checkins" para registrar el seguimiento diario de los hábitos
export const checkins = pgTable("checkins", {
  // Columna id: entero autoincremental que sirve como clave primaria
  id: serial("id").primaryKey(),
  // Columna habitId: referencia al hábito que se está registrando, obligatorio
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  // Columna userId: referencia al usuario que hace el check-in, obligatorio
  userId: integer("user_id").notNull().references(() => users.id),
  // Columna date: fecha del check-in, obligatorio
  date: varchar("date", { length: 16 }).notNull(),
  // Columna count: número entero para contar cuántas veces se completó el hábito ese día, por defecto 1
  count: integer("count").default(1),
  // Columna note: texto largo opcional para agregar notas al check-in
  note: text("note"),
  // Columna createdAt: timestamp con zona horaria de cuándo se creó el registro, por defecto la fecha actual
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // Definir índice único para garantizar un solo check-in por hábito, usuario y fecha
  unique("unique_checkin_per_day").on(table.habitId, table.userId, table.date),
  // Definir índice para mejorar el rendimiento de búsqueda por usuario y fecha
  index("idx_checkins_user_date").on(table.userId, table.date),
  // Índice adicional para búsquedas por habitId (usado frecuentemente)
  index("idx_checkins_habit").on(table.habitId),
]);

// Definir la tabla "groups" para organizar hábitos en rutinas
export const groups = pgTable("groups", {
  // Columna id: entero autoincremental que sirve como clave primaria
  id: serial("id").primaryKey(),
  // Columna userId: referencia al usuario propietario del grupo, obligatorio
  userId: integer("user_id").notNull().references(() => users.id),
  // Columna name: nombre del grupo/rutina, obligatorio
  name: varchar("name", { length: 256 }).notNull(),
  // Columna description: descripción opcional del grupo
  description: text("description"),
  // Columna color: color para identificar visualmente el grupo
  color: varchar("color", { length: 16 }).default("#3b82f6"),
  // Columna icon: icono opcional para el grupo
  icon: varchar("icon", { length: 32 }).default("Folder"),
  // Columna daysOfWeek: días de la semana para este grupo (JSON array: [0-6], 0=domingo)
  // Almacenado como string JSON: "[1,3,5]" = lunes, miércoles, viernes
  daysOfWeek: varchar("days_of_week", { length: 32 }).default("[]"),
  // Columna order: orden de visualización del grupo
  order: integer("order").default(0),
  // Columna isArchived: si el grupo está archivado
  isArchived: boolean("is_archived").default(false),
  // Columna createdAt: timestamp de cuándo se creó el grupo
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_groups_user").on(table.userId),
  index("idx_groups_archived").on(table.isArchived),
]);

// Definir la tabla "habit_groups" para la relación many-to-many entre habits y groups
export const habitGroups = pgTable("habit_groups", {
  // Columna id: entero autoincremental que sirve como clave primaria
  id: serial("id").primaryKey(),
  // Columna habitId: referencia al hábito
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  // Columna groupId: referencia al grupo
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  // Columna order: orden del hábito dentro del grupo
  order: integer("order").default(0),
  // Columna createdAt: timestamp de cuándo se agregó el hábito al grupo
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // Garantizar que un hábito no se agregue dos veces al mismo grupo
  unique("unique_habit_per_group").on(table.habitId, table.groupId),
  index("idx_habit_groups_habit").on(table.habitId),
  index("idx_habit_groups_group").on(table.groupId),
]);
