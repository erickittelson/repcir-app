"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Play,
  Loader2,
  Sparkles,
  PenLine,
  Globe,
  Users,
  Lock,
  Trophy,
  Dumbbell,
  Clock,
  Plus,
  X,
  Save,
} from "lucide-react";
import { startWorkoutSession } from "@/components/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ContentType = "workout" | "challenge";
type Visibility = "private" | "circle" | "public";
type CreationMode = "ai" | "manual";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock, description: "Only you" },
  { value: "circle", label: "Circle", icon: Users, description: "Your circles only" },
  { value: "public", label: "Public", icon: Globe, description: "Everyone can see" },
];

const CATEGORIES = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "hiit", label: "HIIT" },
  { value: "skill", label: "Skill Work" },
  { value: "sport", label: "Sport Specific" },
];

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType>("workout");
  const [creationMode, setCreationMode] = useState<CreationMode>("ai");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Workout fields
  const [workoutName, setWorkoutName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("30");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // AI generation fields
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedWorkout, setGeneratedWorkout] = useState<{
    name: string;
    description: string;
    exercises: Exercise[];
    duration: number;
  } | null>(null);

  // Challenge fields
  const [challengeName, setChallengeName] = useState("");
  const [challengeDescription, setChallengeDescription] = useState("");
  const [challengeDuration, setChallengeDuration] = useState("7");
  const [challengeGoal, setChallengeGoal] = useState("");

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe the workout you want");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          duration: parseInt(duration),
          category,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate workout");

      const data = await response.json();
      setGeneratedWorkout(data.workout);
      setWorkoutName(data.workout.name);
      setDescription(data.workout.description);
      setExercises(
        data.workout.exercises.map((e: Exercise, i: number) => ({
          ...e,
          id: `ex-${i}`,
        }))
      );
      toast.success("Workout generated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate workout");
    } finally {
      setIsGenerating(false);
    }
  };

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        id: `ex-${Date.now()}`,
        name: "",
        sets: 3,
        reps: "10",
      },
    ]);
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setExercises(
      exercises.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    );
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workoutName,
          description,
          category,
          visibility,
          exercises: exercises.map(({ id, ...ex }) => ex),
          estimatedDuration: parseInt(duration),
        }),
      });

      if (!response.ok) throw new Error("Failed to save workout");

      toast.success("Workout saved!");
      router.push("/discover");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save workout");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChallenge = async () => {
    if (!challengeName.trim()) {
      toast.error("Please enter a challenge name");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: challengeName,
          description: challengeDescription,
          durationDays: parseInt(challengeDuration),
          goal: challengeGoal,
          visibility,
          category,
        }),
      });

      if (!response.ok) throw new Error("Failed to create challenge");

      toast.success("Challenge created!");
      router.push("/discover?tab=challenges");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create challenge");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartWorkout = async () => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/workout-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workoutName || "Quick Workout",
          category: category || undefined,
          exercises: exercises.map(({ id, ...ex }) => ex),
        }),
      });

      if (!response.ok) throw new Error("Failed to start workout");

      const { session } = await response.json();

      startWorkoutSession({
        id: session.id,
        name: workoutName || "Quick Workout",
        totalExercises: exercises.length,
      });

      toast.success("Workout started!");
      router.push(`/workout/${session.id}`);
    } catch (error) {
      toast.error("Failed to start workout");
      console.error(error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Create</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Content Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={contentType === "workout" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setContentType("workout")}
          >
            <Dumbbell className="mr-2 h-4 w-4" />
            Workout
          </Button>
          <Button
            variant={contentType === "challenge" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setContentType("challenge")}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Challenge
          </Button>
        </div>

        {/* Visibility Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Who can see this?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value as Visibility)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors",
                    visibility === opt.value
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <opt.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workout Creation */}
        {contentType === "workout" && (
          <>
            {/* Creation Mode Tabs */}
            <Tabs
              value={creationMode}
              onValueChange={(v) => setCreationMode(v as CreationMode)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Generate
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <PenLine className="h-4 w-4" />
                  Manual
                </TabsTrigger>
              </TabsList>

              {/* AI Generation Tab */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-brand" />
                      AI Workout Generator
                    </CardTitle>
                    <CardDescription>
                      Describe the workout you want and let AI create it
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>What kind of workout do you want?</Label>
                      <Textarea
                        placeholder="e.g., Upper body strength with focus on chest and shoulders, 45 minutes, intermediate level"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleAIGenerate}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Workout
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Generated Workout Preview */}
                {exercises.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Generated Workout</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Workout Name</Label>
                        <Input
                          value={workoutName}
                          onChange={(e) => setWorkoutName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Exercises ({exercises.length})</Label>
                        <div className="space-y-2">
                          {exercises.map((ex, i) => (
                            <div
                              key={ex.id}
                              className="flex items-center gap-2 p-2 rounded bg-muted"
                            >
                              <span className="text-xs text-muted-foreground w-6">
                                {i + 1}.
                              </span>
                              <span className="flex-1 text-sm">{ex.name}</span>
                              <Badge variant="secondary">
                                {ex.sets}x{ex.reps}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Manual Creation Tab */}
              <TabsContent value="manual" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Workout Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Workout Name *</Label>
                      <Input
                        placeholder="e.g., Upper Body Day"
                        value={workoutName}
                        onChange={(e) => setWorkoutName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What's this workout about?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Exercises */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Exercises</CardTitle>
                      <Button size="sm" variant="outline" onClick={addExercise}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No exercises added yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {exercises.map((ex, i) => (
                          <div
                            key={ex.id}
                            className="flex items-start gap-2 p-3 rounded-lg border"
                          >
                            <span className="text-sm text-muted-foreground pt-2">
                              {i + 1}.
                            </span>
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Exercise name"
                                value={ex.name}
                                onChange={(e) =>
                                  updateExercise(ex.id, { name: e.target.value })
                                }
                              />
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Sets"
                                  value={ex.sets}
                                  onChange={(e) =>
                                    updateExercise(ex.id, {
                                      sets: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="w-20"
                                />
                                <Input
                                  placeholder="Reps"
                                  value={ex.reps}
                                  onChange={(e) =>
                                    updateExercise(ex.id, { reps: e.target.value })
                                  }
                                  className="w-24"
                                />
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeExercise(ex.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveWorkout}
                disabled={isSaving || !workoutName.trim()}
                variant="outline"
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
              <Button
                onClick={handleStartWorkout}
                disabled={isStarting}
                className="flex-1 bg-brand-gradient"
              >
                {isStarting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start Now
              </Button>
            </div>
          </>
        )}

        {/* Challenge Creation */}
        {contentType === "challenge" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-energy" />
                  Create Challenge
                </CardTitle>
                <CardDescription>
                  Create a challenge for yourself, your circle, or the community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Challenge Name *</Label>
                  <Input
                    placeholder="e.g., 30-Day Push-Up Challenge"
                    value={challengeName}
                    onChange={(e) => setChallengeName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What's this challenge about?"
                    value={challengeDescription}
                    onChange={(e) => setChallengeDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Select
                      value={challengeDuration}
                      onValueChange={setChallengeDuration}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="21">21 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Input
                    placeholder="e.g., Complete 100 push-ups every day"
                    value={challengeGoal}
                    onChange={(e) => setChallengeGoal(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveChallenge}
              disabled={isSaving || !challengeName.trim()}
              className="w-full bg-brand-gradient h-12"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-5 w-5" />
                  Create Challenge
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
