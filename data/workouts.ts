import { db } from "@/db";
import { workouts } from "@/db/schema";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import "server-only";

export async function getWorkoutsByUserId(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date));
}

export async function getWorkoutsByUserIdAndDate(userId: string, date: Date) {
  // Get start of day (00:00:00) and end of day (23:59:59.999)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.date, startOfDay),
        lt(workouts.date, endOfDay)
      )
    )
    .orderBy(desc(workouts.date));
}
