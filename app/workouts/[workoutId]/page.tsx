import { getWorkoutWithExercisesAndSets } from "@/data/workouts";
import { notFound } from "next/navigation";
import { WorkoutDetail } from "./components/workout-detail";

type WorkoutDetailPageProps = {
  params: Promise<{
    workoutId: string;
  }>;
};

export default async function WorkoutDetailsPage({
  params,
}: WorkoutDetailPageProps) {
  const { workoutId } = await params;

  const workout = await getWorkoutWithExercisesAndSets(workoutId);

  if (!workout) {
    notFound();
  }

  return <WorkoutDetail workout={workout} />;
}
