import { getWorkoutWithExercisesAndSets } from "@/data/workouts";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { WorkoutDetail } from "./components/workout-detail";

type WorkoutDetailPageProps = {
  params: Promise<{
    workoutId: string;
  }>;
};

export default async function WorkoutDetailsPage({
  params,
}: WorkoutDetailPageProps) {
  // Lightweight — only checks the session token from cookies/headers.
  const { userId } = await auth();
  console.log("🚀 ~ WorkoutDetailsPage ~ userId:", userId);

  if (!userId) {
    redirect("/");
  }

  const { workoutId } = await params;

  const workout = await getWorkoutWithExercisesAndSets({ workoutId, userId });

  if (!workout) {
    notFound();
  }

  return <WorkoutDetail workout={workout} />;
}
