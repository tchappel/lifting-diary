import { Suspense } from "react";
import { DatePicker } from "./components/date-picker";
import { WorkoutList } from "./components/workout-list";
import { WorkoutSkeleton } from "./components/workout-skeleton";

export default async function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Date Picker */}
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <DatePicker />
        </div>
        <Suspense fallback={<WorkoutSkeleton />}>
          <WorkoutList />
        </Suspense>
      </div>
    </div>
  );
}
