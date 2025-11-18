// relations.ts
import { relations } from "drizzle-orm";
import { exercises, exerciseSets, workouts } from "./schema";

// One workout has many exercises
export const workoutsRelations = relations(workouts, ({ many }) => ({
  exercises: many(exercises),
}));

// One exercise belongs to workout and has many sets
export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
  sets: many(exerciseSets),
}));

// One set belongs to exercise
export const exerciseSetsRelations = relations(exerciseSets, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseSets.exerciseId],
    references: [exercises.id],
  }),
}));
