"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Play,
  Trophy,
  Users,
  CheckCircle2,
  Circle,
  Eye,
  Timer,
  Zap,
} from "lucide-react";
import { getDifficultyBrand, getDifficultyLabel } from "@/lib/difficulty-branding";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WorkoutDetailSheet } from "@/components/sheets";

interface ProgramWorkout {
  id: string;
  dayNumber: number;
  name: string;
  focus: string | null;
  estimatedDuration: number | null;
  notes: string | null;
  workoutPlanId: string | null;
  // Enriched data from workout plan
  workoutPlanName: string | null;
  workoutPlanCategory: string | null;
  workoutPlanDifficulty: string | null;
  workoutPlanStructureType: string | null;
  // Shared workout ID for detail sheet
  sharedWorkoutId: string | null;
}

interface ProgramClientProps {
  program: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    difficulty: string;
    durationWeeks: number;
    daysPerWeek: number;
    enrollmentCount: number;
    targetMuscles: string[] | null;
    equipmentRequired: string[];
    coverImage: string | null;
    createdByUserId: string | null;
  };
  weeks: Array<{
    week: {
      id: string;
      weekNumber: number;
      name: string | null;
      notes: string | null;
      focus: string | null;
    };
    workouts: ProgramWorkout[];
  }>;
  enrollment: {
    id: string;
    status: string;
    currentWeek: number;
    currentDay: number;
    startDate: Date;
  } | null;
  progress: Array<{
    workoutId: string;
    completed: boolean;
    completedDate: Date | null;
  }>;
  userId: string;
}

export function ProgramClient({
  program,
  weeks,
  enrollment,
  progress,
}: ProgramClientProps) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<string[]>(
    // Open first week by default, or current week if enrolled
    enrollment 
      ? [weeks[enrollment.currentWeek ? enrollment.currentWeek - 1 : 0]?.week.id] 
      : weeks.length > 0 ? [weeks[0].week.id] : []
  );
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const completedWorkouts = progress.filter((p) => p.completed).length;
  const totalWorkouts = weeks.reduce((sum, w) => sum + w.workouts.length, 0);
  const progressPercent = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;
  
  // Helper to format structure type
  const formatStructureType = (type: string | null) => {
    if (!type || type === 'standard') return null;
    return type.replace(/_/g, ' ').toUpperCase();
  };
  
  // Helper to get difficulty color
  const getDifficultyColor = (difficulty: string | null) => {
    const brand = getDifficultyBrand(difficulty);
    return `${brand.bgColor} ${brand.color} ${brand.borderColor}`;
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/programs/${program.id}/enroll`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to enroll");
      toast.success("Enrolled in program!");
      router.refresh();
    } catch {
      toast.error("Failed to enroll");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout/${workoutId}/start`);
  };

  const toggleWeek = (weekId: string) => {
    setOpenWeeks((prev) =>
      prev.includes(weekId)
        ? prev.filter((id) => id !== weekId)
        : [...prev, weekId]
    );
  };

  const isWorkoutCompleted = (workoutId: string) => {
    return progress.some((p) => p.workoutId === workoutId && p.completed);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{program.name}</h1>
            <p className="text-xs text-muted-foreground">
              {program.durationWeeks} weeks · {program.daysPerWeek} days/week
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Program Overview Card */}
        <Card className="bg-gradient-to-br from-brand/10 to-energy/10 border-brand/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-brand-gradient flex items-center justify-center">
                <Dumbbell className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{program.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {program.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {program.category && (
                    <Badge variant="secondary">{program.category}</Badge>
                  )}
                  {program.difficulty && (
                    <Badge variant="outline">{program.difficulty}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <Calendar className="h-5 w-5 mx-auto text-brand" />
                <p className="text-lg font-bold mt-1">{program.durationWeeks}</p>
                <p className="text-xs text-muted-foreground">Weeks</p>
              </div>
              <div className="text-center">
                <Clock className="h-5 w-5 mx-auto text-energy" />
                <p className="text-lg font-bold mt-1">{program.daysPerWeek}</p>
                <p className="text-xs text-muted-foreground">Days/Week</p>
              </div>
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto text-success" />
                <p className="text-lg font-bold mt-1">
                  {program.enrollmentCount || 0}
                </p>
                <p className="text-xs text-muted-foreground">Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Status / Progress */}
        {enrollment ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-energy" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedWorkouts} of {totalWorkouts} workouts
                  </span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Currently on Week {enrollment.currentWeek || 1}, Day{" "}
                  {enrollment.currentDay || 1}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            className="w-full bg-brand-gradient"
            size="lg"
            onClick={handleEnroll}
            disabled={isEnrolling}
          >
            {isEnrolling ? "Enrolling..." : "Start Program"}
          </Button>
        )}

        <Separator />

        {/* Program Schedule */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Program Schedule</h3>

          {weeks.map((weekData, index) => {
            const isCurrentWeek =
              enrollment && enrollment.currentWeek === weekData.week.weekNumber;
            const isOpen = openWeeks.includes(weekData.week.id);

            return (
              <Collapsible
                key={weekData.week.id}
                open={isOpen}
                onOpenChange={() => toggleWeek(weekData.week.id)}
              >
                <Card
                  className={cn(
                    "transition-colors",
                    isCurrentWeek && "border-brand"
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold",
                              isCurrentWeek
                                ? "bg-brand text-white"
                                : "bg-muted"
                            )}
                          >
                            {weekData.week.weekNumber}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Week {weekData.week.weekNumber}
                              {weekData.week.name && `: ${weekData.week.name}`}
                            </CardTitle>
                            {weekData.week.focus && (
                              <p className="text-xs text-muted-foreground">
                                Focus: {weekData.week.focus}
                              </p>
                            )}
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {weekData.workouts.map((workout, dayIndex) => {
                          const isCompleted = isWorkoutCompleted(workout.id);
                          const structureType = formatStructureType(workout.workoutPlanStructureType);
                          const hasDetails = workout.sharedWorkoutId || workout.workoutPlanId;
                          
                          // Use the workout plan name if available, otherwise fall back to generic name
                          const displayName = workout.workoutPlanName || workout.name;

                          return (
                            <div
                              key={workout.id || dayIndex}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-colors",
                                hasDetails && "cursor-pointer hover:bg-muted"
                              )}
                              onClick={() => {
                                if (workout.sharedWorkoutId) {
                                  setSelectedWorkoutId(workout.sharedWorkoutId);
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Day {workout.dayNumber}
                                    </span>
                                    <p className="font-medium text-sm truncate">
                                      {displayName}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {workout.estimatedDuration && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {workout.estimatedDuration} min
                                      </span>
                                    )}
                                    {structureType && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {structureType}
                                      </Badge>
                                    )}
                                    {workout.workoutPlanDifficulty && (
                                      <Badge 
                                        variant="outline" 
                                        className={cn("text-[10px] px-1.5 py-0", getDifficultyColor(workout.workoutPlanDifficulty))}
                                      >
                                        {getDifficultyLabel(workout.workoutPlanDifficulty)}
                                      </Badge>
                                    )}
                                    {workout.focus && (
                                      <span className="text-xs text-muted-foreground capitalize">
                                        {workout.focus.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {hasDetails && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (workout.sharedWorkoutId) {
                                        setSelectedWorkoutId(workout.sharedWorkoutId);
                                      }
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {enrollment && workout.workoutPlanId && (
                                  <Button
                                    size="sm"
                                    variant={isCompleted ? "outline" : "default"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartWorkout(workout.workoutPlanId!);
                                    }}
                                  >
                                    {isCompleted ? "Redo" : <Play className="h-4 w-4" />}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Equipment Required */}
        {program.equipmentRequired && program.equipmentRequired.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Equipment Needed</h3>
              <div className="flex flex-wrap gap-2">
                {program.equipmentRequired.map((eq) => (
                  <Badge key={eq} variant="outline">
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Target Muscles */}
        {program.targetMuscles && program.targetMuscles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Target Muscles</h3>
            <div className="flex flex-wrap gap-2">
              {program.targetMuscles.map((muscle) => (
                <Badge key={muscle} variant="secondary">
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Workout Detail Sheet */}
      <WorkoutDetailSheet
        workoutId={selectedWorkoutId}
        open={!!selectedWorkoutId}
        onOpenChange={(open) => !open && setSelectedWorkoutId(null)}
        onStart={(workoutId) => {
          setSelectedWorkoutId(null);
          handleStartWorkout(workoutId);
        }}
      />
    </div>
  );
}
