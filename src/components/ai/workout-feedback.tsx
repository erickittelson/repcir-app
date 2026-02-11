"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutFeedbackProps {
  workoutPlanId?: string;
  sessionId?: string;
  memberId?: string;
  className?: string;
}

export function WorkoutFeedback({
  workoutPlanId,
  sessionId,
  memberId,
  className,
}: WorkoutFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  const submitFeedback = async (value: number) => {
    setRating(value);
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutPlanId,
          sessionId,
          memberId,
          rating: value,
        }),
      });
      setSubmitted(true);
    } catch {
      // Silent fail — non-critical
    }
  };

  if (submitted) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <Check className="h-3.5 w-3.5 text-green-500" />
        Thanks for your feedback
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-xs text-muted-foreground mr-1">Rate this workout:</span>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          rating === 1 && "text-green-500 bg-green-500/10"
        )}
        onClick={() => submitFeedback(1)}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0",
          rating === -1 && "text-red-500 bg-red-500/10"
        )}
        onClick={() => submitFeedback(-1)}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
