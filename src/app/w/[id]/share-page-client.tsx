"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Clock,
  Flame,
  Star,
  CheckCircle2,
  Download,
} from "lucide-react";
import { RepcirLogo } from "@/components/ui/repcir-logo";

interface WorkoutData {
  id: string;
  name: string;
  date: Date;
  rating: number | null;
  durationMin: number | null;
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  totalVolume: number;
  exercises: Array<{
    name: string;
    category: string;
    completed: boolean;
    sets: Array<{
      reps: number | null;
      weight: number | null;
      duration: number | null;
      completed: boolean;
    }>;
  }>;
  user: {
    name: string;
    image: string | null;
  };
}

export function SharePageClient({ workout }: { workout: WorkoutData }) {
  const formattedDate = new Date(workout.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <RepcirLogo variant="icon" size="sm" />
            <span className="font-display text-lg tracking-wider text-brand">
              REPCIR
            </span>
          </div>
          <Button size="sm" asChild>
            <a href="/">Get Repcir</a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* User + Workout Title */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
          <h1 className="text-2xl font-bold">{workout.name}</h1>
          <p className="text-sm text-muted-foreground">
            Completed by{" "}
            <span className="font-medium text-foreground">
              {workout.user.name}
            </span>
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {workout.durationMin && (
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1 text-brand" />
                <p className="text-lg font-bold">{workout.durationMin}</p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  Minutes
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-3 text-center">
              <Dumbbell className="h-4 w-4 mx-auto mb-1 text-brand" />
              <p className="text-lg font-bold">{workout.totalSets}</p>
              <p className="text-[10px] text-muted-foreground uppercase">
                Sets
              </p>
            </CardContent>
          </Card>
          {workout.totalVolume > 0 && (
            <Card>
              <CardContent className="p-3 text-center">
                <Flame className="h-4 w-4 mx-auto mb-1 text-energy" />
                <p className="text-lg font-bold">
                  {workout.totalVolume.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  lbs
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Rating */}
        {workout.rating && (
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < workout.rating!
                    ? "fill-energy text-energy"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Exercises
          </h2>
          {workout.exercises.map((exercise, idx) => (
            <Card key={idx}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {exercise.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className="font-medium text-sm flex-1">
                    {exercise.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {exercise.category}
                  </Badge>
                </div>
                {exercise.sets.length > 0 && (
                  <div className="mt-2 ml-6 space-y-0.5">
                    {exercise.sets.map((set, setIdx) => (
                      <div
                        key={setIdx}
                        className="text-xs text-muted-foreground flex gap-2"
                      >
                        <span className="w-6 text-right font-mono">
                          {setIdx + 1}.
                        </span>
                        {set.weight != null && set.reps != null && (
                          <span>
                            {set.weight} lbs x {set.reps}
                          </span>
                        )}
                        {set.duration != null && (
                          <span>{set.duration}s</span>
                        )}
                        {!set.completed && (
                          <span className="text-muted-foreground/50">
                            (skipped)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-br from-brand/10 to-energy/10 border-brand/20">
          <CardContent className="p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <RepcirLogo variant="icon" size="sm" />
              <span className="font-display text-lg tracking-wider text-brand">
                REPCIR
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered workouts. Accountability circles. Results.
            </p>
            <Button className="w-full bg-brand hover:bg-brand/90 text-brand-foreground" asChild>
              <a href="/">
                <Download className="h-4 w-4 mr-2" />
                Try Repcir Free
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
