"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Circle,
  Droplets,
  Book,
  Camera,
  Dumbbell,
  Apple,
  Moon,
  Footprints,
  Brain,
  Heart,
  XCircle,
  Upload,
  Plus,
  Minus,
  Flame,
  Share2,
  Twitter,
  Facebook,
  Copy,
  Link as LinkIcon,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Streak Display Component with fire animation
function StreakDisplay({ 
  currentStreak, 
  longestStreak,
  isAtRisk = false
}: { 
  currentStreak: number;
  longestStreak: number;
  isAtRisk?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
      <div className="relative">
        <div className={cn(
          "flex items-center justify-center h-14 w-14 rounded-full",
          currentStreak > 0 
            ? "bg-gradient-to-br from-orange-400 to-red-500" 
            : "bg-muted"
        )}>
          <Flame className={cn(
            "h-7 w-7 text-white",
            currentStreak > 0 && !isAtRisk && "animate-pulse"
          )} />
        </div>
        {currentStreak > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-orange-500 shadow">
            {currentStreak}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            {currentStreak} Day{currentStreak !== 1 ? "s" : ""} Streak
          </span>
          {isAtRisk && (
            <Badge variant="destructive" className="text-[10px]">At Risk!</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Best streak: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// Progress Chart Component (weekly view)
function WeeklyProgressChart({ 
  completedDays,
  currentDay,
  totalDays 
}: { 
  completedDays: number[];
  currentDay: number;
  totalDays: number;
}) {
  // Show the current week (7 days)
  const weekStart = Math.max(1, currentDay - 6);
  const days = Array.from({ length: 7 }, (_, i) => weekStart + i).filter(d => d <= totalDays);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">This Week</span>
        <span className="text-xs text-muted-foreground">
          Day {currentDay} of {totalDays}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {days.map((day) => {
          const isCompleted = completedDays.includes(day);
          const isCurrent = day === currentDay;
          const isFuture = day > currentDay;
          
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                "h-8 w-full rounded-t-md transition-all",
                isCompleted && "bg-success",
                isCurrent && !isCompleted && "bg-brand/50 animate-pulse",
                isFuture && "bg-muted",
                !isCompleted && !isCurrent && !isFuture && "bg-destructive/50"
              )} />
              <span className={cn(
                "text-[10px]",
                isCurrent ? "font-bold text-brand" : "text-muted-foreground"
              )}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Social Sharing Component
function SocialShare({ 
  challengeName, 
  dayNumber,
  streak 
}: { 
  challengeName: string;
  dayNumber: number;
  streak: number;
}) {
  const shareText = `Day ${dayNumber} of ${challengeName} complete! 🔥 ${streak} day streak! #FitnessChallenge #Fitness`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  
  const handleShare = async (platform: string) => {
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);
    
    let url = "";
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case "copy":
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success("Copied to clipboard!");
        return;
      case "native":
        if (navigator.share) {
          await navigator.share({
            title: challengeName,
            text: shareText,
            url: shareUrl,
          });
        }
        return;
    }
    
    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };
  
  return (
    <Card className="bg-gradient-to-br from-brand/5 to-energy/5 border-brand/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Award className="h-5 w-5 text-brand" />
          <span className="font-medium">Share your progress!</span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={() => handleShare("twitter")}
          >
            <Twitter className="h-4 w-4 mr-1" />
            Twitter
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={() => handleShare("facebook")}
          >
            <Facebook className="h-4 w-4 mr-1" />
            Facebook
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleShare("copy")}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleShare("native")}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DailyTask {
  name: string;
  description: string;
  type: string;
  isRequired: boolean;
}

interface TaskCompletion {
  taskName: string;
  completed: boolean;
  value?: string | number;
  notes?: string;
}

interface DailyCheckInProps {
  challengeId: string;
  challengeName: string;
  dayNumber: number;
  totalDays: number;
  dailyTasks: DailyTask[];
  previousCompletions?: TaskCompletion[];
  currentStreak?: number;
  longestStreak?: number;
  completedDays?: number[];
  onSubmit: (completions: TaskCompletion[]) => Promise<void>;
}

// Icon mapping for task types
const taskIcons: Record<string, React.ReactNode> = {
  workout: <Dumbbell className="h-5 w-5" />,
  nutrition: <Apple className="h-5 w-5" />,
  hydration: <Droplets className="h-5 w-5" />,
  reading: <Book className="h-5 w-5" />,
  photo: <Camera className="h-5 w-5" />,
  mindset: <Brain className="h-5 w-5" />,
  recovery: <Heart className="h-5 w-5" />,
  sleep: <Moon className="h-5 w-5" />,
  steps: <Footprints className="h-5 w-5" />,
  abstinence: <XCircle className="h-5 w-5" />,
  custom: <Circle className="h-5 w-5" />,
};

// Color mapping for task types
const taskColors: Record<string, string> = {
  workout: "bg-brand/20 text-brand border-brand/30",
  nutrition: "bg-green-500/20 text-green-500 border-green-500/30",
  hydration: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  reading: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  photo: "bg-pink-500/20 text-pink-500 border-pink-500/30",
  mindset: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  recovery: "bg-red-500/20 text-red-500 border-red-500/30",
  sleep: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30",
  steps: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  abstinence: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  custom: "bg-muted text-muted-foreground border-muted",
};

// Task-specific input components
function HydrationTracker({ 
  value, 
  onChange 
}: { 
  value: number; 
  onChange: (val: number) => void;
}) {
  const glasses = Math.floor(value / 8); // 8oz per glass
  const totalTarget = 128; // 1 gallon = 128oz
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {value} oz / {totalTarget} oz
        </span>
        <span className="text-sm font-medium">
          {Math.round((value / totalTarget) * 100)}%
        </span>
      </div>
      <Progress value={(value / totalTarget) * 100} className="h-3" />
      <div className="flex items-center justify-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onChange(Math.max(0, value - 8))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i}
              className={cn(
                "w-4 h-8 rounded-sm border transition-colors",
                i < glasses ? "bg-blue-500 border-blue-500" : "bg-muted border-border"
              )}
            />
          ))}
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onChange(Math.min(totalTarget, value + 8))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onChange(Math.min(totalTarget, value + 16))}
        >
          +16oz
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onChange(Math.min(totalTarget, value + 32))}
        >
          +32oz
        </Button>
      </div>
    </div>
  );
}

function ReadingTracker({ 
  value, 
  onChange,
  target = 10 
}: { 
  value: number; 
  onChange: (val: number) => void;
  target?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Pages read today</span>
        <span className={cn(
          "text-sm font-medium",
          value >= target ? "text-success" : ""
        )}>
          {value} / {target} pages
        </span>
      </div>
      <Progress value={Math.min(100, (value / target) * 100)} className="h-3" />
      <div className="flex items-center justify-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-20 text-center"
        />
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(value + 5)}>+5</Button>
        <Button variant="outline" size="sm" onClick={() => onChange(value + 10)}>+10</Button>
      </div>
    </div>
  );
}

function StepsTracker({ 
  value, 
  onChange,
  target = 10000 
}: { 
  value: number; 
  onChange: (val: number) => void;
  target?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Steps today</span>
        <span className={cn(
          "text-sm font-medium",
          value >= target ? "text-success" : ""
        )}>
          {value.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <Progress value={Math.min(100, (value / target) * 100)} className="h-3" />
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="text-center text-lg"
        placeholder="Enter step count"
      />
    </div>
  );
}

function PhotoUpload({ 
  onUpload 
}: { 
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        const { url } = await res.json();
        onUpload(url);
        toast.success("Photo uploaded!");
      }
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="cursor-pointer">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleUpload}
          disabled={uploading}
        />
        <div className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors",
          "hover:bg-muted/50 hover:border-brand",
          uploading && "opacity-50"
        )}>
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Tap to upload photo"}
          </span>
        </div>
      </label>
    </div>
  );
}

// Main component
export function DailyCheckIn({
  challengeId,
  challengeName,
  dayNumber,
  totalDays,
  dailyTasks,
  previousCompletions = [],
  currentStreak = 0,
  longestStreak = 0,
  completedDays = [],
  onSubmit,
}: DailyCheckInProps) {
  const [completions, setCompletions] = useState<Record<string, TaskCompletion>>(() => {
    const initial: Record<string, TaskCompletion> = {};
    dailyTasks.forEach((task) => {
      const prev = previousCompletions.find((c) => c.taskName === task.name);
      initial[task.name] = prev || {
        taskName: task.name,
        completed: false,
        value: undefined,
        notes: "",
      };
    });
    return initial;
  });

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleTask = (taskName: string) => {
    setCompletions((prev) => ({
      ...prev,
      [taskName]: {
        ...prev[taskName],
        completed: !prev[taskName].completed,
      },
    }));
  };

  const updateTaskValue = (taskName: string, value: string | number) => {
    setCompletions((prev) => ({
      ...prev,
      [taskName]: {
        ...prev[taskName],
        value,
      },
    }));
  };

  const completedCount = Object.values(completions).filter((c) => c.completed).length;
  const requiredTasks = dailyTasks.filter((t) => t.isRequired);
  const requiredCompleted = requiredTasks.filter((t) => completions[t.name]?.completed).length;
  const allRequiredDone = requiredCompleted === requiredTasks.length;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(Object.values(completions));
      toast.success("Day logged successfully!");
    } catch (err) {
      toast.error("Failed to save progress");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if today is at risk (incomplete and after noon)
  const isAtRisk = !allRequiredDone && new Date().getHours() >= 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{challengeName}</CardTitle>
            <Badge variant="outline" className="font-mono">
              Day {dayNumber}/{totalDays}
            </Badge>
          </div>
          <Progress value={(dayNumber / totalDays) * 100} className="h-2 mt-2" />
        </CardHeader>
      </Card>

      {/* Streak Display */}
      <StreakDisplay 
        currentStreak={currentStreak}
        longestStreak={Math.max(longestStreak, currentStreak)}
        isAtRisk={isAtRisk}
      />

      {/* Weekly Progress Chart */}
      <Card>
        <CardContent className="pt-4">
          <WeeklyProgressChart 
            completedDays={completedDays}
            currentDay={dayNumber}
            totalDays={totalDays}
          />
        </CardContent>
      </Card>

      {/* Daily Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Tasks</CardTitle>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{dailyTasks.length} complete
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dailyTasks.map((task) => {
            const completion = completions[task.name];
            const isCompleted = completion?.completed;
            
            return (
              <div 
                key={task.name}
                className={cn(
                  "rounded-lg border p-4 transition-all",
                  taskColors[task.type] || taskColors.custom,
                  isCompleted && "ring-2 ring-success/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="mt-0.5 cursor-pointer"
                    onClick={() => toggleTask(task.name)}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-success" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      {taskIcons[task.type] || taskIcons.custom}
                      <span className="font-medium">{task.name}</span>
                      {task.isRequired && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    
                    {/* Type-specific inputs */}
                    {task.type === "hydration" && !isCompleted && (
                      <HydrationTracker
                        value={(completion?.value as number) || 0}
                        onChange={(val) => {
                          updateTaskValue(task.name, val);
                          if (val >= 128) toggleTask(task.name);
                        }}
                      />
                    )}
                    
                    {task.type === "reading" && !isCompleted && (
                      <ReadingTracker
                        value={(completion?.value as number) || 0}
                        onChange={(val) => {
                          updateTaskValue(task.name, val);
                          if (val >= 10) toggleTask(task.name);
                        }}
                      />
                    )}
                    
                    {task.type === "steps" && !isCompleted && (
                      <StepsTracker
                        value={(completion?.value as number) || 0}
                        onChange={(val) => {
                          updateTaskValue(task.name, val);
                          if (val >= 10000) toggleTask(task.name);
                        }}
                      />
                    )}
                    
                    {task.type === "photo" && !isCompleted && (
                      <PhotoUpload
                        onUpload={(url) => {
                          updateTaskValue(task.name, url);
                          toggleTask(task.name);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How was your day? Any wins or struggles to note?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full"
        disabled={!allRequiredDone || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Saving..." : allRequiredDone ? "Complete Day" : `Complete ${requiredTasks.length - requiredCompleted} more required tasks`}
      </Button>

      {/* Social Sharing (show after completing day or if they have a streak) */}
      {(allRequiredDone || currentStreak > 0) && (
        <SocialShare 
          challengeName={challengeName}
          dayNumber={dayNumber}
          streak={currentStreak + (allRequiredDone ? 1 : 0)}
        />
      )}
    </div>
  );
}

export default DailyCheckIn;
