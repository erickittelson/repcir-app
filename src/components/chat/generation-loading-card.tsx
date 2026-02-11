"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { GenerationJobStatus } from "@/lib/types/workout-config";
import type { GeneratedWorkout } from "@/lib/ai/structured-chat";

const PROGRESS_MESSAGES = [
  { maxSeconds: 5, message: "Analyzing your profile..." },
  { maxSeconds: 12, message: "Selecting exercises..." },
  { maxSeconds: 20, message: "Calculating weights..." },
  { maxSeconds: 35, message: "Building your workout..." },
  { maxSeconds: 60, message: "Finalizing details..." },
  { maxSeconds: Infinity, message: "Almost there..." },
];

const TIMEOUT_MS = 120_000; // 2 minutes
const INITIAL_POLL_MS = 2_500;
const MAX_POLL_MS = 10_000;
const BACKOFF_AFTER_MS = 30_000;

interface GenerationLoadingCardProps {
  generationId: string;
  onComplete: (workout: GeneratedWorkout, planId?: string) => void;
  onError: (error: string) => void;
}

export function GenerationLoadingCard({
  generationId,
  onComplete,
  onError,
}: GenerationLoadingCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const startTimeRef = useRef(Date.now());
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const currentMessage = PROGRESS_MESSAGES.find((m) => elapsed <= m.maxSeconds)?.message
    || "Almost there...";

  // Estimated progress (fake progress that slows down over time)
  const progressPercent = Math.min(95, Math.round(
    elapsed < 10 ? elapsed * 5 :
    elapsed < 30 ? 50 + (elapsed - 10) * 1.5 :
    80 + (elapsed - 30) * 0.3
  ));

  const poll = useCallback(async () => {
    if (completedRef.current) return;

    try {
      const res = await fetch(`/api/ai/generate-workout/status/${generationId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Generation job not found.");
          return;
        }
        throw new Error(`Status check failed (${res.status})`);
      }

      const data: GenerationJobStatus = await res.json();

      if (data.status === "complete" && data.workout) {
        completedRef.current = true;
        onComplete(data.workout as unknown as GeneratedWorkout, data.planId);
        return;
      }

      if (data.status === "error") {
        completedRef.current = true;
        setError(data.error || "Workout generation failed.");
        onError(data.error || "Workout generation failed.");
        return;
      }

      // Check timeout
      const elapsedMs = Date.now() - startTimeRef.current;
      if (elapsedMs > TIMEOUT_MS) {
        completedRef.current = true;
        setError("Generation timed out. Please try again.");
        onError("Generation timed out.");
        return;
      }

      // Schedule next poll with backoff
      const pollInterval = elapsedMs > BACKOFF_AFTER_MS
        ? MAX_POLL_MS
        : INITIAL_POLL_MS;
      pollTimeoutRef.current = setTimeout(poll, pollInterval);
    } catch (err) {
      console.error("Poll error:", err);
      // Retry on network errors unless timed out
      const elapsedMs = Date.now() - startTimeRef.current;
      if (elapsedMs < TIMEOUT_MS) {
        pollTimeoutRef.current = setTimeout(poll, 5000);
      } else {
        completedRef.current = true;
        setError("Generation timed out. Please try again.");
        onError("Generation timed out.");
      }
    }
  }, [generationId, onComplete, onError]);

  useEffect(() => {
    // Start polling
    pollTimeoutRef.current = setTimeout(poll, INITIAL_POLL_MS);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  const handleRetry = () => {
    setRetrying(true);
    setError(null);
    completedRef.current = false;
    startTimeRef.current = Date.now();
    setElapsed(0);
    pollTimeoutRef.current = setTimeout(poll, INITIAL_POLL_MS);
    setRetrying(false);
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden"
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium text-sm">Generation Failed</span>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            disabled={retrying}
            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", retrying && "animate-spin")} />
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card overflow-hidden shadow-sm"
    >
      <div className="p-4 space-y-4">
        {/* Animated loader */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="h-8 w-8 text-brand animate-spin" />
            <div className="absolute inset-0 h-8 w-8 rounded-full bg-brand/10 animate-ping" />
          </div>
          <div>
            <p className="text-sm font-medium">{currentMessage}</p>
            <p className="text-xs text-muted-foreground">{elapsed}s elapsed</p>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-2" />
      </div>
    </motion.div>
  );
}
