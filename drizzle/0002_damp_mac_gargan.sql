ALTER TABLE "workouts" ALTER COLUMN "date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exercise_sets" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "exercise_sets" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "workouts" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "workouts" DROP COLUMN "updated_at";