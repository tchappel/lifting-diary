"use client";

import { DatePicker as BaseDatePicker } from "@/components/date-picker";
import { Label } from "@/components/ui/label";

export function DatePicker() {
  return (
    <div className="flex gap-3">
      <Label htmlFor="date" className="px-1">
        Workout Date
      </Label>
      <BaseDatePicker placeholder="Select a date" />
    </div>
  );
}
