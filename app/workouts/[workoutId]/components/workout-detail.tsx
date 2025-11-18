import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WorkoutWithExercisesAndSets } from "@/data/workouts";
import { Calendar, Clock, Dumbbell, Hash, Timer, Weight } from "lucide-react";

type WorkoutDetailProps = {
  workout: WorkoutWithExercisesAndSets;
};

export function WorkoutDetail({ workout }: WorkoutDetailProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Workout Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{workout.name}</CardTitle>
          {workout.description && (
            <CardDescription className="text-base">
              {workout.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {workout.date && formatDate(workout.date)}
              </span>
            </div>
            {workout.durationMinutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {formatDuration(workout.durationMinutes)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {workout.exercises.length ?? 0}{" "}
                {workout.exercises.length === 1 ? "exercise" : "exercises"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises */}
      <div className="space-y-4">
        {workout.exercises.map((exercise, index) => (
          <Card key={exercise.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      #{index + 1}
                    </Badge>
                    <CardTitle className="text-xl">{exercise.name}</CardTitle>
                  </div>
                  {exercise.description && (
                    <CardDescription>{exercise.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exercise.sets.map((set) => (
                  <div key={set.id}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-4">
                        <Badge
                          variant="secondary"
                          className="w-16 justify-center font-mono"
                        >
                          Set {set.order}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {set.reps} reps
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {set.weightKg} kg
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Timer className="h-4 w-4" />
                        <span className="text-sm">
                          {formatRestTime(set.restTimeSeconds)} rest
                        </span>
                      </div>
                    </div>
                    {set.order < (exercise.sets.length ?? 0) && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
