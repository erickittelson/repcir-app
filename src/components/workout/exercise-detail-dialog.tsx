"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export interface ExerciseDetail {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  category: string;
  muscleGroups?: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  difficulty?: string | null;
  force?: string | null;
  mechanic?: string | null;
  benefits?: string[];
  progressions?: string[];
  imageUrl?: string | null;
  isCustom?: boolean;
}

interface ExerciseDetailDialogProps {
  exercise: ExerciseDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional action button to render at the bottom (e.g., "Add to Workout") */
  action?: React.ReactNode;
}

/**
 * Shared exercise detail dialog used by both the workout builder and chat workout card.
 * Shows exercise image, description, instructions, muscles, equipment, etc.
 */
export function ExerciseDetailDialog({
  exercise,
  open,
  onOpenChange,
  action,
}: ExerciseDetailDialogProps) {
  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {exercise.imageUrl && (
          <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden -mt-2 mb-2">
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exercise.name}
            {exercise.isCustom && (
              <Badge variant="secondary">Custom</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Category, difficulty, force, mechanic */}
          <div className="flex flex-wrap gap-2">
            <Badge>{exercise.category}</Badge>
            {exercise.difficulty && (
              <Badge variant="outline">{exercise.difficulty}</Badge>
            )}
            {exercise.force && (
              <Badge variant="outline" className="capitalize">{exercise.force}</Badge>
            )}
            {exercise.mechanic && (
              <Badge variant="outline" className="capitalize">{exercise.mechanic}</Badge>
            )}
          </div>

          {exercise.description && (
            <div>
              <h4 className="font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">
                {exercise.description}
              </p>
            </div>
          )}

          {exercise.benefits && exercise.benefits.length > 0 && (
            <div>
              <h4 className="font-medium mb-1 text-green-600 dark:text-green-400">What This Develops</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.benefits.map((benefit) => (
                  <Badge key={benefit} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 capitalize">
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {exercise.progressions && exercise.progressions.length > 0 && (
            <div>
              <h4 className="font-medium mb-1 text-blue-600 dark:text-blue-400">What This Leads To</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.progressions.map((prog) => (
                  <Badge key={prog} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {prog}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {exercise.instructions && (
            <div>
              <h4 className="font-medium mb-1">How To Do It</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {exercise.instructions}
              </p>
            </div>
          )}

          {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
            <div>
              <h4 className="font-medium mb-1">Primary Muscles</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.muscleGroups.map((muscle) => (
                  <Badge key={muscle} variant="secondary" className="capitalize">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
            <div>
              <h4 className="font-medium mb-1 text-muted-foreground">Secondary Muscles</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.secondaryMuscles.map((muscle) => (
                  <Badge key={muscle} variant="outline" className="capitalize text-muted-foreground">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {exercise.equipment && exercise.equipment.length > 0 && (
            <div>
              <h4 className="font-medium mb-1">Equipment</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.equipment.map((eq) => (
                  <Badge key={eq} variant="outline" className="capitalize">
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {action && (
            <div className="pt-2 border-t">
              {action}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to fetch exercise details by ID and manage dialog state.
 */
export function useExerciseDetail() {
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const showExercise = useCallback(async (exerciseId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`);
      if (res.ok) {
        const data = await res.json();
        setExercise(data);
        setOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch exercise:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return { exercise, open, loading, showExercise, close, setOpen };
}
