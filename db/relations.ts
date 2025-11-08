import { relations } from "drizzle-orm"
import { exercises, workouts, workoutExercises, exerciseSets } from "./schema"

// Exercises relations
export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
  sets: many(exerciseSets),
}))

// Workouts relations
export const workoutsRelations = relations(workouts, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}))

// Workout exercises relations
export const workoutExercisesRelations = relations(workoutExercises, ({ one }) => ({
  workout: one(workouts, {
    fields: [workoutExercises.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
}))

// Exercise sets relations
export const exerciseSetsRelations = relations(exerciseSets, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseSets.exerciseId],
    references: [exercises.id],
  }),
}))
