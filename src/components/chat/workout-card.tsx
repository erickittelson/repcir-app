"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Play,
  Save,
  Pencil,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { GeneratedWorkout, ActionData } from "@/lib/ai/structured-chat";
import { WorkoutFeedback } from "@/components/ai/workout-feedback";
import { ExerciseDetailDialog, useExerciseDetail } from "@/components/workout/exercise-detail-dialog";

interface WorkoutCardProps {
  workout: GeneratedWorkout;
  planId?: string;
  actions: ActionData[];
  onAction?: (action: string, planId?: string) => void;
  memberId: string;
}

export function WorkoutCard({
  workout,
  planId,
  actions,
  onAction,
  memberId,
}: WorkoutCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const exerciseDetail = useExerciseDetail();

  // Save workout (undraft the existing plan created during generation)
  const saveWorkout = async (): Promise<string> => {
    if (savedPlanId) return savedPlanId;
    if (!planId) throw new Error("No workout plan to save");

    const response = await fetch(`/api/workout-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDraft: false }),
    });

    if (!response.ok) {
      throw new Error("Failed to save workout");
    }

    setSavedPlanId(planId);
    return planId;
  };

  // Start a workout session
  const startWorkoutSession = async (workoutPlanId: string): Promise<string> => {
    const response = await fetch("/api/workout-sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: workoutPlanId,
        memberId: memberId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to start workout session");
    }

    const data = await response.json();
    return data.id;
  };

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case "start_workout": {
          setIsStarting(true);

          // Save if not already saved
          const workoutPlanId = await saveWorkout();

          // Start session
          const sessionId = await startWorkoutSession(workoutPlanId);

          // Navigate to active workout
          router.push(`/workouts/active/${sessionId}`);

          onAction?.(action, workoutPlanId);
          break;
        }

        case "save_plan": {
          setIsSaving(true);

          const workoutPlanId = await saveWorkout();

          toast.success("Workout saved! Access it anytime from the Workouts tab.", { duration: 5000 });
          onAction?.(action, workoutPlanId);
          setIsSaving(false);
          break;
        }

        case "modify": {
          // Save first so the builder can load the plan
          const modifyPlanId = await saveWorkout();
          onAction?.(action, modifyPlanId);
          router.push(`/workout/${modifyPlanId}/edit`);
          break;
        }

        case "regenerate": {
          onAction?.(action);
          break;
        }
      }
    } catch (error) {
      console.error("Workout action error:", error);
      toast.error("Something went wrong. Please try again.");
      setIsStarting(false);
      setIsSaving(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "start_workout":
        return isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />;
      case "save_plan":
        if (savedPlanId && !isSaving) return <Check className="h-4 w-4" />;
        return isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />;
      case "modify":
        return <Pencil className="h-4 w-4" />;
      case "regenerate":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getButtonVariant = (variant: string) => {
    switch (variant) {
      case "primary":
        return "default";
      case "secondary":
        return "secondary";
      case "outline":
        return "outline";
      default:
        return "default";
    }
  };

  // Visible exercises (4 or all if expanded)
  const visibleExercises = isExpanded ? workout.exercises : workout.exercises.slice(0, 4);
  const hiddenCount = workout.exercises.length - 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border bg-card overflow-hidden shadow-sm"
    >
      {/* Header with gradient */}
      <div className="p-4 bg-brand-gradient text-white">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg">{workout.name}</h3>
          {workout.structure && workout.structure !== "standard" && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/20 text-white">
              {workout.structure.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-white/80 mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {workout.estimatedDuration} min
          </span>
          <span className="capitalize">{workout.difficulty}</span>
        </div>
      </div>

      {/* Description */}
      {workout.description && (
        <div className="px-4 pt-3">
          <p className="text-sm text-muted-foreground">{workout.description}</p>
        </div>
      )}

      {/* Warmup */}
      {workout.warmup && workout.warmup.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Warmup</p>
          <p className="text-sm text-foreground/70">{workout.warmup.join(" | ")}</p>
        </div>
      )}

      {/* Exercise list */}
      <div className="p-4 space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Exercises</p>

        {visibleExercises.map((exercise, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {exercise.exerciseId ? (
                  <button
                    onClick={() => exerciseDetail.showExercise(exercise.exerciseId!)}
                    className="text-sm font-medium text-left underline decoration-dotted underline-offset-2 decoration-brand/40 hover:text-brand transition-colors"
                  >
                    {exercise.name}
                  </button>
                ) : (
                  <span className="text-sm font-medium">{exercise.name}</span>
                )}
                {exercise.supersetGroup && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500">
                    Superset {exercise.supersetGroup}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{exercise.sets}x{exercise.reps}</span>
                {exercise.restSeconds && exercise.restSeconds > 0 && (
                  <span>| {exercise.restSeconds}s rest</span>
                )}
              </div>
              {/* Rx weights for large groups */}
              {exercise.rxWeights && (exercise.rxWeights.rxMen || exercise.rxWeights.rxWomen) && (
                <div className="mt-1 flex items-center gap-3 text-xs">
                  {exercise.rxWeights.rxMen && (
                    <span className="text-blue-500">Rx Men: {exercise.rxWeights.rxMen}</span>
                  )}
                  {exercise.rxWeights.rxWomen && (
                    <span className="text-pink-500">Rx Women: {exercise.rxWeights.rxWomen}</span>
                  )}
                </div>
              )}
              {/* Individual member prescriptions (small groups) */}
              {exercise.memberPrescriptions && exercise.memberPrescriptions.length > 0 && !exercise.rxWeights && (
                <div className="mt-1 space-y-0.5">
                  {exercise.memberPrescriptions.map((rx, rxIdx) => {
                    const isSolo = exercise.memberPrescriptions!.length === 1;
                    const prescription = rx.weight || rx.bodyweightMod || rx.cardioTarget || "standard";
                    const rpe = rx.rpeTarget ? ` @ RPE ${rx.rpeTarget}` : "";
                    return (
                      <div key={rxIdx} className="text-xs text-brand/80">
                        {isSolo ? `${prescription}${rpe}` : `${rx.memberName}: ${prescription}${rpe}`}
                      </div>
                    );
                  })}
                </div>
              )}
              {exercise.notes && (
                <p className="text-xs text-muted-foreground/70 mt-1 italic">{exercise.notes}</p>
              )}
            </div>
          </motion.div>
        ))}

        {/* Expand/collapse button */}
        {workout.exercises.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2 text-xs text-muted-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                +{hiddenCount} more exercises
              </>
            )}
          </Button>
        )}
      </div>

      {/* Cooldown */}
      {workout.cooldown && workout.cooldown.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cooldown</p>
          <p className="text-sm text-foreground/70">{workout.cooldown.join(" | ")}</p>
        </div>
      )}

      {/* Feedback + Action buttons */}
      <div className="p-4 border-t bg-muted/30 space-y-3">
        <WorkoutFeedback
          workoutPlanId={savedPlanId || undefined}
          memberId={memberId}
        />
        {/* Primary actions */}
        <div className="flex gap-2">
          {actions.filter(a => a.variant === "primary" || a.variant === "secondary").map((action) => (
            <Button
              key={action.id}
              variant={getButtonVariant(action.variant)}
              onClick={() => handleAction(action.action)}
              disabled={
                isStarting ||
                isSaving ||
                (action.action === "save_plan" && !!savedPlanId)
              }
              className={cn(
                "flex-1",
                action.variant === "primary" && "bg-brand-gradient hover:opacity-90"
              )}
            >
              {getActionIcon(action.action)}
              <span className="ml-2">
                {action.action === "save_plan" && savedPlanId ? "Saved" : action.label}
              </span>
            </Button>
          ))}
        </div>
        {/* Secondary actions (modify, regenerate) */}
        {actions.filter(a => a.variant === "outline").length > 0 && (
          <div className="flex gap-2">
            {actions.filter(a => a.variant === "outline").map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleAction(action.action)}
                disabled={isStarting || isSaving}
                className="flex-1 text-xs"
              >
                {getActionIcon(action.action)}
                <span className="ml-1.5">{action.label}</span>
              </Button>
            ))}
          </div>
        )}
        {/* Chat modification hint */}
        <p className="text-[11px] text-muted-foreground/60 text-center pt-1">
          Want changes? Just tell me what to adjust in the chat below.
        </p>
      </div>

      {/* Exercise detail dialog */}
      <ExerciseDetailDialog
        exercise={exerciseDetail.exercise}
        open={exerciseDetail.open}
        onOpenChange={exerciseDetail.setOpen}
      />
    </motion.div>
  );
}
