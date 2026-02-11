"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle,
  Clock,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CircleMember {
  id: string;
  name: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  exercises: {
    id: string;
    exerciseId: string;
    exercise: { id: string; name: string; category: string };
    sets?: number;
    reps?: string;
    weight?: string;
  }[];
}

interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  completed: boolean;
  notes: string;
}

interface SetLog {
  setNumber: number;
  targetReps?: number;
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  completed: boolean;
}

export default function LogWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  const [selectedMember, setSelectedMember] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(planId || "__custom__");
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [rating, setRating] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPlan && selectedPlan !== "__custom__" && plans.length > 0) {
      loadPlanExercises(selectedPlan);
    }
  }, [selectedPlan, plans]);

  const fetchData = async () => {
    try {
      const [membersRes, plansRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/workout-plans"),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
        if (membersData.length > 0 && !selectedMember) {
          setSelectedMember(membersData[0].id);
        }
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanExercises = async (planId: string) => {
    try {
      const response = await fetch(`/api/workout-plans/${planId}`);
      if (response.ok) {
        const plan = await response.json();
        setWorkoutName(plan.name);
        setExerciseLogs(
          plan.exercises.map((ex: any) => ({
            exerciseId: ex.exercise.id,
            exerciseName: ex.exercise.name,
            sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
              setNumber: i + 1,
              targetReps: ex.reps ? parseInt(ex.reps) : undefined,
              targetWeight: ex.weight ? parseFloat(ex.weight) : undefined,
              completed: false,
            })),
            completed: false,
            notes: "",
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load plan:", error);
    }
  };

  const updateSetLog = (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<SetLog>
  ) => {
    setExerciseLogs((logs) =>
      logs.map((log, i) =>
        i === exerciseIndex
          ? {
              ...log,
              sets: log.sets.map((set, j) =>
                j === setIndex ? { ...set, ...updates } : set
              ),
            }
          : log
      )
    );
  };

  const updateExerciseLog = (
    exerciseIndex: number,
    updates: Partial<ExerciseLog>
  ) => {
    setExerciseLogs((logs) =>
      logs.map((log, i) => (i === exerciseIndex ? { ...log, ...updates } : log))
    );
  };

  const handleSave = async () => {
    if (!selectedMember) {
      toast.error("Please select a circle member");
      return;
    }

    if (!workoutName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }

    setSaving(true);
    try {
      // Create the workout session
      const sessionResponse = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember,
          planId: selectedPlan && selectedPlan !== "__custom__" ? selectedPlan : null,
          name: workoutName,
          date: workoutDate,
          exercises: exerciseLogs.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            order: index,
            sets: ex.sets,
          })),
        }),
      });

      if (sessionResponse.ok) {
        const { id: sessionId } = await sessionResponse.json();

        // Update the session with completion status
        await fetch(`/api/workout-sessions/${sessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exercises: exerciseLogs,
            notes: workoutNotes,
            rating,
          }),
        });

        toast.success("Workout logged successfully!");
        router.push("/workouts");
      } else {
        const data = await sessionResponse.json();
        toast.error(data.error || "Failed to save workout");
      }
    } catch (error) {
      console.error("Failed to save workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/workouts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Log Workout</h1>
            <p className="text-muted-foreground">
              Record your workout session and track your progress
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Workout
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workout Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Workout Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Circle Member *</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Use Workout Plan (Optional)</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan or log custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Custom Workout</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Workout Name *</Label>
              <Input
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="Morning Strength Training"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>How did it feel? (1-5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant={rating === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRating(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="How did the workout go?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Exercise Logging */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            {exerciseLogs.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Select a workout plan to load exercises, or add exercises
                  manually
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {exerciseLogs.map((exercise, exerciseIndex) => (
                  <div
                    key={exerciseIndex}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={exercise.completed}
                          onCheckedChange={(checked) =>
                            updateExerciseLog(exerciseIndex, {
                              completed: checked as boolean,
                            })
                          }
                        />
                        <h4 className="font-medium">{exercise.exerciseName}</h4>
                      </div>
                      {exercise.completed && (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Done
                        </Badge>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 w-16">Set</th>
                            <th className="text-left py-2 px-2">Target</th>
                            <th className="text-left py-2 px-2">Actual Reps</th>
                            <th className="text-left py-2 px-2">
                              Actual Weight
                            </th>
                            <th className="text-center py-2 px-2 w-16">Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exercise.sets.map((set, setIndex) => (
                            <tr key={setIndex} className="border-b last:border-0">
                              <td className="py-2 px-2">
                                <Badge variant="outline">{set.setNumber}</Badge>
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {set.targetReps && `${set.targetReps} reps`}
                                {set.targetWeight &&
                                  ` @ ${set.targetWeight} lbs`}
                                {!set.targetReps && !set.targetWeight && "-"}
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={set.actualReps || ""}
                                  onChange={(e) =>
                                    updateSetLog(exerciseIndex, setIndex, {
                                      actualReps:
                                        parseInt(e.target.value) || undefined,
                                    })
                                  }
                                  placeholder="Reps"
                                  className="h-8 w-20"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="2.5"
                                  value={set.actualWeight || ""}
                                  onChange={(e) =>
                                    updateSetLog(exerciseIndex, setIndex, {
                                      actualWeight:
                                        parseFloat(e.target.value) || undefined,
                                    })
                                  }
                                  placeholder="lbs"
                                  className="h-8 w-20"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <Checkbox
                                  checked={set.completed}
                                  onCheckedChange={(checked) =>
                                    updateSetLog(exerciseIndex, setIndex, {
                                      completed: checked as boolean,
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <Label className="text-xs">Exercise Notes</Label>
                      <Input
                        value={exercise.notes}
                        onChange={(e) =>
                          updateExerciseLog(exerciseIndex, {
                            notes: e.target.value,
                          })
                        }
                        placeholder="Any notes for this exercise..."
                        className="h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
