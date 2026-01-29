"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Flame,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TodayCheckInClientProps {
  challenge: {
    id: string;
    name: string;
    durationDays: number | null;
    dailyTasks: unknown;
  };
  participation: {
    id: string;
    currentStreak: number | null;
    daysCompleted: number | null;
  };
  currentDay: number;
  alreadyCheckedIn: boolean;
  todayProgress: {
    id: string;
    day: number;
    tasksCompleted: unknown;
    notes: string | null;
  } | null;
}

export function TodayCheckInClient({
  challenge,
  participation,
  currentDay,
  alreadyCheckedIn: initialCheckedIn,
  todayProgress,
}: TodayCheckInClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(initialCheckedIn);

  const dailyTasks = (challenge.dailyTasks as string[]) || [];
  const completedTasks = (todayProgress?.tasksCompleted as string[]) || [];

  const [checkedTasks, setCheckedTasks] = useState<string[]>(
    alreadyCheckedIn ? completedTasks : []
  );
  const [notes, setNotes] = useState(todayProgress?.notes || "");

  const totalDays = challenge.durationDays || 30;
  const currentStreak = participation.currentStreak || 0;

  const handleCheckIn = async () => {
    if (checkedTasks.length === 0 && dailyTasks.length > 0) {
      toast.error("Please complete at least one task");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: currentDay,
          tasksCompleted: checkedTasks,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to check in");

      toast.success("Check-in complete!", {
        description: `Day ${currentDay} done! Keep going!`,
      });
      setAlreadyCheckedIn(true);
      router.refresh();
    } catch {
      toast.error("Failed to check in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = (task: string) => {
    if (alreadyCheckedIn) return;
    setCheckedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const allTasksComplete =
    dailyTasks.length === 0 || checkedTasks.length === dailyTasks.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/challenge/${challenge.id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{challenge.name}</h1>
            <p className="text-xs text-muted-foreground">Daily Check-In</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Day Progress */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            Day {currentDay} of {totalDays}
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Flame className="h-3 w-3 mr-1 text-orange-500" />
            {currentStreak} day streak
          </Badge>
        </div>

        {/* Already Checked In */}
        {alreadyCheckedIn ? (
          <Card className="bg-gradient-to-br from-success/10 to-energy/10 border-success/20">
            <CardContent className="py-8 text-center">
              <PartyPopper className="h-16 w-16 mx-auto text-success mb-4" />
              <h2 className="text-2xl font-bold mb-2">Already Checked In!</h2>
              <p className="text-muted-foreground">
                You&apos;ve completed day {currentDay}. Come back tomorrow!
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-medium">
                  {currentStreak + 1} day streak going strong!
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Daily Tasks */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-energy" />
                  Today&apos;s Tasks
                </h3>

                {dailyTasks.length > 0 ? (
                  <div className="space-y-3">
                    {dailyTasks.map((task, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                          checkedTasks.includes(task)
                            ? "bg-success/10 border border-success/20"
                            : "bg-muted/50 hover:bg-muted"
                        )}
                        onClick={() => toggleTask(task)}
                      >
                        <Checkbox
                          checked={checkedTasks.includes(task)}
                          onCheckedChange={() => toggleTask(task)}
                          className="mt-0.5"
                        />
                        <span
                          className={cn(
                            "text-sm",
                            checkedTasks.includes(task) && "line-through opacity-70"
                          )}
                        >
                          {task}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No specific tasks - just check in to maintain your streak!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Notes (Optional)</h3>
                <Textarea
                  placeholder="How did it go today? Any wins or struggles?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Check In Button */}
            <Button
              className={cn(
                "w-full",
                allTasksComplete ? "bg-success-gradient" : "bg-brand-gradient"
              )}
              size="lg"
              onClick={handleCheckIn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Checking in..."
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {allTasksComplete
                    ? "Complete Check-In"
                    : `Check In (${checkedTasks.length}/${dailyTasks.length})`}
                </>
              )}
            </Button>
          </>
        )}

        {/* Back to Challenge */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/challenge/${challenge.id}`)}
        >
          View Challenge Details
        </Button>
      </div>
    </div>
  );
}
