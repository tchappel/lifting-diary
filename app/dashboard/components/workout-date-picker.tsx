"use client";

import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

type DatePickerProps = {
  date: Date | string;
};

export function WorkoutDatePicker({ date }: DatePickerProps) {
  const router = useRouter();
  const parsedDate = typeof date === "string" ? new Date(date) : date;

  function onSelect(date?: Date) {
    if (!date) return;
    const params = new URLSearchParams({});
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <Calendar
      mode="single"
      selected={parsedDate}
      captionLayout="dropdown"
      onSelect={onSelect}
      className="border rounded-xl p-2"
    />
  );
}
