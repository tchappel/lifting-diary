import { pgTable, uuid, text, integer, real, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Exercises table - user-created exercises
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
})

// Workouts table - workout sessions
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes"),
})

// Workout exercises junction table - links workouts to exercises
export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  exerciseOrder: integer("exercise_order").notNull(),
})

// Exercise sets table - individual sets for exercises
export const exerciseSets = pgTable("exercise_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  setOrder: integer("set_order").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight").notNull(),
  restTimeSeconds: integer("rest_time_seconds").notNull(),
})
