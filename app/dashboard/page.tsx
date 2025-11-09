import { TZDate } from "@date-fns/tz";
import { format, isValid, parse } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DatePicker } from "./components/date-picker";
import { WorkoutList } from "./components/workout-list";
import { WorkoutSkeleton } from "./components/workout-skeleton";

type DashboardPageProps = {
  searchParams: Promise<{
    date?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { date } = await searchParams;
  const cookieStore = await cookies();

  // Get user timezone (default to UTC)
  const timezone = cookieStore.get("user_timezone")?.value || "UTC";

  // Get today's date in user's timezone
  const today = format(new TZDate(new Date(), timezone), "yyyy-MM-dd");

  // If no query param date → redirect to /dashboard?date=${today} in "yyyy-MM-dd" format
  if (!date) {
    redirect(`/dashboard?date=${today}`);
  }

  // If there is date query param date

  // Validate date param (fix this)
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  const valid = isValid(parsed) && format(parsed, "yyyy-MM-dd") === date;

  if (!valid) {
    redirect(`/dashboard?date=${today}`);
  }

  // if valid, pass a Date to DatePicker and to WorkoutList

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Date Picker */}
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <DatePicker initialValue={parsed} />
        <Suspense fallback={<WorkoutSkeleton />}>
          <WorkoutList filterOptions={{ date: parsed }} />
        </Suspense>
      </div>
    </div>
  );
}
