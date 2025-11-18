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
import { format, intervalToDuration } from "date-fns";
import { Calendar, Clock, Dumbbell, Hash, Timer, Weight } from "lucide-react";

type WorkoutDetailProps = {
  workout: WorkoutWithExercisesAndSets;
};

export function WorkoutDetail({ workout }: WorkoutDetailProps) {
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
    const hours = duration.hours ?? 0;
    const mins = duration.minutes ?? 0;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatRestTime = (seconds: number) => {
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    const mins = duration.minutes ?? 0;
    const secs = duration.seconds ?? 0;
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
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
                {workout.date && format(workout.date, "EEEE, MMMM d, yyyy")}
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
                    {set.order !== exercise.sets.length && <Separator />}
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
