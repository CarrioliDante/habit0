CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"color" varchar(16) DEFAULT '#3b82f6',
	"icon" varchar(32) DEFAULT 'Folder',
	"days_of_week" varchar(32) DEFAULT '[]',
	"order" integer DEFAULT 0,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_habit_per_group" UNIQUE("habit_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "icon" SET DEFAULT 'Star';--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_groups" ADD CONSTRAINT "habit_groups_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_groups" ADD CONSTRAINT "habit_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_groups_user" ON "groups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_groups_archived" ON "groups" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "idx_habit_groups_habit" ON "habit_groups" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "idx_habit_groups_group" ON "habit_groups" USING btree ("group_id");