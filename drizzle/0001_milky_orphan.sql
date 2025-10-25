ALTER TABLE "checkins" DROP CONSTRAINT "checkins_habit_id_user_id_date_unique";--> statement-breakpoint
ALTER TABLE "checkins" ALTER COLUMN "date" SET DATA TYPE varchar(16);--> statement-breakpoint
ALTER TABLE "checkins" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "checkins" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "checkins" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "icon" varchar(32) DEFAULT '⭐';--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "color" varchar(16) DEFAULT '#3b82f6';--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checkins_user_date" ON "checkins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_habits_user" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_habits_archived" ON "habits" USING btree ("is_archived");--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "unique_checkin_per_day" UNIQUE("habit_id","user_id","date");