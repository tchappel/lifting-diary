import { WorkoutCard } from "@/app/dashboard/components/workout-card";
import { getWorkouts } from "@/data/workouts";
import { WorkoutListEmpty } from "./workout-list-empty";

type WorkoutListProps = {
  startDate: Date;
  endDate: Date;
};

export async function WorkoutList({ startDate, endDate }: WorkoutListProps) {
  const workouts = await getWorkouts({
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
      {workouts.map((workout) => (
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
