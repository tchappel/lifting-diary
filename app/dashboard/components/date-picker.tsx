"use client";

import { DatePicker as BaseDatePicker } from "@/components/date-picker";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type DatePickerProps = {
  initialValue?: Date;
};

export function DatePicker({ initialValue }: DatePickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (date?: Date) => {
    if (!date) return;
    const formattedDate = format(date, "yyyy-MM-dd");
    startTransition(() => {
      router.push(`/dashboard?date=${formattedDate}`);
    });
  };

  return (
    <div className="flex gap-3">
      <Label htmlFor="date" className="px-1">
        Workout Date
      </Label>
      <BaseDatePicker
        disabled={isPending}
        initialValue={initialValue}
        placeholder="Select a date"
        onSelect={handleSelect}
      />
    </div>
  );
}
