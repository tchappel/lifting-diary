import { WorkoutCard } from "@/app/dashboard/components/workout-card";
import { getWorkouts, type Workout } from "@/data/workouts";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { WorkoutListEmpty } from "./workout-list-empty";

type WorkoutListProps = {
  startDate: Date;
  endDate: Date;
};

export async function WorkoutList({ startDate, endDate }: WorkoutListProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const workouts = await getWorkouts({
    userId,
    filter: {
      startDate,
      endDate,
    },
  });

  if (!workouts || workouts.length === 0) {
    return <WorkoutListEmpty />;
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout: Workout) => (
        <WorkoutCard
          key={workout.id}
          id={workout.id}
          name={workout.name}
          description={workout.description}
          durationMinutes={workout.durationMinutes}
          date={workout.date}
        />
      ))}
    </div>
  );
}
