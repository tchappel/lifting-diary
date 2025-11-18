"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Dumbbell } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Dumbbell className="h-16 w-16 text-muted-foreground" />
              <AlertCircle className="h-8 w-8 text-destructive absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl">Workout Not Found</CardTitle>
          <CardDescription className="text-base">
            The workout you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workouts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
