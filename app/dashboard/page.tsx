import { TZDate } from "@date-fns/tz";
import {
  endOfDay,
  format,
  isValid as isValidDate,
  parseISO,
  startOfDay,
} from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { WorkoutDatePicker } from "./components/workout-date-picker";
import { WorkoutList } from "./components/workout-list";
import { WorkoutSkeleton } from "./components/workout-skeleton";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((val) => isValidDate(parseISO(val)), "Invalid date");

type SearchParams = {
  date?: string;
};

type DashboardPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { date: dateParam } = await searchParams;

  const cookieStore = await cookies();
  const userTimezone = cookieStore.get("user_timezone")?.value || "UTC";
  const isValidDateParam =
    !!dateParam && dateSchema.safeParse(dateParam).success;

  if (!isValidDateParam) {
    const today = new TZDate(new Date(), userTimezone);
    const params = new URLSearchParams();
    params.set("date", format(today, "yyyy-MM-dd"));
    redirect(`/dashboard?${params.toString()}`);
  }

  const date = new TZDate(parseISO(dateParam!), userTimezone);
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Dashboard
      </h1>
      <p className="text-muted-foreground mb-6">
        Track your workouts and progress
      </p>
      <div className="flex gap-4">
        <div className="shrink-0">
          <WorkoutDatePicker date={date} />
        </div>
        <div className="flex-1">
          <Suspense fallback={<WorkoutSkeleton />}>
            <WorkoutList startDate={startDate} endDate={endDate} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
