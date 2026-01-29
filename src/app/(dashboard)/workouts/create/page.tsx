"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Hammer,
  ArrowRight,
  Loader2,
  Clock,
  Target,
  Dumbbell,
  Brain,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function CreateWorkoutPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "ai" | "manual">("choose");
  const [generating, setGenerating] = useState(false);

  // AI generation form
  const [aiPrompt, setAiPrompt] = useState("");
  const [duration, setDuration] = useState("45");
  const [focusArea, setFocusArea] = useState("");
  const [intensity, setIntensity] = useState("moderate");

  const handleGenerateWithAI = async () => {
    if (!aiPrompt && !focusArea) {
      toast.error("Please describe your workout or select a focus area");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt || `Create a ${intensity} ${focusArea} workout for about ${duration} minutes`,
          duration: parseInt(duration),
          focusArea,
          intensity,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to builder with the generated workout
        router.push(`/workouts/builder?generated=${data.planId}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate workout");
      }
    } catch (error) {
      console.error("Failed to generate workout:", error);
      toast.error("Failed to generate workout");
    } finally {
      setGenerating(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Workout</h1>
          <p className="text-muted-foreground">
            Build a workout plan with AI assistance or create one manually
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* AI-Powered Creation */}
          <Card
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => setMode("ai")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>AI-Powered</CardTitle>
                  <CardDescription>Let AI create a personalized workout</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Describe what you want in natural language
                </li>
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  AI considers your goals and limitations
                </li>
                <li className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  Uses your available equipment
                </li>
              </ul>
              <Button className="w-full">
                Generate with AI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Manual Builder */}
          <Card
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => router.push("/workouts/builder")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Hammer className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle>Manual Builder</CardTitle>
                  <CardDescription>Build your workout from scratch</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Full control over every exercise
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Set exact sets, reps, and rest times
                </li>
                <li className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Browse and add from exercise library
                </li>
              </ul>
              <Button variant="outline" className="w-full">
                Open Builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Templates */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Start Templates</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { name: "Full Body Blast", duration: "45 min", intensity: "High" },
              { name: "Upper Body Focus", duration: "30 min", intensity: "Moderate" },
              { name: "Core & Cardio", duration: "25 min", intensity: "High" },
              { name: "Lower Body Strength", duration: "40 min", intensity: "Moderate" },
              { name: "Quick HIIT", duration: "20 min", intensity: "High" },
              { name: "Flexibility & Recovery", duration: "30 min", intensity: "Low" },
            ].map((template) => (
              <Card
                key={template.name}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setFocusArea(template.name.toLowerCase().replace(/ /g, "_"));
                  setDuration(template.duration.replace(" min", ""));
                  setIntensity(template.intensity.toLowerCase());
                  setMode("ai");
                }}
              >
                <CardContent className="p-4">
                  <p className="font-medium">{template.name}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{template.duration}</Badge>
                    <Badge variant="secondary">{template.intensity}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setMode("choose")}>
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">AI Workout Generator</h1>
            <p className="text-muted-foreground">
              Describe your ideal workout and let AI create it for you
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate Your Workout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Describe your workout</Label>
                <Textarea
                  placeholder="e.g., I want a challenging leg workout that focuses on building strength. I have access to a barbell and dumbbells."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about your goals, available equipment, and any preferences
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Intensity</Label>
                  <Select value={intensity} onValueChange={setIntensity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Recovery)</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High (Challenging)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Focus Area (optional)</Label>
                <Select value={focusArea} onValueChange={setFocusArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a focus area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_body">Full Body</SelectItem>
                    <SelectItem value="upper_body">Upper Body</SelectItem>
                    <SelectItem value="lower_body">Lower Body</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerateWithAI}
                disabled={generating || (!aiPrompt && !focusArea)}
              >
                {generating ? (
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

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips for Better Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Be Specific</p>
                <p className="text-sm text-muted-foreground">
                  Instead of "leg workout", try "challenging leg workout focusing on
                  quads and glutes with compound movements"
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Mention Your Equipment</p>
                <p className="text-sm text-muted-foreground">
                  The AI uses your equipment profile, but mentioning specific
                  equipment helps create more targeted workouts
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Include Constraints</p>
                <p className="text-sm text-muted-foreground">
                  If you have injuries or limitations, mention them: "lower back
                  friendly" or "no jumping exercises"
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Example Prompts</p>
                <div className="space-y-2">
                  {[
                    "Quick HIIT workout I can do at home with no equipment",
                    "Heavy leg day with squats and deadlifts, 3-4 sets each",
                    "Upper body push workout focusing on chest and shoulders",
                    "Active recovery day with mobility and light cardio",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      className="block w-full text-left text-sm p-2 rounded bg-muted hover:bg-muted/80 transition-colors"
                      onClick={() => setAiPrompt(prompt)}
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
