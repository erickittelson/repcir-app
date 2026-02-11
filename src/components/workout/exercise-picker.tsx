"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Search,
  X,
  Plus,
  Check,
  Loader2,
  Dumbbell,
  Heart,
  Wind,
  Zap,
  Target,
  LayoutGrid,
  List,
  ChevronRight,
  Clock,
  Info,
  Play,
  AlertCircle,
  Sparkles,
  Flame,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  category: string;
  muscleGroups?: string[] | null;
  secondaryMuscles?: string[] | null;
  equipment?: string[] | null;
  difficulty?: string | null;
  force?: string | null;
  mechanic?: string | null;
  benefits?: string[] | null;
  progressions?: string[] | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  isCustom?: boolean;
}

export interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercises: (exercises: Exercise[]) => void;
  selectedExercises?: Exercise[];
  multiSelect?: boolean;
  title?: string;
  maxSelections?: number;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { id: "all", label: "All", icon: Dumbbell },
  { id: "strength", label: "Strength", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Heart },
  { id: "flexibility", label: "Stretch", icon: Wind },
  { id: "plyometric", label: "Plyo", icon: Zap },
  { id: "skill", label: "Skill", icon: Target },
] as const;

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "abs",
  "obliques",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "hip flexors",
  "lower back",
  "traps",
  "lats",
  "neck",
] as const;

const EQUIPMENT_OPTIONS = [
  { id: "bodyweight", label: "Bodyweight", icon: "🏃" },
  { id: "barbell", label: "Barbell", icon: "🏋️" },
  { id: "dumbbell", label: "Dumbbell", icon: "💪" },
  { id: "kettlebell", label: "Kettlebell", icon: "🔔" },
  { id: "cable", label: "Cable", icon: "🔗" },
  { id: "machine", label: "Machine", icon: "⚙️" },
  { id: "resistance band", label: "Band", icon: "🎗️" },
  { id: "pull-up bar", label: "Pull-up Bar", icon: "🪜" },
] as const;

const DIFFICULTY_LEVELS = [
  { id: "beginner", label: "Beginner", color: "text-green-400" },
  { id: "intermediate", label: "Intermediate", color: "text-amber-400" },
  { id: "advanced", label: "Advanced", color: "text-red-400" },
] as const;

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  back: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  shoulders: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  biceps: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  triceps: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  forearms: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  core: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  abs: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  obliques: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  quadriceps: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  hamstrings: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  glutes: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  calves: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "hip flexors": "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  "lower back": "bg-lime-500/20 text-lime-400 border-lime-500/30",
  traps: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  lats: "bg-blue-600/20 text-blue-300 border-blue-600/30",
  neck: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const QUICK_ADD_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Pull-up",
  "Overhead Press",
  "Barbell Row",
  "Dip",
  "Lunge",
];

// ============================================================================
// Utility Functions
// ============================================================================

function getMuscleColor(muscle: string): string {
  const key = muscle.toLowerCase();
  return MUSCLE_COLORS[key] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}

function getEquipmentIcon(equipment: string): string {
  const found = EQUIPMENT_OPTIONS.find(
    (e) => e.id.toLowerCase() === equipment.toLowerCase()
  );
  return found?.icon || "🔧";
}

// ============================================================================
// DifficultyIndicator Component
// ============================================================================

interface DifficultyIndicatorProps {
  difficulty?: string | null;
  size?: "sm" | "md";
}

function DifficultyIndicator({ difficulty, size = "sm" }: DifficultyIndicatorProps) {
  const levels = ["beginner", "intermediate", "advanced"];
  const currentLevel = levels.indexOf(difficulty?.toLowerCase() || "beginner");
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <div className="flex items-center gap-1" title={difficulty || "Unknown"}>
      {levels.map((level, index) => (
        <div
          key={level}
          className={cn(
            dotSize,
            "rounded-full transition-colors",
            index <= currentLevel
              ? index === 0
                ? "bg-green-400"
                : index === 1
                ? "bg-amber-400"
                : "bg-red-400"
              : "bg-zinc-700"
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// FilterChip Component
// ============================================================================

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

function FilterChip({ label, isActive, onClick, icon }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
        "border transition-all duration-200 whitespace-nowrap",
        "min-h-[36px] touch-manipulation",
        isActive
          ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
          : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
      {isActive && <X className="h-3 w-3 ml-0.5" />}
    </button>
  );
}

// ============================================================================
// ExerciseSearchResult Component
// ============================================================================

interface ExerciseSearchResultProps {
  exercise: Exercise;
  isSelected: boolean;
  onSelect: () => void;
  onShowDetails: () => void;
  viewMode: "grid" | "list";
}

function ExerciseSearchResult({
  exercise,
  isSelected,
  onSelect,
  onShowDetails,
  viewMode,
}: ExerciseSearchResultProps) {
  const primaryMuscles = exercise.muscleGroups?.slice(0, 3) || [];
  const equipmentList = exercise.equipment?.slice(0, 2) || [];

  if (viewMode === "grid") {
    return (
      <div
        className={cn(
          "relative group p-4 rounded-xl border transition-all duration-200",
          "bg-zinc-900/50 hover:bg-zinc-800/70",
          isSelected
            ? "border-amber-500/50 ring-1 ring-amber-500/20"
            : "border-zinc-800 hover:border-zinc-700"
        )}
      >
        {/* Selection indicator */}
        <button
          onClick={onSelect}
          className={cn(
            "absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center",
            "transition-all duration-200 z-10",
            isSelected
              ? "bg-amber-500 text-zinc-900"
              : "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200"
          )}
        >
          {isSelected ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>

        {/* Content */}
        <div className="pr-8">
          {/* Exercise name */}
          <h4 className="font-semibold text-zinc-100 mb-2 line-clamp-2">
            {exercise.name}
          </h4>

          {/* Muscle group badges */}
          <div className="flex flex-wrap gap-1 mb-3">
            {primaryMuscles.map((muscle) => (
              <span
                key={muscle}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border",
                  getMuscleColor(muscle)
                )}
              >
                {muscle}
              </span>
            ))}
          </div>

          {/* Equipment and difficulty row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {equipmentList.map((eq) => (
                <span key={eq} className="text-sm" title={eq}>
                  {getEquipmentIcon(eq)}
                </span>
              ))}
              {equipmentList.length === 0 && (
                <span className="text-xs text-zinc-500">No equipment</span>
              )}
            </div>
            <DifficultyIndicator difficulty={exercise.difficulty} />
          </div>
        </div>

        {/* Info button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowDetails();
          }}
          className={cn(
            "absolute bottom-3 right-3 h-6 w-6 rounded-full",
            "flex items-center justify-center",
            "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200",
            "opacity-60 hover:opacity-100 transition-opacity"
          )}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // List view
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        "bg-zinc-900/50 hover:bg-zinc-800/70",
        isSelected
          ? "border-amber-500/50 ring-1 ring-amber-500/20"
          : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Selection button */}
      <button
        onClick={onSelect}
        className={cn(
          "h-11 w-11 rounded-full flex-shrink-0 flex items-center justify-center",
          "transition-all duration-200",
          isSelected
            ? "bg-amber-500 text-zinc-900"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        )}
      >
        {isSelected ? (
          <Check className="h-5 w-5" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-zinc-100 truncate">{exercise.name}</h4>
          <DifficultyIndicator difficulty={exercise.difficulty} />
        </div>

        <div className="flex items-center gap-2">
          {/* Muscles */}
          <div className="flex gap-1 flex-wrap">
            {primaryMuscles.map((muscle) => (
              <span
                key={muscle}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border",
                  getMuscleColor(muscle)
                )}
              >
                {muscle}
              </span>
            ))}
          </div>

          {/* Equipment */}
          <div className="flex items-center gap-0.5 ml-auto">
            {equipmentList.map((eq) => (
              <span key={eq} className="text-sm" title={eq}>
                {getEquipmentIcon(eq)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Details button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShowDetails();
        }}
        className={cn(
          "h-11 w-11 rounded-full flex-shrink-0 flex items-center justify-center",
          "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
          "transition-colors"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ============================================================================
// ExerciseDetailSheet Component
// ============================================================================

interface ExerciseDetailSheetProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function ExerciseDetailSheet({
  exercise,
  isOpen,
  onClose,
  isSelected,
  onToggleSelect,
}: ExerciseDetailSheetProps) {
  if (!exercise) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl bg-zinc-950 border-zinc-800 p-0 flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="pb-24">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-bold text-zinc-100 pr-4">
                  {exercise.name}
                </h2>
                <DifficultyIndicator difficulty={exercise.difficulty} size="md" />
              </div>

              {/* Category & mechanic */}
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="capitalize">{exercise.category}</span>
                {exercise.mechanic && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="capitalize">{exercise.mechanic}</span>
                  </>
                )}
                {exercise.force && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="capitalize">{exercise.force}</span>
                  </>
                )}
              </div>
            </div>

            {/* Video/Image placeholder */}
            {exercise.videoUrl || exercise.imageUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 mb-6">
                {exercise.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-12 w-12 text-zinc-600" />
                  </div>
                )}
                {exercise.videoUrl && (
                  <button className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors">
                    <div className="h-16 w-16 rounded-full bg-amber-500/90 flex items-center justify-center">
                      <Play className="h-8 w-8 text-zinc-900 ml-1" />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900/50 border border-zinc-800 mb-6 flex items-center justify-center">
                <div className="text-center">
                  <Dumbbell className="h-12 w-12 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-600">No media available</p>
                </div>
              </div>
            )}

            {/* Muscle groups */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Muscles Worked
              </h3>
              <div className="flex flex-wrap gap-2">
                {exercise.muscleGroups?.map((muscle) => (
                  <span
                    key={muscle}
                    className={cn(
                      "text-sm px-3 py-1.5 rounded-full border font-medium",
                      getMuscleColor(muscle)
                    )}
                  >
                    {muscle}
                  </span>
                ))}
                {exercise.secondaryMuscles?.map((muscle) => (
                  <span
                    key={muscle}
                    className="text-sm px-3 py-1.5 rounded-full border bg-zinc-800/50 text-zinc-500 border-zinc-700"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>

            {/* Equipment */}
            {exercise.equipment && exercise.equipment.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Equipment Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.map((eq) => (
                    <div
                      key={eq}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <span className="text-lg">{getEquipmentIcon(eq)}</span>
                      <span className="text-sm text-zinc-300 capitalize">{eq}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {exercise.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-zinc-300 leading-relaxed">{exercise.description}</p>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Instructions
                </h3>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {exercise.instructions}
                </div>
              </div>
            )}

            {/* Benefits */}
            {exercise.benefits && exercise.benefits.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Benefits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.benefits.map((benefit) => (
                    <span
                      key={benefit}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      <Sparkles className="h-3 w-3" />
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progressions */}
            {exercise.progressions && exercise.progressions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Progressions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.progressions.map((prog) => (
                    <span
                      key={prog}
                      className="text-sm px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    >
                      {prog}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Add to workout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-8">
          <Button
            onClick={onToggleSelect}
            className={cn(
              "w-full h-14 text-lg font-semibold rounded-xl transition-all",
              isSelected
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 hover:from-amber-400 hover:to-orange-400"
            )}
          >
            {isSelected ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Added to Workout
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Add to Workout
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// QuickAddButtons Component
// ============================================================================

interface QuickAddButtonsProps {
  exercises: Exercise[];
  selectedIds: Set<string>;
  onToggleSelect: (exercise: Exercise) => void;
  recentExercises: Exercise[];
}

function QuickAddButtons({
  exercises,
  selectedIds,
  onToggleSelect,
  recentExercises,
}: QuickAddButtonsProps) {
  // Find matching exercises from the list
  const quickExercises = useMemo(() => {
    return QUICK_ADD_EXERCISES.map((name) =>
      exercises.find((e) => e.name.toLowerCase().includes(name.toLowerCase()))
    ).filter((e): e is Exercise => e !== undefined);
  }, [exercises]);

  const displayExercises = recentExercises.length > 0 ? recentExercises : quickExercises;
  const sectionTitle = recentExercises.length > 0 ? "Recent" : "Quick Add";

  if (displayExercises.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        {recentExercises.length > 0 ? (
          <Clock className="h-4 w-4 text-amber-500" />
        ) : (
          <Flame className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          {sectionTitle}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {displayExercises.slice(0, 8).map((exercise) => {
          const isSelected = selectedIds.has(exercise.id);
          return (
            <button
              key={exercise.id}
              onClick={() => onToggleSelect(exercise)}
              className={cn(
                "flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium",
                "border transition-all duration-200 whitespace-nowrap",
                "min-h-[44px] touch-manipulation",
                isSelected
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-600"
              )}
            >
              {isSelected && <Check className="h-4 w-4 inline mr-1.5" />}
              {exercise.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SelectedExercisesBadge Component
// ============================================================================

interface SelectedExercisesBadgeProps {
  count: number;
  onClick: () => void;
}

function SelectedExercisesBadge({ count, onClick }: SelectedExercisesBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-24 right-4 z-50",
        "flex items-center gap-2 px-4 py-2.5 rounded-full",
        "bg-amber-500 text-zinc-900 font-semibold shadow-lg",
        "hover:bg-amber-400 transition-all duration-200",
        "animate-in slide-in-from-bottom-5 fade-in"
      )}
    >
      <Activity className="h-4 w-4" />
      {count} selected
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

// ============================================================================
// SelectedExercisesSheet Component
// ============================================================================

interface SelectedExercisesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onRemove: (exerciseId: string) => void;
  onClear: () => void;
  onConfirm: () => void;
}

function SelectedExercisesSheet({
  isOpen,
  onClose,
  exercises,
  onRemove,
  onClear,
  onConfirm,
}: SelectedExercisesSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[60vh] rounded-t-2xl bg-zinc-950 border-zinc-800 p-0 flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <SheetHeader className="px-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-zinc-100">
              Selected Exercises ({exercises.length})
            </SheetTitle>
            {exercises.length > 0 && (
              <button
                onClick={onClear}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-zinc-700 mb-3" />
              <p className="text-zinc-500">No exercises selected</p>
              <p className="text-sm text-zinc-600 mt-1">
                Tap exercises to add them to your workout
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-200 truncate">
                      {exercise.name}
                    </p>
                    <div className="flex gap-1 mt-0.5">
                      {exercise.muscleGroups?.slice(0, 2).map((muscle) => (
                        <span
                          key={muscle}
                          className="text-[10px] text-zinc-500 capitalize"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(exercise.id)}
                    className="h-10 w-10 rounded-full flex items-center justify-center bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t border-zinc-800">
          <Button
            onClick={onConfirm}
            disabled={exercises.length === 0}
            className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {exercises.length} Exercise{exercises.length !== 1 ? "s" : ""} to Workout
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Main ExercisePicker Component
// ============================================================================

export function ExercisePicker({
  isOpen,
  onClose,
  onSelectExercises,
  selectedExercises = [],
  multiSelect = true,
  title = "Add Exercises",
  maxSelections,
}: ExercisePickerProps) {
  // State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<Map<string, Exercise>>(new Map());
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [showSelectedSheet, setShowSelectedSheet] = useState(false);
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize selected from props
  useEffect(() => {
    if (selectedExercises.length > 0) {
      const newMap = new Map<string, Exercise>();
      selectedExercises.forEach((ex) => newMap.set(ex.id, ex));
      setSelected(newMap);
    }
  }, [selectedExercises]);

  // Load recent exercises from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentExercises");
      if (stored) {
        setRecentExercises(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory && selectedCategory !== "all")
        params.set("category", selectedCategory);
      if (selectedMuscleGroup) params.set("muscleGroup", selectedMuscleGroup);
      if (selectedDifficulty) params.set("difficulty", selectedDifficulty);

      params.set("limit", "100");

      const response = await fetch(`/api/exercises?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      } else {
        toast.error("Failed to load exercises");
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchQuery, selectedCategory, selectedMuscleGroup, selectedDifficulty]);

  // Initial fetch
  useEffect(() => {
    if (isOpen) {
      fetchExercises();
    }
  }, [isOpen, fetchExercises]);

  // Handle search with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSearching(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // fetchExercises will be triggered by useEffect
    }, 300);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filter exercises by equipment (client-side since API doesn't support it well)
  const filteredExercises = useMemo(() => {
    if (!selectedEquipment) return exercises;
    return exercises.filter((ex) =>
      ex.equipment?.some((eq) =>
        eq.toLowerCase().includes(selectedEquipment.toLowerCase())
      )
    );
  }, [exercises, selectedEquipment]);

  // Toggle exercise selection
  const toggleSelect = useCallback(
    (exercise: Exercise) => {
      setSelected((prev) => {
        const newMap = new Map(prev);
        if (newMap.has(exercise.id)) {
          newMap.delete(exercise.id);
        } else {
          if (maxSelections && newMap.size >= maxSelections) {
            toast.error(`Maximum ${maxSelections} exercises allowed`);
            return prev;
          }
          newMap.set(exercise.id, exercise);

          // Add to recent exercises
          setRecentExercises((recent) => {
            const filtered = recent.filter((e) => e.id !== exercise.id);
            const updated = [exercise, ...filtered].slice(0, 10);
            try {
              localStorage.setItem("recentExercises", JSON.stringify(updated));
            } catch {
              // Ignore localStorage errors
            }
            return updated;
          });
        }
        return newMap;
      });

      if (!multiSelect) {
        onSelectExercises([exercise]);
        onClose();
      }
    },
    [multiSelect, maxSelections, onSelectExercises, onClose]
  );

  // Confirm selection
  const handleConfirm = useCallback(() => {
    const selectedArray = Array.from(selected.values());
    onSelectExercises(selectedArray);
    onClose();
  }, [selected, onSelectExercises, onClose]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setSelected(new Map());
  }, []);

  // Remove a single selection
  const handleRemoveSelection = useCallback((exerciseId: string) => {
    setSelected((prev) => {
      const newMap = new Map(prev);
      newMap.delete(exerciseId);
      return newMap;
    });
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedMuscleGroup(null);
    setSelectedEquipment(null);
    setSelectedDifficulty(null);
    setSearchQuery("");
  }, []);

  const selectedIds = useMemo(() => new Set(selected.keys()), [selected]);
  const selectedArray = useMemo(() => Array.from(selected.values()), [selected]);
  const hasActiveFilters =
    selectedMuscleGroup || selectedEquipment || selectedDifficulty || searchQuery;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[95vh] rounded-t-2xl bg-zinc-950 border-zinc-800 p-0 flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-zinc-900 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            )}
            <Input
              ref={searchInputRef}
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-12 text-base rounded-xl bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium",
                    "border transition-all duration-200 whitespace-nowrap",
                    "min-h-[40px] touch-manipulation flex-shrink-0",
                    isActive
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {/* Muscle group filter */}
            {selectedMuscleGroup ? (
              <FilterChip
                label={selectedMuscleGroup}
                isActive={true}
                onClick={() => setSelectedMuscleGroup(null)}
              />
            ) : (
              <div className="relative group">
                <select
                  value=""
                  onChange={(e) => setSelectedMuscleGroup(e.target.value || null)}
                  className="appearance-none px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600 cursor-pointer min-h-[36px]"
                >
                  <option value="">Muscle Group</option>
                  {MUSCLE_GROUPS.map((mg) => (
                    <option key={mg} value={mg}>
                      {mg}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Equipment filter */}
            {selectedEquipment ? (
              <FilterChip
                label={selectedEquipment}
                isActive={true}
                onClick={() => setSelectedEquipment(null)}
                icon={<span>{getEquipmentIcon(selectedEquipment)}</span>}
              />
            ) : (
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => setSelectedEquipment(e.target.value || null)}
                  className="appearance-none px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600 cursor-pointer min-h-[36px]"
                >
                  <option value="">Equipment</option>
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.icon} {eq.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Difficulty filter */}
            {selectedDifficulty ? (
              <FilterChip
                label={selectedDifficulty}
                isActive={true}
                onClick={() => setSelectedDifficulty(null)}
              />
            ) : (
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => setSelectedDifficulty(e.target.value || null)}
                  className="appearance-none px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600 cursor-pointer min-h-[36px]"
                >
                  <option value="">Difficulty</option>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-zinc-500 hover:text-zinc-300 whitespace-nowrap min-h-[36px]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4">
            {/* Quick add / Recent */}
            {!loading && exercises.length > 0 && !hasActiveFilters && (
              <QuickAddButtons
                exercises={exercises}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                recentExercises={recentExercises.filter((r) =>
                  exercises.some((e) => e.id === r.id)
                )}
              />
            )}

            {/* Loading state */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                <p className="text-zinc-500">Loading exercises...</p>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400 mb-2">No exercises found</p>
                <p className="text-sm text-zinc-600 mb-4">
                  Try adjusting your search or filters
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="border-zinc-700 text-zinc-400"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Results count */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-zinc-500">
                    {filteredExercises.length} exercise
                    {filteredExercises.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Exercise grid/list */}
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-2 gap-3"
                      : "flex flex-col gap-2"
                  )}
                >
                  {filteredExercises.map((exercise) => (
                    <ExerciseSearchResult
                      key={exercise.id}
                      exercise={exercise}
                      isSelected={selectedIds.has(exercise.id)}
                      onSelect={() => toggleSelect(exercise)}
                      onShowDetails={() => setDetailExercise(exercise)}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Bottom padding for floating elements */}
            <div className="h-32" />
          </div>
        </ScrollArea>

        {/* Footer */}
        {multiSelect && (
          <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-zinc-950">
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {selected.size === 0 ? (
                "Select Exercises"
              ) : (
                <>
                  Add {selected.size} Exercise{selected.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Selected exercises badge */}
        {multiSelect && (
          <SelectedExercisesBadge
            count={selected.size}
            onClick={() => setShowSelectedSheet(true)}
          />
        )}

        {/* Exercise detail sheet */}
        <ExerciseDetailSheet
          exercise={detailExercise}
          isOpen={detailExercise !== null}
          onClose={() => setDetailExercise(null)}
          isSelected={detailExercise ? selectedIds.has(detailExercise.id) : false}
          onToggleSelect={() => {
            if (detailExercise) {
              toggleSelect(detailExercise);
            }
          }}
        />

        {/* Selected exercises management sheet */}
        <SelectedExercisesSheet
          isOpen={showSelectedSheet}
          onClose={() => setShowSelectedSheet(false)}
          exercises={selectedArray}
          onRemove={handleRemoveSelection}
          onClear={handleClearAll}
          onConfirm={() => {
            setShowSelectedSheet(false);
            handleConfirm();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

export default ExercisePicker;
