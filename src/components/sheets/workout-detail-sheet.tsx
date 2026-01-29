"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dumbbell,
  Clock,
  Star,
  Bookmark,
  Play,
  Copy,
  Share2,
  Users,
  Zap,
  Target,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Timer,
  Repeat,
  TrendingUp,
  Award,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExerciseDetailSheet } from "./exercise-detail-sheet";

interface WorkoutExercise {
  id: string;
  exerciseId?: string; // The actual exercise ID for fetching details
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  duration?: number;
  distance?: string;
  notes?: string;
  order: number;
  groupId?: string;
  groupType?: string;
  // Exercise details for inline display
  imageUrl?: string;
  primaryMuscles?: string[];
}

interface WorkoutDetail {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  structureType?: string;
  timeCapSeconds?: number;
  roundsTarget?: number;
  scoringType?: string;
  targetMuscles?: string[];
  equipmentRequired?: string[];
  exercises: WorkoutExercise[];
  // Stats
  saveCount: number;
  useCount?: number;
  avgRating?: number;
  reviewCount?: number;
  // Attribution
  isOfficial?: boolean;
  isFeatured?: boolean;
  creatorName?: string;
  // Program association
  programs?: Array<{ id: string; name: string }>;
}

interface WorkoutDetailSheetProps {
  workoutId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart?: (workoutId: string) => void;
}

export function WorkoutDetailSheet({
  workoutId,
  open,
  onOpenChange,
  onStart,
}: WorkoutDetailSheetProps) {
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<{
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
  } | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(false);

  useEffect(() => {
    if (open && workoutId) {
      setLoading(true);
      fetch(`/api/workouts/${workoutId}`)
        .then((res) => res.json())
        .then((data) => {
          setWorkout(data);
          setIsSaved(data.isSaved || false);
        })
        .catch(() => toast.error("Failed to load workout"))
        .finally(() => setLoading(false));
    }
  }, [open, workoutId]);

  const handleSave = async () => {
    if (!workoutId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/save`, {
        method: isSaved ? "DELETE" : "POST",
      });
      if (res.ok) {
        setIsSaved(!isSaved);
        toast.success(isSaved ? "Removed from saved" : "Saved to library!");
      }
    } catch {
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!workoutId) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Workout duplicated! You can now customize it.", {
          action: {
            label: "Edit",
            onClick: () => router.push(`/workout/${data.id}/edit`),
          },
        });
      }
    } catch {
      toast.error("Failed to duplicate workout");
    } finally {
      setDuplicating(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/workout/${workoutId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share it on your socials.");
  };

  const handleStart = async () => {
    if (!workoutId) return;
    if (onStart) {
      onStart(workoutId);
    } else {
      router.push(`/workout/${workoutId}/start`);
    }
  };

  const handleExerciseClick = async (exercise: WorkoutExercise) => {
    if (!exercise.exerciseId) return;
    
    setLoadingExercise(true);
    try {
      const res = await fetch(`/api/exercises/${exercise.exerciseId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedExercise({
          id: data.id,
          name: data.name,
          description: data.description,
          instructions: data.instructions,
          category: data.category || "strength",
          primaryMuscles: data.muscleGroups || [],
          secondaryMuscles: data.secondaryMuscles || [],
          equipment: data.equipment || [],
          difficulty: data.difficulty,
          benefits: data.benefits || [],
          contraindications: data.contraindications || [],
          videoUrl: data.videoUrl,
          imageUrl: data.imageUrl,
        });
      }
    } catch {
      toast.error("Failed to load exercise details");
    } finally {
      setLoadingExercise(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "intermediate":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "advanced":
        return "bg-orange-500/20 text-orange-600 border-orange-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStructureIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "emom":
        return <Timer className="h-4 w-4" />;
      case "amrap":
        return <Repeat className="h-4 w-4" />;
      case "for_time":
        return <Clock className="h-4 w-4" />;
      case "tabata":
        return <Zap className="h-4 w-4" />;
      default:
        return <Dumbbell className="h-4 w-4" />;
    }
  };

  const formatStructureType = (type?: string) => {
    if (!type) return "Standard";
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        
        {/* Accessible title - always present for screen readers */}
        {(loading || !workout) && (
          <SheetHeader className="sr-only">
            <SheetTitle>Workout Details</SheetTitle>
          </SheetHeader>
        )}

        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : workout ? (
          <ScrollArea className="h-full">
            <div className="px-6 pb-32">
              <SheetHeader className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {workout.isOfficial && (
                        <Badge className="bg-brand text-white text-[10px]">
                          Official
                        </Badge>
                      )}
                      {workout.isFeatured && (
                        <Badge className="bg-energy text-white text-[10px]">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-xl">{workout.title}</SheetTitle>
                    {workout.creatorName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        by {workout.creatorName}
                      </p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 mb-4">
                {workout.difficulty && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getDifficultyColor(workout.difficulty))}
                  >
                    {workout.difficulty}
                  </Badge>
                )}
                {workout.category && (
                  <Badge variant="outline" className="text-xs">
                    {workout.category}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  {getStructureIcon(workout.structureType)}
                  {formatStructureType(workout.structureType)}
                </Badge>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                {workout.estimatedDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {workout.estimatedDuration} min
                  </span>
                )}
                {workout.avgRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {workout.avgRating.toFixed(1)}
                    {workout.reviewCount && (
                      <span className="text-xs">({workout.reviewCount})</span>
                    )}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Bookmark className="h-4 w-4" />
                  {workout.saveCount} saves
                </span>
                {workout.useCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {workout.useCount} uses
                  </span>
                )}
              </div>

              {/* Description */}
              {workout.description && (
                <section className="mb-6">
                  <p className="text-sm text-muted-foreground">
                    {workout.description}
                  </p>
                </section>
              )}

              {/* Structure Details */}
              {(workout.timeCapSeconds || workout.roundsTarget) && (
                <section className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-energy" />
                    Workout Format
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {workout.timeCapSeconds && (
                      <div>
                        <span className="text-muted-foreground">Time Cap:</span>{" "}
                        <span className="font-medium">
                          {Math.floor(workout.timeCapSeconds / 60)}:
                          {String(workout.timeCapSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                    {workout.roundsTarget && (
                      <div>
                        <span className="text-muted-foreground">Rounds:</span>{" "}
                        <span className="font-medium">{workout.roundsTarget}</span>
                      </div>
                    )}
                    {workout.scoringType && (
                      <div>
                        <span className="text-muted-foreground">Score:</span>{" "}
                        <span className="font-medium capitalize">
                          {workout.scoringType.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Target Muscles */}
              {workout.targetMuscles && workout.targetMuscles.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand" />
                    Target Muscles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {workout.targetMuscles.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Equipment */}
              {workout.equipmentRequired && workout.equipmentRequired.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-energy" />
                    Equipment Required
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {workout.equipmentRequired.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <Separator className="my-6" />

              {/* Exercises */}
              <section className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-brand" />
                  Exercises ({workout.exercises.length})
                </h3>
                {workout.exercises.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No exercises listed yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workout.exercises
                      .sort((a, b) => a.order - b.order)
                      .map((exercise, idx) => (
                        <div
                          key={exercise.id}
                          className={cn(
                            "flex items-center gap-3 p-3 bg-muted/30 rounded-lg transition-colors",
                            exercise.exerciseId && "cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                          )}
                          onClick={() => exercise.exerciseId && handleExerciseClick(exercise)}
                        >
                          {/* Exercise thumbnail or number */}
                          {exercise.imageUrl ? (
                            <Avatar className="h-10 w-10 rounded-lg">
                              <AvatarImage src={exercise.imageUrl} alt={exercise.name} className="object-cover" />
                              <AvatarFallback className="rounded-lg bg-brand/20 text-brand font-semibold text-sm">
                                {idx + 1}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm">
                              {idx + 1}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{exercise.name}</p>
                              {exercise.exerciseId && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              {exercise.sets && <span>{exercise.sets} sets</span>}
                              {exercise.reps && <span>× {exercise.reps} reps</span>}
                              {exercise.weight && <span>@ {exercise.weight}</span>}
                              {exercise.duration && (
                                <span>{exercise.duration}s</span>
                              )}
                              {exercise.distance && <span>{exercise.distance}</span>}
                            </div>
                            {exercise.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {exercise.notes}
                              </p>
                            )}
                            {/* Show primary muscles if available */}
                            {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {exercise.primaryMuscles.slice(0, 3).map((muscle) => (
                                  <Badge key={muscle} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {muscle}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {exercise.groupType && (
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              {exercise.groupType}
                            </Badge>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* Programs this workout belongs to - deduplicated */}
              {workout.programs && workout.programs.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4 text-success" />
                    Part of Programs
                  </h3>
                  <div className="space-y-2">
                    {/* Deduplicate programs by ID */}
                    {Array.from(
                      new Map(workout.programs.map((p) => [p.id, p])).values()
                    ).map((program) => (
                      <div
                        key={program.id}
                        className="flex items-center justify-between p-3 bg-success/10 rounded-lg cursor-pointer hover:bg-success/20 transition-colors"
                        onClick={() => router.push(`/program/${program.id}`)}
                      >
                        <span className="font-medium text-sm">{program.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bookmark
                      className={cn("h-4 w-4 mr-1", isSaved && "fill-current")}
                    />
                  )}
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                >
                  {duplicating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full bg-brand-gradient" onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" />
                Start Workout
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Workout not found
          </div>
        )}
      </SheetContent>
      
      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        exercise={selectedExercise}
        open={!!selectedExercise}
        onOpenChange={(open) => !open && setSelectedExercise(null)}
      />
    </Sheet>
  );
}
