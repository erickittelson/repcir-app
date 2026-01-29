"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  Plus,
  Clock,
  Dumbbell,
  ChevronRight,
  MoreVertical,
  Loader2,
  X,
} from "lucide-react";
import { updateWorkoutProgress } from "@/components/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  completed: boolean;
}

interface WorkoutSession {
  id: string;
  name: string;
  startedAt: string;
  exercises: Exercise[];
  status: string;
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchWorkout();
  }, [workoutId]);

  useEffect(() => {
    if (!workout || isPaused) return;

    const interval = setInterval(() => {
      const start = new Date(workout.startedAt).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [workout, isPaused]);

  const fetchWorkout = async () => {
    try {
      const response = await fetch(`/api/workout-sessions/${workoutId}`);
      if (!response.ok) throw new Error("Failed to fetch workout");
      const data = await response.json();
      setWorkout(data);
    } catch (error) {
      toast.error("Failed to load workout");
      router.push("/activity");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedExercises = workout?.exercises.filter((e) => e.completed).length || 0;
  const totalExercises = workout?.exercises.length || 0;
  const progress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  const toggleExercise = async (exerciseId: string) => {
    if (!workout) return;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const newCompleted = !exercise.completed;
    
    // Optimistic update
    const updated = workout.exercises.map((e) =>
      e.id === exerciseId ? { ...e, completed: newCompleted } : e
    );
    setWorkout({ ...workout, exercises: updated });

    const completedCount = updated.filter((e) => e.completed).length;
    updateWorkoutProgress(completedCount);

    // Sync with backend
    try {
      await fetch(`/api/workout-sessions/${workoutId}/exercises/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch {
      // Revert on error
      setWorkout(workout);
      toast.error("Failed to sync exercise status");
    }
  };

  const completeWorkout = async () => {
    try {
      const response = await fetch(`/api/workout-sessions/${workoutId}/complete`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to complete workout");

      localStorage.removeItem("activeWorkout");
      window.dispatchEvent(new Event("workoutStateChange"));

      toast.success("Workout completed!");
      router.push("/activity");
    } catch (error) {
      toast.error("Failed to complete workout");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!workout) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Active Workout</p>
            <p className="font-semibold">{workout.name}</p>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      {/* Timer Card */}
      <div className="p-4">
        <Card className="bg-gradient-to-br from-brand/20 to-energy/10 border-brand/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-4xl font-bold font-mono">
                {formatTime(elapsedTime)}
              </p>
              <p className="text-sm text-muted-foreground">
                {completedExercises}/{totalExercises} exercises
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => {
                  if (confirm("End workout without completing?")) {
                    localStorage.removeItem("activeWorkout");
                    window.dispatchEvent(new Event("workoutStateChange"));
                    router.push("/activity");
                  }
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exercises */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Exercises</h2>
          <Button variant="ghost" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>

        {workout.exercises.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No exercises added yet</p>
              <Button variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Exercise
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {workout.exercises.map((exercise, index) => (
              <Card
                key={exercise.id}
                className={cn(
                  "transition-all",
                  exercise.completed && "opacity-60"
                )}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => toggleExercise(exercise.id)}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      exercise.completed
                        ? "border-success bg-success text-white"
                        : "border-border hover:border-brand"
                    )}
                  >
                    {exercise.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium",
                        exercise.completed && "line-through"
                      )}
                    >
                      {exercise.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{exercise.sets} sets</span>
                      {exercise.reps && <span>× {exercise.reps} reps</span>}
                      {exercise.weight && <span>@ {exercise.weight} lbs</span>}
                      {exercise.duration && <span>{exercise.duration}s</span>}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button
          onClick={completeWorkout}
          className="w-full bg-success-gradient h-12 text-lg"
          disabled={completedExercises === 0}
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Complete Workout
        </Button>
      </div>
    </div>
  );
}
