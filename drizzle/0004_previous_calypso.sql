ALTER TABLE "workout_exercises" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "workout_exercises" CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_sets" RENAME COLUMN "set_order" TO "order";--> statement-breakpoint
ALTER TABLE "exercise_sets" RENAME COLUMN "weight" TO "weight_kg";--> statement-breakpoint
ALTER TABLE "exercise_sets" DROP CONSTRAINT "exercise_sets_exercise_id_exercises_id_fk";
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "workout_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "user_id";