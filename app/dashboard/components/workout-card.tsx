import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type WorkoutCardProps = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  date: Date;
};

export function WorkoutCard({
  id,
  name,
  description,
  durationMinutes,
  date,
}: WorkoutCardProps) {
  return (
    <Link href={`/workouts/${id}`} className="block">
      <Card className="transition-colors hover:bg-accent">
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
          {durationMinutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-label="Duration" />
              {durationMinutes} min
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
