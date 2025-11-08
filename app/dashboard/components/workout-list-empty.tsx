import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";

export function WorkoutListEmpty() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No workouts scheduled for this day</p>
      </CardContent>
    </Card>
  );
}
