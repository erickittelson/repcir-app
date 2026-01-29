"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dumbbell,
  Target,
  TrendingUp,
  AlertTriangle,
  Play,
  Plus,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  difficulty?: string;
  benefits?: string[];
  contraindications?: string[];
  videoUrl?: string;
  imageUrl?: string;
}

interface ExerciseDetailSheetProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToWorkout?: (exercise: Exercise) => void;
}

export function ExerciseDetailSheet({
  exercise,
  open,
  onOpenChange,
  onAddToWorkout,
}: ExerciseDetailSheetProps) {
  if (!exercise) return null;

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-success/20 text-success";
      case "intermediate":
        return "bg-brand/20 text-brand";
      case "advanced":
        return "bg-energy/20 text-energy";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        
        <ScrollArea className="h-full">
          <div className="px-6 pb-8">
            <SheetHeader className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">{exercise.name}</SheetTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{exercise.category}</Badge>
                    {exercise.difficulty && (
                      <Badge className={getDifficultyColor(exercise.difficulty)}>
                        {exercise.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Video/Image Preview */}
            {(exercise.videoUrl || exercise.imageUrl) && (
              <div className="relative aspect-video rounded-xl bg-muted mb-6 overflow-hidden">
                {exercise.videoUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button size="lg" className="rounded-full h-16 w-16">
                      <Play className="h-8 w-8" />
                    </Button>
                  </div>
                ) : exercise.imageUrl ? (
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
            )}

            {/* Add to Workout */}
            {onAddToWorkout && (
              <Button
                className="w-full mb-6 bg-brand-gradient"
                onClick={() => onAddToWorkout(exercise)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Workout
              </Button>
            )}

            {/* Description */}
            {exercise.description && (
              <section className="mb-6">
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground">
                  {exercise.description}
                </p>
              </section>
            )}

            {/* Muscles */}
            <section className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-brand" />
                Muscles Worked
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Primary</p>
                  <div className="flex flex-wrap gap-2">
                    {exercise.primaryMuscles.map((muscle) => (
                      <Badge key={muscle} className="bg-brand/20 text-brand">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
                {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Secondary</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.secondaryMuscles.map((muscle) => (
                        <Badge key={muscle} variant="outline">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Equipment */}
            {exercise.equipment && exercise.equipment.length > 0 && (
              <section className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-energy" />
                  Equipment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Instructions */}
            {exercise.instructions && (
              <section className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-success" />
                  How to Perform
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {exercise.instructions}
                </p>
              </section>
            )}

            {/* Benefits */}
            {exercise.benefits && exercise.benefits.length > 0 && (
              <section className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Benefits
                </h3>
                <ul className="space-y-2">
                  {exercise.benefits.map((benefit, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Contraindications */}
            {exercise.contraindications && exercise.contraindications.length > 0 && (
              <section className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Cautions
                </h3>
                <ul className="space-y-2">
                  {exercise.contraindications.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
