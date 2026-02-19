"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  Dumbbell,
  Calendar,
  User,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Sparkles,
  MessageSquare,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QuickFeedback } from "@/components/quick-feedback";

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
  notes?: string;
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
  aiAnalysis?: string;
  aiFeedback?: string;
  member: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  plan?: {
    id: string;
    name: string;
  };
  exercises: SessionExercise[];
}

function formatDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return "--";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function WorkoutSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        toast.error("Failed to load workout session");
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      toast.error("Failed to load workout session");
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
        <Button asChild>
          <Link href="/workouts">Back to Workouts</Link>
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalVolume = session.exercises.reduce((acc, ex) => {
    return (
      acc +
      ex.sets.reduce((setAcc, set) => {
        const weight = set.actualWeight || set.targetWeight || 0;
        const reps = set.actualReps || set.targetReps || 0;
        return setAcc + weight * reps;
      }, 0)
    );
  }, 0);

  // Get personal records (sets where actual > target)
  const personalBests = session.exercises.flatMap((ex) =>
    ex.sets
      .filter(
        (set) =>
          set.actualWeight &&
          set.targetWeight &&
          set.actualWeight > set.targetWeight
      )
      .map((set) => ({
        exerciseName: ex.exercise.name,
        weight: set.actualWeight!,
        reps: set.actualReps || set.targetReps,
      }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/workouts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <Badge
              variant={session.status === "completed" ? "default" : "secondary"}
              className={session.status === "completed" ? "bg-green-500" : ""}
            >
              {session.status === "completed" ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" /> Completed
                </>
              ) : (
                session.status
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {session.member.name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(session.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-xl font-bold">
                  {formatDuration(session.startTime, session.endTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sets Completed</p>
                <p className="text-xl font-bold">
                  {completedSets}/{totalSets}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-xl font-bold">
                  {totalVolume.toLocaleString()} lbs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <div className="flex items-center gap-1">
                  {session.rating ? (
                    <>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <Star
                          key={num}
                          className={cn(
                            "h-4 w-4",
                            num <= session.rating!
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted"
                          )}
                        />
                      ))}
                    </>
                  ) : (
                    <span className="text-xl font-bold">--</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Bests */}
      {personalBests.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Personal Bests This Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {personalBests.map((pb, i) => (
                <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                  {pb.exerciseName}: {pb.weight} lbs x {pb.reps}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Feedback */}
      {session.aiFeedback && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Coach Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{session.aiFeedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {session.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{session.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Feedback */}
      {session.status === "completed" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Add Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickFeedback
              memberId={session.member.id}
              entityType="workout_session"
              entityId={session.id}
              showTitle={false}
              placeholder="How did this workout feel? Any pain or soreness? The AI will use this to personalize your future workouts..."
            />
          </CardContent>
        </Card>
      )}

      {/* Share Workout */}
      {session.status === "completed" && (
        <ShareWorkoutCard sessionId={session.id} sessionName={session.name} />
      )}

      {/* Exercises */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Exercises ({session.exercises.length})
        </h2>

        {session.exercises.map((exercise, index) => {
          const exerciseCompletedSets = exercise.sets.filter((s) => s.completed).length;
          const isComplete = exerciseCompletedSets === exercise.sets.length;
          const maxWeight = Math.max(
            ...exercise.sets.map((s) => s.actualWeight || s.targetWeight || 0)
          );
          const totalReps = exercise.sets.reduce(
            (acc, s) => acc + (s.actualReps || s.targetReps || 0),
            0
          );

          return (
            <Card key={exercise.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        isComplete
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-base">{exercise.exercise.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {exercise.exercise.category}
                        </Badge>
                        {exercise.exercise.muscleGroups?.slice(0, 2).map((muscle) => (
                          <Badge key={muscle} variant="secondary" className="text-xs">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {exerciseCompletedSets}/{exercise.sets.length} sets
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalReps} reps{maxWeight > 0 && ` • ${maxWeight} lbs max`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 w-16">Set</th>
                        <th className="text-left py-2 px-2">Target</th>
                        <th className="text-left py-2 px-2">Actual</th>
                        <th className="text-center py-2 px-2 w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exercise.sets.map((set) => {
                        const exceededTarget =
                          set.actualWeight &&
                          set.targetWeight &&
                          set.actualWeight > set.targetWeight;

                        return (
                          <tr key={set.id} className="border-b last:border-0">
                            <td className="py-2 px-2">
                              <Badge variant="outline">{set.setNumber}</Badge>
                            </td>
                            <td className="py-2 px-2 text-muted-foreground">
                              {set.targetReps && `${set.targetReps} reps`}
                              {set.targetWeight && ` @ ${set.targetWeight} lbs`}
                              {!set.targetReps && !set.targetWeight && "-"}
                            </td>
                            <td className="py-2 px-2">
                              <span className={exceededTarget ? "text-green-600 font-medium" : ""}>
                                {set.actualReps && `${set.actualReps} reps`}
                                {set.actualWeight && ` @ ${set.actualWeight} lbs`}
                                {!set.actualReps && !set.actualWeight && "-"}
                              </span>
                              {exceededTarget && (
                                <Trophy className="inline ml-1 h-3 w-3 text-yellow-500" />
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {set.completed ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {exercise.notes && (
                  <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                    {exercise.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* From Plan */}
      {session.plan && (
        <div className="text-center text-sm text-muted-foreground">
          Based on plan:{" "}
          <Link
            href={`/workouts/builder?edit=${session.plan.id}`}
            className="text-primary underline"
          >
            {session.plan.name}
          </Link>
        </div>
      )}
    </div>
  );
}

function ShareWorkoutCard({
  sessionId,
  sessionName,
}: {
  sessionId: string;
  sessionName: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/w/${sessionId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${sessionName} — Repcir`,
          text: `Check out my workout: ${sessionName}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-brand/5 to-energy/5 border-brand/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center">
            <Share2 className="h-5 w-5 text-brand" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Share your workout</p>
            <p className="text-xs text-muted-foreground">
              Let your circle see what you crushed
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand/90 text-brand-foreground"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
