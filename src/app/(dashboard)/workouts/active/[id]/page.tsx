"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import WorkoutReflectionWizard, {
  type WorkoutReflection,
} from "@/components/workout/WorkoutReflectionWizard";
import { SetTracker } from "@/components/workout/set-tracker";

interface ExerciseSet {
  id: string;
  setNumber: number;
  targetReps?: number;
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  targetDuration?: number;
  actualDuration?: number;
  completed: boolean;
  rpe?: number;
}

interface SessionExercise {
  id: string;
  exerciseId: string;
  order: number;
  completed: boolean;
  exercise: {
    id: string;
    name: string;
    category: string;
    muscleGroups?: string[];
    equipment?: string[];
  };
  sets: ExerciseSet[];
}

interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  status: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  rating?: number;
  member: {
    id: string;
    name: string;
  };
  plan?: {
    id: string;
    name: string;
  };
  exercises: SessionExercise[];
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;

  // Parse all session IDs from query params (for group workouts)
  const allSessionIds = searchParams.get("sessions")?.split(",") || [sessionId];
  const isGroupWorkout = allSessionIds.length > 1;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Active session for the currently selected member
  const session = sessions[activeMemberIndex] || null;

  // Workout timer
  const [workoutTime, setWorkoutTime] = useState(0);
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const workoutStartRef = useRef<Date | null>(null);

  // Completion wizard
  const [showCompletion, setShowCompletion] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch all session data
  useEffect(() => {
    fetchAllSessions();
  }, [sessionId, searchParams]);

  // Workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutRunning) {
      interval = setInterval(() => {
        if (workoutStartRef.current) {
          const elapsed = Math.floor((Date.now() - workoutStartRef.current.getTime()) / 1000);
          setWorkoutTime(elapsed);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutRunning]);

  const fetchAllSessions = async () => {
    try {
      // Fetch all sessions in parallel
      const fetchPromises = allSessionIds.map((id) =>
        fetch(`/api/workout-sessions/${id}`).then((res) => res.ok ? res.json() : null)
      );

      const allSessions = await Promise.all(fetchPromises);
      const validSessions = allSessions.filter(Boolean) as WorkoutSession[];

      if (validSessions.length === 0) {
        toast.error("Failed to load workout session");
        router.push("/workouts");
        return;
      }

      setSessions(validSessions);

      // If any session is already in progress, resume the timer
      const inProgressSession = validSessions.find(
        (s) => s.status === "in_progress" && s.startTime
      );
      if (inProgressSession?.startTime) {
        workoutStartRef.current = new Date(inProgressSession.startTime);
        const elapsed = Math.floor((Date.now() - workoutStartRef.current.getTime()) / 1000);
        setWorkoutTime(elapsed);
        setIsWorkoutRunning(true);
      }

      // Find the first incomplete exercise for the first member
      const firstSession = validSessions[0];
      if (firstSession) {
        const firstIncompleteIndex = firstSession.exercises.findIndex(
          (ex: SessionExercise) => !ex.completed
        );
        if (firstIncompleteIndex >= 0) {
          setCurrentExerciseIndex(firstIncompleteIndex);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load workout session");
    } finally {
      setLoading(false);
    }
  };

  // Refetch just the active member's session (for updates)
  const fetchSession = async () => {
    if (!session) return;
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setSessions((prev) =>
          prev.map((s, i) => (i === activeMemberIndex ? data : s))
        );
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  const startWorkout = async () => {
    if (sessions.length === 0) return;

    try {
      const startTime = new Date();
      workoutStartRef.current = startTime;
      setIsWorkoutRunning(true);

      // Start all sessions at once for group workouts
      await Promise.all(
        sessions.map((s) =>
          fetch(`/api/workout-sessions/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "in_progress",
              startTime: startTime.toISOString(),
            }),
          })
        )
      );

      // Update all sessions in state
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          status: "in_progress",
          startTime: startTime.toISOString(),
        }))
      );
      toast.success("Workout started!");
    } catch (error) {
      console.error("Failed to start workout:", error);
      toast.error("Failed to start workout");
    }
  };

  const updateSet = async (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<ExerciseSet>
  ) => {
    if (!session) return;

    const exercise = session.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];

    // Optimistic update
    const updatedExercises = [...session.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: exercise.sets.map((s, i) =>
        i === setIndex ? { ...s, ...updates } : s
      ),
    };
    setSessions((prev) =>
      prev.map((s, i) =>
        i === activeMemberIndex ? { ...s, exercises: updatedExercises } : s
      )
    );

    // Check if all sets are now completed — auto-complete exercise
    const updatedSets = updatedExercises[exerciseIndex].sets;
    if (updatedSets.every((s) => s.completed) && !exercise.completed) {
      autoCompleteExercise(exerciseIndex, updatedExercises);
    }

    try {
      await fetch(`/api/workout-sessions/${session.id}/sets/${set.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to update set:", error);
      // Revert on error
      fetchSession();
    }
  };

  // Auto-complete exercise when all sets are done (called from updateSet)
  const autoCompleteExercise = (exerciseIndex: number, updatedExercises: SessionExercise[]) => {
    if (!session) return;

    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      completed: true,
    };
    setSessions((prev) =>
      prev.map((s, i) =>
        i === activeMemberIndex ? { ...s, exercises: updatedExercises } : s
      )
    );

    const exercise = session.exercises[exerciseIndex];
    toast.success(`${exercise.exercise.name} complete!`);

    // Move to next exercise
    if (exerciseIndex < session.exercises.length - 1) {
      const nextIndex = exerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
    } else {
      // Check if all members are complete (for group workouts)
      const allMembersComplete = sessions.every((s, i) =>
        i === activeMemberIndex
          ? updatedExercises.every((ex) => ex.completed)
          : s.exercises.every((ex) => ex.completed)
      );

      if (allMembersComplete || !isGroupWorkout) {
        setShowCompletion(true);
      } else {
        // Move to next incomplete member
        const nextMemberIndex = sessions.findIndex(
          (s, i) => i !== activeMemberIndex && !s.exercises.every((ex) => ex.completed)
        );
        if (nextMemberIndex >= 0) {
          setActiveMemberIndex(nextMemberIndex);
          const nextSession = sessions[nextMemberIndex];
          const nextExerciseIndex = nextSession.exercises.findIndex((ex) => !ex.completed);
          setCurrentExerciseIndex(nextExerciseIndex >= 0 ? nextExerciseIndex : 0);
          toast.success(`${session.member.name} done! Switching to ${nextSession.member.name}`);
        }
      }
    }
  };

  const completeExercise = async (exerciseIndex: number) => {
    if (!session) return;

    const exercise = session.exercises[exerciseIndex];

    // Mark all sets as completed if not already
    const updatedSets = exercise.sets.map((set) => ({
      ...set,
      completed: true,
      actualReps: set.actualReps || set.targetReps,
      actualWeight: set.actualWeight || set.targetWeight,
    }));

    // Update local state
    const updatedExercises = [...session.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      completed: true,
      sets: updatedSets,
    };
    setSessions((prev) =>
      prev.map((s, i) =>
        i === activeMemberIndex ? { ...s, exercises: updatedExercises } : s
      )
    );

    // Update each set on the server
    for (const set of updatedSets) {
      if (!set.completed) {
        await fetch(`/api/workout-sessions/${session.id}/sets/${set.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completed: true,
            actualReps: set.actualReps,
            actualWeight: set.actualWeight,
          }),
        });
      }
    }

    // Move to next exercise
    if (exerciseIndex < session.exercises.length - 1) {
      const nextIndex = exerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
    } else {
      // Check if all members are complete (for group workouts)
      const allMembersComplete = sessions.every((s, i) =>
        i === activeMemberIndex
          ? updatedExercises.every((ex) => ex.completed)
          : s.exercises.every((ex) => ex.completed)
      );

      if (allMembersComplete || !isGroupWorkout) {
        setShowCompletion(true);
      } else {
        // Move to next incomplete member
        const nextMemberIndex = sessions.findIndex(
          (s, i) => i !== activeMemberIndex && !s.exercises.every((ex) => ex.completed)
        );
        if (nextMemberIndex >= 0) {
          setActiveMemberIndex(nextMemberIndex);
          const nextSession = sessions[nextMemberIndex];
          const nextExerciseIndex = nextSession.exercises.findIndex((ex) => !ex.completed);
          setCurrentExerciseIndex(nextExerciseIndex >= 0 ? nextExerciseIndex : 0);
          toast.success(`${session.member.name} done! Switching to ${nextSession.member.name}`);
        }
      }
    }

    toast.success(`${exercise.exercise.name} complete!`);
  };

  const finishWorkout = async (reflection: WorkoutReflection) => {
    if (sessions.length === 0) return;

    setSaving(true);
    try {
      const endTime = new Date().toISOString();

      // Complete all sessions (for group workouts)
      await Promise.all(
        sessions.map((s) =>
          fetch(`/api/workout-sessions/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "completed",
              endTime,
              notes: reflection.notes || `${reflection.wentWell}\n${reflection.challenges}`.trim(),
              rating: reflection.overallRating,
            }),
          })
        )
      );

      // Save the detailed reflection as a context note for each member's AI learning
      await Promise.all(
        sessions.map((s) =>
          fetch(`/api/members/${s.member.id}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityType: "workout_session",
              entityId: s.id,
              mood: reflection.mood,
              energyLevel: reflection.energyLevel,
              painLevel: reflection.sorenessLevel,
              difficulty: reflection.workoutDifficulty,
              content: buildReflectionContent(reflection),
              tags: reflection.tags,
            }),
          })
        )
      );

      toast.success("Workout completed! Great job!");
      router.push("/workouts");
    } catch (error) {
      console.error("Failed to complete workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  // Build a structured content string from the reflection for AI context
  const buildReflectionContent = (reflection: WorkoutReflection): string => {
    const parts: string[] = [];

    // Physical state
    parts.push(`Physical: Energy ${reflection.energyLevel}/5, Fatigue ${reflection.fatigueLevel}/5, Soreness ${reflection.sorenessLevel}/10`);
    if (reflection.painAreas.length > 0) {
      parts.push(`Pain areas: ${reflection.painAreas.join(", ")}`);
    }

    // Mental state
    parts.push(`Mental: Mood ${reflection.mood}, Stress ${reflection.stressLevel}/5, Motivation ${reflection.motivationLevel}/5, Focus ${reflection.focusLevel}/5`);

    // Workout feedback
    parts.push(`Workout: Difficulty ${reflection.workoutDifficulty}, Rating ${reflection.overallRating}/5`);
    if (reflection.wentWell) parts.push(`Went well: ${reflection.wentWell}`);
    if (reflection.challenges) parts.push(`Challenges: ${reflection.challenges}`);

    // Recovery context
    parts.push(`Recovery: Sleep ${reflection.sleepQuality}/5${reflection.sleepHours ? ` (${reflection.sleepHours}h)` : ""}, Nutrition ${reflection.nutritionRating}/5, Hydration ${reflection.hydrationRating}/5`);

    // Additional notes
    if (reflection.notes) parts.push(`Notes: ${reflection.notes}`);

    return parts.join("\n");
  };

  // Calculate progress (for current member and overall)
  const currentMemberTotalSets = session?.exercises.reduce((acc, ex) => acc + ex.sets.length, 0) || 0;
  const currentMemberCompletedSets =
    session?.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    ) || 0;
  const currentMemberProgress = currentMemberTotalSets > 0 ? (currentMemberCompletedSets / currentMemberTotalSets) * 100 : 0;

  // Overall progress for group workouts
  const totalSets = sessions.reduce((acc, s) => acc + s.exercises.reduce((a, ex) => a + ex.sets.length, 0), 0);
  const completedSets = sessions.reduce(
    (acc, s) => acc + s.exercises.reduce((a, ex) => a + ex.sets.filter((st) => st.completed).length, 0),
    0
  );
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // Helper to get member initials
  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
        <Button asChild>
          <Link href="/workouts">Back to Workouts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Header with timer */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 py-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/workouts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">{session.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {isGroupWorkout ? (
                  <>
                    <Users className="h-3 w-3" />
                    {sessions.length} people
                  </>
                ) : (
                  session.member.name
                )}
              </p>
            </div>
          </div>

          {/* Workout timer */}
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">{formatTime(workoutTime)}</div>
            {sessions.some((s) => s.status === "planned") && (
              <Button size="sm" onClick={startWorkout}>
                <Play className="mr-1 h-3 w-3" /> Start
              </Button>
            )}
          </div>
        </div>

        {/* Member tabs for group workouts */}
        {isGroupWorkout && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {sessions.map((s, idx) => {
              const memberCompletedSets = s.exercises.reduce(
                (acc, ex) => acc + ex.sets.filter((st) => st.completed).length,
                0
              );
              const memberTotalSets = s.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
              const memberProgress = memberTotalSets > 0 ? Math.round((memberCompletedSets / memberTotalSets) * 100) : 0;
              const isActive = idx === activeMemberIndex;
              const isComplete = memberProgress === 100;

              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveMemberIndex(idx);
                    const firstIncomplete = s.exercises.findIndex((ex) => !ex.completed);
                    setCurrentExerciseIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[120px]",
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/50",
                    isComplete && "border-green-500 bg-green-50 dark:bg-green-950/20"
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className={cn(
                      "text-xs",
                      isComplete ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : ""
                    )}>
                      {isComplete ? <CheckCircle className="h-3 w-3" /> : getInitials(s.member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium">{s.member.name}</p>
                    <p className="text-xs text-muted-foreground">{memberProgress}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {isGroupWorkout ? (
                <>
                  <span className="font-medium">{session.member.name}:</span> {currentMemberCompletedSets}/{currentMemberTotalSets} sets
                </>
              ) : (
                <>{completedSets} of {totalSets} sets</>
              )}
            </span>
            <span>{isGroupWorkout ? `${Math.round(currentMemberProgress)}%` : `${Math.round(progressPercent)}%`}</span>
          </div>
          <Progress value={isGroupWorkout ? currentMemberProgress : progressPercent} className="h-2" />
          {isGroupWorkout && (
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Group total: {completedSets}/{totalSets} sets</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Exercises — using SetTracker for polished tracking UI */}
      <div className="space-y-6">
        {session.exercises.map((exercise, exerciseIndex) => {
          const isCurrent = exerciseIndex === currentExerciseIndex;
          const isExerciseComplete = exercise.sets.every((s) => s.completed);

          return (
            <div
              key={exercise.id}
              className={cn(
                "transition-all rounded-xl",
                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                isExerciseComplete && "opacity-60"
              )}
            >
              <SetTracker
                exerciseName={exercise.exercise.name}
                exerciseId={exercise.exerciseId}
                sets={exercise.sets}
                targetSets={exercise.sets.length}
                targetReps={exercise.sets[0]?.targetReps}
                targetWeight={exercise.sets[0]?.targetWeight}
                onSetComplete={(setIndex, data) => updateSet(exerciseIndex, setIndex, data)}
                disabled={session.status === "planned"}
              />
              {!isExerciseComplete && session.status === "in_progress" && (
                <Button
                  className="w-full mt-2"
                  variant="outline"
                  onClick={() => completeExercise(exerciseIndex)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete All Sets
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Finish button */}
      {session.status === "in_progress" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setShowCompletion(true)}
            disabled={completedSets === 0}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Finish Workout ({Math.round(progressPercent)}% complete)
          </Button>
        </div>
      )}

      {/* Workout Reflection Wizard */}
      {showCompletion && (
        <WorkoutReflectionWizard
          workoutDuration={workoutTime}
          completedSets={completedSets}
          totalExercises={session.exercises.length}
          onComplete={finishWorkout}
          onCancel={() => setShowCompletion(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
