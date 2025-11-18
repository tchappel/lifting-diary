import {
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes"),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => workouts.id),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
});

export const exerciseSets = pgTable("exercise_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id),
  order: integer("order").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull(),
  restTimeSeconds: integer("rest_time_seconds").notNull(),
});
