"use client";

import { useRouter } from "next/navigation";
import { WorkoutBuilderV2, type WorkoutPlan } from "@/components/workout/workout-builder-v2";
import { toast } from "sonner";

export default function NewWorkout() {
  const router = useRouter();

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
          structureType: plan.structureType,
          timeCapSeconds: plan.timeCapSeconds,
          roundsTarget: plan.roundsTarget,
          emomIntervalSeconds: plan.emomIntervalSeconds,
          estimatedDuration: plan.estimatedDuration,
          exercises: plan.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.exercise.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restSeconds: ex.restBetweenSets,
            notes: ex.notes,
            order: ex.order,
            groupId: ex.groupId,
            groupType: ex.groupType,
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

  return (
    <div className="p-4">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Workout</h1>
        <p className="text-sm text-muted-foreground">
          Build a custom workout routine
        </p>
      </div>

      {/* Workout Builder V2 - No upfront exercise loading */}
      <WorkoutBuilderV2
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
