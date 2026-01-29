"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Coffee,
  Dumbbell,
  Play,
} from "lucide-react";

interface TodayWorkoutClientProps {
  program: {
    id: string;
    name: string;
    durationWeeks: number;
  };
  enrollment: {
    id: string;
    currentWeek: number;
    currentDay: number;
  };
  week: {
    id: string;
    weekNumber: number;
    name: string | null;
    focus: string | null;
  };
  workout: {
    id: string;
    dayNumber: number;
    name: string;
    notes: string | null;
    estimatedDuration: number | null;
    workoutPlanId: string | null;
  } | null;
}

export function TodayWorkoutClient({
  program,
  enrollment,
  week,
  workout,
}: TodayWorkoutClientProps) {
  const router = useRouter();

  const currentWeek = enrollment.currentWeek;
  const currentDay = enrollment.currentDay;

  const handleStartWorkout = () => {
    if (workout?.workoutPlanId) {
      router.push(`/workout/${workout.workoutPlanId}/start`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/program/${program.id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{program.name}</h1>
            <p className="text-xs text-muted-foreground">Today&apos;s Workout</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Progress Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            Week {currentWeek} of {program.durationWeeks}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Day {currentDay}
          </Badge>
        </div>

        {/* Week Focus */}
        {week.focus && (
          <Card className="bg-brand/5 border-brand/20">
            <CardContent className="py-3">
              <p className="text-sm">
                <span className="font-medium">Week Focus:</span> {week.focus}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Today's Workout */}
        {workout ? (
          <Card className="bg-gradient-to-br from-brand/10 to-energy/10 border-brand/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0">
                  <Dumbbell className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">
                    {workout.name}
                  </h2>
                  {workout.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {workout.notes}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {workout.estimatedDuration && (
                      <Badge variant="outline">
                        ~{workout.estimatedDuration} min
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {workout.workoutPlanId && (
                <Button
                  className="w-full mt-6 bg-brand-gradient"
                  size="lg"
                  onClick={handleStartWorkout}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Workout
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">No Workout Scheduled</h2>
              <p className="text-muted-foreground">
                This day doesn&apos;t have a workout assigned yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* View Full Schedule */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/program/${program.id}`)}
        >
          View Full Schedule
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
