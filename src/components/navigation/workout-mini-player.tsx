"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  ChevronUp,
  Dumbbell,
  X,
} from "lucide-react";

interface ActiveWorkout {
  id: string;
  name: string;
  startTime: Date;
  totalExercises: number;
  completedExercises: number;
  isPaused: boolean;
}

interface WorkoutMiniPlayerProps {
  className?: string;
}

export function WorkoutMiniPlayer({ className }: WorkoutMiniPlayerProps) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Check for active workout in localStorage
  useEffect(() => {
    const checkActiveWorkout = () => {
      const stored = localStorage.getItem("activeWorkout");
      if (stored) {
        try {
          const workout = JSON.parse(stored);
          workout.startTime = new Date(workout.startTime);
          setActiveWorkout(workout);
        } catch {
          localStorage.removeItem("activeWorkout");
        }
      } else {
        setActiveWorkout(null);
      }
    };

    checkActiveWorkout();
    
    // Listen for storage changes (other tabs)
    window.addEventListener("storage", checkActiveWorkout);
    
    // Also listen for custom events from same tab
    window.addEventListener("workoutStateChange", checkActiveWorkout);

    return () => {
      window.removeEventListener("storage", checkActiveWorkout);
      window.removeEventListener("workoutStateChange", checkActiveWorkout);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (!activeWorkout || activeWorkout.isPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor(
        (now.getTime() - activeWorkout.startTime.getTime()) / 1000
      );
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePause = () => {
    if (!activeWorkout) return;
    
    const updated = {
      ...activeWorkout,
      isPaused: !activeWorkout.isPaused,
    };
    localStorage.setItem("activeWorkout", JSON.stringify(updated));
    setActiveWorkout(updated);
    window.dispatchEvent(new Event("workoutStateChange"));
  };

  const endWorkout = () => {
    localStorage.removeItem("activeWorkout");
    setActiveWorkout(null);
    window.dispatchEvent(new Event("workoutStateChange"));
  };

  if (!activeWorkout) return null;

  const progress =
    (activeWorkout.completedExercises / activeWorkout.totalExercises) * 100;

  return (
    <div
      className={cn(
        "fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80",
        className
      )}
    >
      {/* Progress bar at top */}
      <Progress value={progress} className="h-0.5 rounded-none" />

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Workout icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/20">
          <Dumbbell className="h-5 w-5 text-brand" />
        </div>

        {/* Workout info */}
        <Link href={`/workout/${activeWorkout.id}`} className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">
            {activeWorkout.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTime(elapsedTime)} · {activeWorkout.completedExercises}/
            {activeWorkout.totalExercises} exercises
          </p>
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={togglePause}
            className="shrink-0"
          >
            {activeWorkout.isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>

          <Link href={`/workout/${activeWorkout.id}`}>
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <ChevronUp className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={endWorkout}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to start a workout (call from workout creation)
export function startWorkoutSession(workout: {
  id: string;
  name: string;
  totalExercises: number;
}) {
  const activeWorkout: ActiveWorkout = {
    ...workout,
    startTime: new Date(),
    completedExercises: 0,
    isPaused: false,
  };
  localStorage.setItem("activeWorkout", JSON.stringify(activeWorkout));
  window.dispatchEvent(new Event("workoutStateChange"));
}

// Helper to update workout progress
export function updateWorkoutProgress(completedExercises: number) {
  const stored = localStorage.getItem("activeWorkout");
  if (!stored) return;
  
  try {
    const workout = JSON.parse(stored);
    workout.completedExercises = completedExercises;
    localStorage.setItem("activeWorkout", JSON.stringify(workout));
    window.dispatchEvent(new Event("workoutStateChange"));
  } catch {
    // Ignore
  }
}
