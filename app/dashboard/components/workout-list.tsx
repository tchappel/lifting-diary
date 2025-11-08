import { WorkoutCard } from "@/app/dashboard/components/workout-card";

const mockWorkouts = [
  {
    id: "1",
    name: "Upper Body Strength",
    description: "Focus on chest and triceps",
    date: new Date(2025, 10, 8),
    durationMinutes: 60,
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { reps: 8, weight: 80, restTimeSeconds: 120 },
          { reps: 8, weight: 85, restTimeSeconds: 120 },
          { reps: 6, weight: 90, restTimeSeconds: 180 },
        ],
      },
      {
        name: "Incline Dumbbell Press",
        sets: [
          { reps: 10, weight: 30, restTimeSeconds: 90 },
          { reps: 10, weight: 32.5, restTimeSeconds: 90 },
          { reps: 8, weight: 35, restTimeSeconds: 90 },
        ],
      },
      {
        name: "Tricep Dips",
        sets: [
          { reps: 12, weight: 0, restTimeSeconds: 60 },
          { reps: 10, weight: 10, restTimeSeconds: 60 },
          { reps: 8, weight: 15, restTimeSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "Morning Cardio",
    description: "Light cardio session",
    date: new Date(2025, 10, 8),
    durationMinutes: 30,
    exercises: [
      {
        name: "Treadmill Running",
        sets: [{ reps: 1, weight: 0, restTimeSeconds: 0 }],
      },
    ],
  },
] as const;

export async function WorkoutList() {
  return (
    <div className="space-y-4">
      {mockWorkouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          name={workout.name}
          description={workout.description}
          durationMinutes={workout.durationMinutes}
          createdAt={workout.date}
        />
      ))}
    </div>
  );
}
