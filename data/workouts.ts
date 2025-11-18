import { db } from "@/db";
import { workouts } from "@/db/schema";
import { and, desc, eq, gte, InferSelectModel, lt } from "drizzle-orm";
import "server-only";

export type Workout = InferSelectModel<typeof workouts>;

export type getWorkoutsParams = {
  userId: string;
  filter?: {
    startDate?: Date;
    endDate?: Date;
  };
};

export async function getWorkouts({
  userId,
  filter,
}: getWorkoutsParams): Promise<Workout[]> {
  const conditions = [eq(workouts.userId, userId)];

  if (filter?.startDate && filter?.endDate) {
    conditions.push(
      gte(workouts.date, filter.startDate),
      lt(workouts.date, filter.endDate)
    );
  } else if (filter?.startDate) {
    conditions.push(gte(workouts.date, filter.startDate));
  } else if (filter?.endDate) {
    conditions.push(lt(workouts.date, filter.endDate));
  }

  return await db
    .select()
    .from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.date));
}

export async function getWorkoutWithExercisesAndSets({
  workoutId,
  userId,
}: {
  workoutId: string;
  userId: string;
}) {
  return await db.query.workouts.findFirst({
    where: and(eq(workouts.id, workoutId), eq(workouts.userId, userId)),
    with: {
      exercises: {
        with: {
          sets: true,
        },
      },
    },
  });
}

export type WorkoutWithExercisesAndSets = Exclude<
  Awaited<ReturnType<typeof getWorkoutWithExercisesAndSets>>,
  undefined
>;
