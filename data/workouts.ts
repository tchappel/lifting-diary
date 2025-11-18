import { db } from "@/db";
import { workouts } from "@/db/schema";
import { authClient, ForbiddenError } from "@/lib/auth";
import { and, desc, eq, gte, InferSelectModel, lt } from "drizzle-orm";
import "server-only";

export type Workout = InferSelectModel<typeof workouts>;

export type getWorkoutsParams = {
  filter?: {
    startDate?: Date;
    endDate?: Date;
  };
};

export async function getWorkouts({ filter }: getWorkoutsParams = {}): Promise<
  Workout[]
> {
  const { userId } = await authClient();

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

export async function getWorkoutWithExercisesAndSets(workoutId: string) {
  const { userId } = await authClient();

  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
    with: {
      exercises: {
        with: {
          sets: true,
        },
      },
    },
  });

  // Verify ownership
  if (workout && workout.userId !== userId) {
    throw new ForbiddenError();
  }

  return workout;
}

export type WorkoutWithExercisesAndSets = Exclude<
  Awaited<ReturnType<typeof getWorkoutWithExercisesAndSets>>,
  undefined
>;
