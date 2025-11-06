CREATE TABLE "routine_habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"habit_id" integer NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_habit_per_routine" UNIQUE("routine_id","habit_id")
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"color" varchar(16) DEFAULT '#8b5cf6',
	"icon" varchar(32) DEFAULT 'ListChecks',
	"days_of_week" varchar(32) DEFAULT '[]',
	"order" integer DEFAULT 0,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_groups_archived";--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "icon" SET DEFAULT 'Tag';--> statement-breakpoint
ALTER TABLE "routine_habits" ADD CONSTRAINT "routine_habits_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_habits" ADD CONSTRAINT "routine_habits_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_routine_habits_routine" ON "routine_habits" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "idx_routine_habits_habit" ON "routine_habits" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "idx_routines_user" ON "routines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_routines_archived" ON "routines" USING btree ("is_archived");--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "days_of_week";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "order";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "is_archived";--> statement-breakpoint
ALTER TABLE "habit_groups" DROP COLUMN "order";