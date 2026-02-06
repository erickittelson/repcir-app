"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutBuilder, type WorkoutPlan } from "@/components/workout/workout-builder";
import { toast } from "sonner";

export default function NewWorkout() {
  const router = useRouter();
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available exercises
  useEffect(() => {
    async function fetchExercises() {
      try {
        const response = await fetch("/api/exercises");
        if (response.ok) {
          const data = await response.json();
          // API returns array directly
          setExercises(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch exercises:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchExercises();
  }, []);

  const handleSave = async (plan: WorkoutPlan) => {
    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plan.name,
          description: plan.description,
          category: plan.category,
          difficulty: plan.difficulty,
          estimatedDuration: plan.estimatedDuration,
          exercises: plan.exercises.map((ex) => ({
            name: ex.exercise.name,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restBetweenSets,
            notes: ex.notes,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create workout");
      }

      toast.success("Workout created!");
      router.push("/workouts");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save workout");
      throw error;
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-muted-foreground">Loading exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Create Workout</h1>
            <p className="text-sm text-muted-foreground">
              Build a custom workout routine
            </p>
          </div>
        </div>
      </header>

      {/* Workout Builder */}
      <main className="p-4">
        <WorkoutBuilder
          availableExercises={exercises}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
