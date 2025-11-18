-- Custom SQL migration file, put your code below! --

-- Step 1: Rename the column from exercise_id to workout_exercise_id
ALTER TABLE "exercise_sets" RENAME COLUMN "exercise_id" TO "workout_exercise_id";

-- Step 2: Drop the old foreign key constraint
ALTER TABLE "exercise_sets" DROP CONSTRAINT "exercise_sets_exercise_id_exercises_id_fk";

-- Step 3: Add the new foreign key constraint referencing workout_exercises
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_workout_exercise_id_workout_exercises_id_fk"
  FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises"("id") ON DELETE CASCADE;
