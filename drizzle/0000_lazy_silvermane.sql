CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"count" integer DEFAULT 1,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "checkins_habit_id_user_id_date_unique" UNIQUE("habit_id","user_id","date")
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"cadence" varchar(64) NOT NULL,
	"target_per_day" integer DEFAULT 1 NOT NULL,
	"joker_policy" varchar(32) DEFAULT 'weekly:1',
	"reminder" boolean DEFAULT false NOT NULL,
	"reminder_time_local" varchar(16),
	"reminder_days" varchar(32),
	"is_archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"tz" varchar(64) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;