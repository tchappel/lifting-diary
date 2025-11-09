import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

type WorkoutCardProps = {
  name: string;
  description: string;
  durationMinutes: number;
  date: Date;
};

export function WorkoutCard({
  name,
  description,
  durationMinutes,
  date,
}: WorkoutCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{name}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" aria-label="Created at" />
            {format(date, "do MMM yyyy")}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" aria-label="Duration" />
          {durationMinutes} min
        </div>
      </CardContent>
    </Card>
  );
}
