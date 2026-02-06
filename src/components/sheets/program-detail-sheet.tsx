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
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Calendar,
  Clock,
  Star,
  Users,
  Share2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Dumbbell,
  Target,
  Award,
  TrendingUp,
  Play,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProgramWorkout {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  focus: string;
  estimatedDuration: number;
  workoutPlanId?: string;
  notes?: string;
}

interface ProgramWeek {
  id: string;
  weekNumber: number;
  name: string;
  focus: string;
  notes?: string;
  workouts: ProgramWorkout[];
}

interface ProgramDetail {
  id: string;
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  durationWeeks: number;
  daysPerWeek: number;
  avgWorkoutDuration: number;
  primaryGoal?: string;
  targetMuscles?: string[];
  equipmentRequired?: string[];
  isOfficial: boolean;
  isFeatured: boolean;
  enrollmentCount: number;
  completionCount: number;
  avgRating?: number;
  totalWorkouts: number;
  weeks: ProgramWeek[];
  isEnrolled: boolean;
  enrollment?: {
    id: string;
    status: string;
    currentWeek: number;
    currentDay: number;
    workoutsCompleted: number;
    startDate: string;
  };
}

interface ProgramDetailSheetProps {
  programId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnroll?: (programId: string) => void;
}

export function ProgramDetailSheet({
  programId,
  open,
  onOpenChange,
  onEnroll,
}: ProgramDetailSheetProps) {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    if (open && programId) {
      setLoading(true);
      fetch(`/api/programs/${programId}`)
        .then((res) => res.json())
        .then((data) => {
          setProgram(data);
          // Expand current week if enrolled
          if (data.enrollment?.currentWeek) {
            setExpandedWeeks(new Set([data.enrollment.currentWeek]));
          }
        })
        .catch(() => toast.error("Failed to load program"))
        .finally(() => setLoading(false));
    }
  }, [open, programId]);

  const handleEnroll = async () => {
    if (!programId) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/programs/${programId}/enroll`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setProgram((prev) =>
          prev
            ? {
                ...prev,
                isEnrolled: true,
                enrollment: {
                  id: data.enrollmentId,
                  status: "active",
                  currentWeek: 1,
                  currentDay: 1,
                  workoutsCompleted: 0,
                  startDate: new Date().toISOString(),
                },
              }
            : prev
        );
        toast.success("Enrolled! Your program starts today.");
        if (onEnroll) onEnroll(programId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to enroll");
      }
    } catch {
      toast.error("Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/program/${programId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share it with friends.");
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "intermediate":
        return "bg-brand/20 text-brand border-brand/30";
      case "advanced":
        return "bg-orange-500/20 text-orange-600 border-orange-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "strength":
      case "powerlifting":
        return <Dumbbell className="h-4 w-4" />;
      case "hypertrophy":
      case "bodybuilding":
        return <TrendingUp className="h-4 w-4" />;
      case "cardio":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        
        {/* Accessible title - always present for screen readers */}
        {(loading || !program) && (
          <SheetHeader className="sr-only">
            <SheetTitle>Program Details</SheetTitle>
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
        ) : program ? (
          <ScrollArea className="h-full">
            <div className="px-6 pb-32">
              <SheetHeader className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-brand to-energy flex items-center justify-center">
                    {getCategoryIcon(program.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {program.isOfficial && (
                        <Badge className="bg-brand text-white text-[10px]">
                          Official
                        </Badge>
                      )}
                      {program.isFeatured && (
                        <Badge className="bg-energy text-white text-[10px]">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-xl">{program.name}</SheetTitle>
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getDifficultyColor(program.difficulty))}
                >
                  {program.difficulty}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {program.category}
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {program.durationWeeks} weeks
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {program.daysPerWeek} days/week
                </Badge>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-2 mb-6 p-3 bg-muted/30 rounded-lg text-center">
                <div>
                  <p className="text-lg font-bold">{program.totalWorkouts}</p>
                  <p className="text-xs text-muted-foreground">Workouts</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{program.avgWorkoutDuration}</p>
                  <p className="text-xs text-muted-foreground">Min/Day</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {program.enrollmentCount?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
                <div className="flex flex-col items-center">
                  {program.avgRating ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-lg font-bold">
                          {program.avgRating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold">-</p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </>
                  )}
                </div>
              </div>

              {/* User Progress (if enrolled) */}
              {program.isEnrolled && program.enrollment && (
                <section className="mb-6 p-4 bg-brand/10 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand" />
                    Your Progress
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">
                      Week {program.enrollment.currentWeek}, Day{" "}
                      {program.enrollment.currentDay}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {program.enrollment.workoutsCompleted} / {program.totalWorkouts}{" "}
                      complete
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (program.enrollment.workoutsCompleted / program.totalWorkouts) *
                      100
                    }
                    className="h-2"
                  />
                </section>
              )}

              {/* Description */}
              {program.description && (
                <section className="mb-6">
                  <p className="text-sm text-muted-foreground">
                    {program.description}
                  </p>
                </section>
              )}

              {/* Goal */}
              {program.primaryGoal && (
                <section className="mb-6 p-3 bg-success/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Goal</p>
                      <p className="font-medium">{program.primaryGoal}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Target Muscles */}
              {program.targetMuscles && program.targetMuscles.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand" />
                    Target Muscles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {program.targetMuscles.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Equipment */}
              {program.equipmentRequired && program.equipmentRequired.length > 0 && (
                <section className="mb-6">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-energy" />
                    Equipment Needed
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {program.equipmentRequired.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <Separator className="my-6" />

              {/* Weekly Schedule */}
              <section className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand" />
                  Weekly Schedule ({program.weeks.length} weeks)
                </h3>
                <div className="space-y-2">
                  {program.weeks.map((week) => (
                    <Collapsible
                      key={week.id}
                      open={expandedWeeks.has(week.weekNumber)}
                      onOpenChange={() => toggleWeek(week.weekNumber)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg transition-colors",
                            program.enrollment?.currentWeek === week.weekNumber
                              ? "bg-brand/10 border border-brand/20"
                              : "bg-muted/30 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center font-semibold text-sm",
                                program.enrollment?.currentWeek === week.weekNumber
                                  ? "bg-brand text-white"
                                  : "bg-muted"
                              )}
                            >
                              {week.weekNumber}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-sm">{week.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {week.focus}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {week.workouts.length} workouts
                            </span>
                            {expandedWeeks.has(week.weekNumber) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-11 pr-3 py-2 space-y-2">
                          {week.workouts.map((workout) => (
                            <div
                              key={workout.id}
                              className="flex items-center justify-between p-2 bg-background rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                  D{workout.dayNumber}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {workout.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {workout.focus}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {workout.estimatedDuration} min
                                </span>
                                {program.isEnrolled && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </section>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" className="flex-1" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              {program.isEnrolled ? (
                <Button
                  className="w-full bg-success"
                  onClick={() => router.push(`/program/${programId}/today`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Today's Workout
                </Button>
              ) : (
                <Button
                  className="w-full bg-brand-gradient"
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Start Program
                </Button>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Program not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
