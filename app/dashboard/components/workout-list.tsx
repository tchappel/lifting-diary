import { WorkoutCard } from "@/app/dashboard/components/workout-card";
import { getWorkoutsByUserIdAndDate } from "@/data/workouts";
import { auth } from "@clerk/nextjs/server";
import { WorkoutListEmpty } from "./workout-list-empty";

type WorkoutListProps = {
  filterOptions: {
    date: Date;
  };
};

export async function WorkoutList({ filterOptions }: WorkoutListProps) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const workouts = await getWorkoutsByUserIdAndDate(
    userId,
    filterOptions?.date
  );

  if (workouts.length === 0) {
    return <WorkoutListEmpty />;
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          name={workout.name}
          description={workout.description}
          durationMinutes={workout.durationMinutes}
          date={workout.date}
        />
      ))}
    </div>
  );
}
