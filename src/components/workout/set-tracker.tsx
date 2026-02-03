"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus as TrendFlat,
  History,
  Trophy,
  Flame,
  SkipForward,
  Volume2,
  VolumeX,
  Dumbbell,
  Target,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

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

interface PreviousPerformance {
  date: string;
  sets: Array<{
    reps: number;
    weight: number;
    rpe?: number;
  }>;
  bestSet: {
    reps: number;
    weight: number;
    volume: number; // weight * reps
  };
}

interface SetTrackerProps {
  exerciseName: string;
  exerciseId: string;
  sets: ExerciseSet[];
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  previousPerformance?: PreviousPerformance;
  restDurationSeconds?: number;
  unit?: "lbs" | "kg";
  onSetComplete: (setIndex: number, data: Partial<ExerciseSet>) => void;
  onAddSet?: () => void;
  disabled?: boolean;
}

interface SetInputRowProps {
  set: ExerciseSet;
  setIndex: number;
  previousSet?: { reps: number; weight: number };
  unit: "lbs" | "kg";
  onUpdate: (data: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  disabled?: boolean;
}

interface WeightSelectorProps {
  value: number;
  onChange: (value: number) => void;
  unit: "lbs" | "kg";
  onUnitToggle?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

interface RepsSelectorProps {
  value: number;
  onChange: (value: number) => void;
  maxOption?: boolean;
  onMaxSelected?: () => void;
  disabled?: boolean;
}

interface SetCompletionCelebrationProps {
  show: boolean;
  onComplete: () => void;
  setNumber: number;
  weight?: number;
  reps?: number;
  isPR?: boolean;
}

interface ExerciseHistoryProps {
  exerciseName: string;
  previousPerformance?: PreviousPerformance;
}

interface RestTimerInlineProps {
  durationSeconds: number;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  soundEnabled?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// Pre-generated confetti particle data (to avoid Math.random during render)
const CONFETTI_PARTICLES = [
  { left: 12, top: 23, color: "#C9A227", delay: 50, duration: 1200 },
  { left: 45, top: 67, color: "#D4AF37", delay: 120, duration: 1400 },
  { left: 78, top: 34, color: "#FFD700", delay: 200, duration: 1100 },
  { left: 23, top: 89, color: "#22c55e", delay: 80, duration: 1500 },
  { left: 56, top: 12, color: "#3b82f6", delay: 180, duration: 1300 },
  { left: 89, top: 56, color: "#C9A227", delay: 30, duration: 1600 },
  { left: 34, top: 45, color: "#D4AF37", delay: 250, duration: 1200 },
  { left: 67, top: 78, color: "#FFD700", delay: 100, duration: 1400 },
  { left: 11, top: 90, color: "#22c55e", delay: 150, duration: 1100 },
  { left: 90, top: 11, color: "#3b82f6", delay: 220, duration: 1500 },
  { left: 22, top: 55, color: "#C9A227", delay: 70, duration: 1300 },
  { left: 55, top: 22, color: "#D4AF37", delay: 280, duration: 1600 },
  { left: 77, top: 88, color: "#FFD700", delay: 40, duration: 1200 },
  { left: 44, top: 33, color: "#22c55e", delay: 190, duration: 1400 },
  { left: 88, top: 44, color: "#3b82f6", delay: 110, duration: 1100 },
  { left: 33, top: 77, color: "#C9A227", delay: 260, duration: 1500 },
  { left: 66, top: 11, color: "#D4AF37", delay: 90, duration: 1300 },
  { left: 99, top: 66, color: "#FFD700", delay: 160, duration: 1600 },
  { left: 8, top: 50, color: "#22c55e", delay: 230, duration: 1200 },
  { left: 50, top: 8, color: "#3b82f6", delay: 140, duration: 1400 },
];

// ============================================================================
// SET COMPLETION CELEBRATION
// ============================================================================

export function SetCompletionCelebration({
  show,
  onComplete,
  setNumber,
  weight,
  reps,
  isPR = false,
}: SetCompletionCelebrationProps) {
  // Animation visibility state
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting">("entering");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/set-complete.mp3");
    }
  }, []);

  // Handle show becoming true - start the animation
  const startAnimation = useCallback(() => {
    // Clear any existing timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setIsVisible(true);
    setPhase("entering");

    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Vibrate on mobile
    if ("vibrate" in navigator) {
      navigator.vibrate(isPR ? [100, 50, 100, 50, 200] : [100, 50, 100]);
    }

    // Animation sequence using timeouts
    const enterTimer = setTimeout(() => setPhase("visible"), 50);
    const exitTimer = setTimeout(() => setPhase("exiting"), 1500);
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2000);

    timersRef.current = [enterTimer, exitTimer, completeTimer];
  }, [isPR, onComplete]);

  // Track show prop changes using a ref
  const prevShowRef = useRef(false);
  useEffect(() => {
    if (show && !prevShowRef.current) {
      startAnimation();
    }
    prevShowRef.current = show;

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [show, startAnimation]);

  if (!isVisible) return null;

  const animationState = phase;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
        "transition-opacity duration-300",
        animationState === "entering" && "opacity-0",
        animationState === "visible" && "opacity-100",
        animationState === "exiting" && "opacity-0"
      )}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Celebration content */}
      <div
        className={cn(
          "relative flex flex-col items-center gap-4 p-8",
          "transition-transform duration-300 ease-out",
          animationState === "entering" && "scale-50",
          animationState === "visible" && "scale-100",
          animationState === "exiting" && "scale-110"
        )}
      >
        {/* Checkmark circle */}
        <div
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center",
            "transition-all duration-500",
            isPR
              ? "bg-gradient-to-br from-amber-400 to-amber-600 glow-earned"
              : "bg-gradient-to-br from-success to-success/80 glow-success"
          )}
        >
          {isPR ? (
            <Trophy className="w-12 h-12 text-white animate-bounce" />
          ) : (
            <Check className="w-12 h-12 text-white" />
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {isPR ? "New PR!" : `Set ${setNumber} Complete!`}
          </p>
          {weight && reps && (
            <p className="text-lg text-white/80 mt-1">
              {weight} x {reps}
            </p>
          )}
        </div>

        {/* Confetti particles */}
        {isPR && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {CONFETTI_PARTICLES.map((particle, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  backgroundColor: particle.color,
                  animationDelay: `${particle.delay}ms`,
                  animationDuration: `${particle.duration}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WEIGHT SELECTOR
// ============================================================================

export function WeightSelector({
  value,
  onChange,
  unit,
  onUnitToggle,
  min = 0,
  max = 1000,
  disabled = false,
}: WeightSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const adjustments = unit === "lbs" ? [2.5, 5, 10, 25] : [1.25, 2.5, 5, 10];

  const handleAdjust = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, value + delta));
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  const handleInputBlur = () => {
    setIsEditing(false);
  };

  const handleDisplayClick = () => {
    if (!disabled) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Decrement buttons row */}
      <div className="flex gap-1.5">
        {adjustments.map((adj) => (
          <Button
            key={`minus-${adj}`}
            variant="outline"
            size="sm"
            className="h-10 w-12 text-sm font-medium touch-target"
            onClick={() => handleAdjust(-adj)}
            disabled={disabled || value - adj < min}
          >
            -{adj}
          </Button>
        ))}
      </div>

      {/* Main display */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          "w-full h-20 rounded-xl",
          "bg-card border-2 border-border",
          "transition-all duration-200",
          !disabled && "cursor-pointer hover:border-brand/50 active:scale-[0.98]",
          disabled && "opacity-50"
        )}
        onClick={handleDisplayClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-full h-full text-center text-4xl font-bold bg-transparent outline-none"
            min={min}
            max={max}
            step={unit === "lbs" ? 2.5 : 1.25}
            autoFocus
          />
        ) : (
          <span className="text-4xl font-bold tabular-nums">{value}</span>
        )}
        {onUnitToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnitToggle();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            disabled={disabled}
          >
            {unit}
          </button>
        )}
      </div>

      {/* Increment buttons row */}
      <div className="flex gap-1.5">
        {adjustments.map((adj) => (
          <Button
            key={`plus-${adj}`}
            variant="outline"
            size="sm"
            className="h-10 w-12 text-sm font-medium touch-target"
            onClick={() => handleAdjust(adj)}
            disabled={disabled || value + adj > max}
          >
            +{adj}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// REPS SELECTOR
// ============================================================================

export function RepsSelector({
  value,
  onChange,
  maxOption = true,
  onMaxSelected,
  disabled = false,
}: RepsSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMax, setIsMax] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickButtons = [5, 8, 10, 12, 15];

  const handleAdjust = (delta: number) => {
    const newValue = Math.max(0, value + delta);
    onChange(newValue);
    setIsMax(false);
  };

  const handleQuickSelect = (reps: number) => {
    onChange(reps);
    setIsMax(false);
  };

  const handleMaxToggle = () => {
    setIsMax(!isMax);
    if (!isMax && onMaxSelected) {
      onMaxSelected();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(Math.max(0, newValue));
    setIsMax(false);
  };

  const handleDisplayClick = () => {
    if (!disabled) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main display with +/- buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full text-xl font-bold touch-target"
          onClick={() => handleAdjust(-1)}
          disabled={disabled || value <= 0}
        >
          <Minus className="w-6 h-6" />
        </Button>

        <div
          className={cn(
            "relative flex items-center justify-center",
            "w-24 h-20 rounded-xl",
            "bg-card border-2 border-border",
            "transition-all duration-200",
            !disabled && "cursor-pointer hover:border-brand/50 active:scale-[0.98]",
            disabled && "opacity-50",
            isMax && "border-amber-500 bg-amber-500/10"
          )}
          onClick={handleDisplayClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              value={value}
              onChange={handleInputChange}
              onBlur={() => setIsEditing(false)}
              className="w-full h-full text-center text-4xl font-bold bg-transparent outline-none"
              min={0}
              autoFocus
            />
          ) : isMax ? (
            <div className="flex flex-col items-center">
              <Flame className="w-6 h-6 text-amber-500" />
              <span className="text-sm font-bold text-amber-500">MAX</span>
            </div>
          ) : (
            <span className="text-4xl font-bold tabular-nums">{value}</span>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full text-xl font-bold touch-target"
          onClick={() => handleAdjust(1)}
          disabled={disabled}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {quickButtons.map((reps) => (
          <Button
            key={reps}
            variant={value === reps && !isMax ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 w-11 text-sm font-medium touch-target-sm",
              value === reps && !isMax && "bg-brand hover:bg-brand/90"
            )}
            onClick={() => handleQuickSelect(reps)}
            disabled={disabled}
          >
            {reps}
          </Button>
        ))}
        {maxOption && (
          <Button
            variant={isMax ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 px-3 text-sm font-medium touch-target-sm",
              isMax && "bg-amber-500 hover:bg-amber-600 text-white"
            )}
            onClick={handleMaxToggle}
            disabled={disabled}
          >
            <Flame className="w-3.5 h-3.5 mr-1" />
            Max
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SET INPUT ROW
// ============================================================================

export function SetInputRow({
  set,
  setIndex: _setIndex,
  previousSet,
  unit,
  onUpdate,
  onComplete,
  disabled = false,
}: SetInputRowProps) {
  // setIndex is passed for potential future use but not currently needed
  void _setIndex;
  const [weight, setWeight] = useState(set.actualWeight ?? set.targetWeight ?? 0);
  const [reps, setReps] = useState(set.actualReps ?? set.targetReps ?? 0);
  const [expanded, setExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if this is a PR
  const isPR = previousSet
    ? weight * reps > previousSet.weight * previousSet.reps
    : false;

  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
    onUpdate({ actualWeight: newWeight });
  };

  const handleRepsChange = (newReps: number) => {
    setReps(newReps);
    onUpdate({ actualReps: newReps });
  };

  const handleComplete = () => {
    if (weight > 0 && reps > 0) {
      setShowCelebration(true);
      onUpdate({ completed: true, actualWeight: weight, actualReps: reps });
      onComplete();
    }
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setExpanded(false);
  };

  return (
    <>
      <SetCompletionCelebration
        show={showCelebration}
        onComplete={handleCelebrationComplete}
        setNumber={set.setNumber}
        weight={weight}
        reps={reps}
        isPR={isPR}
      />

      <div
        className={cn(
          "rounded-xl border-2 transition-all duration-200 overflow-hidden",
          set.completed
            ? "border-success/50 bg-success/5"
            : expanded
              ? "border-brand bg-card"
              : "border-border bg-card/50"
        )}
      >
        {/* Collapsed row */}
        <button
          className={cn(
            "w-full flex items-center gap-3 p-4 touch-target",
            !set.completed && !disabled && "hover:bg-muted/30"
          )}
          onClick={() => !set.completed && setExpanded(!expanded)}
          disabled={set.completed || disabled}
        >
          {/* Set number badge */}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
              set.completed
                ? "bg-success text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            {set.completed ? <Check className="w-5 h-5" /> : set.setNumber}
          </div>

          {/* Weight x Reps display */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xl font-bold tabular-nums",
                  set.completed ? "text-success" : "text-foreground"
                )}
              >
                {set.completed
                  ? `${set.actualWeight || weight} x ${set.actualReps || reps}`
                  : set.targetWeight && set.targetReps
                    ? `${set.targetWeight} x ${set.targetReps}`
                    : "Tap to enter"}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
              {isPR && set.completed && (
                <Badge className="bg-amber-500 text-white text-xs">
                  <Trophy className="w-3 h-3 mr-1" />
                  PR
                </Badge>
              )}
            </div>

            {/* Previous hint */}
            {previousSet && !set.completed && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Previous: {previousSet.weight} x {previousSet.reps}
              </p>
            )}
          </div>

          {/* Expand indicator */}
          {!set.completed && (
            <div className="text-muted-foreground">
              {expanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          )}
        </button>

        {/* Expanded input section */}
        {expanded && !set.completed && (
          <div className="border-t border-border p-4 space-y-6 bg-card">
            <div className="grid grid-cols-2 gap-6">
              {/* Weight column */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2 text-center">
                  Weight ({unit})
                </label>
                <WeightSelector
                  value={weight}
                  onChange={handleWeightChange}
                  unit={unit}
                  disabled={disabled}
                />
              </div>

              {/* Reps column */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2 text-center">
                  Reps
                </label>
                <RepsSelector
                  value={reps}
                  onChange={handleRepsChange}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Complete button */}
            <Button
              className={cn(
                "w-full h-14 text-lg font-bold touch-target",
                "bg-brand hover:bg-brand/90 text-brand-foreground",
                "transition-all duration-200 active:scale-[0.98]"
              )}
              onClick={handleComplete}
              disabled={disabled || weight <= 0 || reps <= 0}
            >
              <Check className="w-6 h-6 mr-2" />
              Complete Set {set.setNumber}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// EXERCISE HISTORY
// ============================================================================

export function ExerciseHistory({
  exerciseName,
  previousPerformance,
}: ExerciseHistoryProps) {
  if (!previousPerformance) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="w-4 h-4" />
        <span>First time doing {exerciseName}!</span>
        <Sparkles className="w-4 h-4 text-amber-500" />
      </div>
    );
  }

  const { date, bestSet, sets } = previousPerformance;
  const totalVolume = sets.reduce((acc, s) => acc + s.weight * s.reps, 0);

  // Calculate trend (simplified - in real app would compare multiple sessions)
  // TODO: Actually compute this from historical data
  type TrendType = "improving" | "stable" | "declining";
  const trend = "improving" as TrendType;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Last Workout</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatRelativeDate(date)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Best Set */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Trophy className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">
              {bestSet.weight} x {bestSet.reps}
            </p>
            <p className="text-xs text-muted-foreground">Best Set</p>
          </div>

          {/* Total Volume */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Dumbbell className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">{totalVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Volume (lbs)</p>
          </div>

          {/* Trend */}
          <div className="text-center">
            <div
              className={cn(
                "flex items-center justify-center gap-1 mb-1",
                trend === "improving" && "text-success",
                trend === "declining" && "text-destructive",
                trend === "stable" && "text-muted-foreground"
              )}
            >
              {trend === "improving" && <TrendingUp className="w-4 h-4" />}
              {trend === "declining" && <TrendingDown className="w-4 h-4" />}
              {trend === "stable" && <TrendFlat className="w-4 h-4" />}
            </div>
            <p className="text-lg font-bold capitalize">{trend}</p>
            <p className="text-xs text-muted-foreground">Trend</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// REST TIMER INLINE
// ============================================================================

export function RestTimerInline({
  durationSeconds,
  onComplete,
  onSkip,
  autoStart = true,
  soundEnabled = true,
}: RestTimerInlineProps) {
  // Initialize state from props - using function initializers for first render only
  const [timeRemaining, setTimeRemaining] = useState(() => durationSeconds);
  const [isRunning, setIsRunning] = useState(() => autoStart);
  const [isSoundEnabled, setIsSoundEnabled] = useState(soundEnabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Track if this is the first render to handle prop changes correctly
  const isFirstRender = useRef(true);
  const lastDurationRef = useRef(durationSeconds);
  const lastAutoStartRef = useRef(autoStart);

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/timer-complete.mp3");
    }
  }, []);

  // Handle prop changes after initial mount via event handlers pattern
  // This avoids the setState-in-effect pattern by using the mount/unmount lifecycle
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only update if props actually changed
    if (durationSeconds !== lastDurationRef.current) {
      lastDurationRef.current = durationSeconds;
      // Use a microtask to batch with other updates
      queueMicrotask(() => setTimeRemaining(durationSeconds));
    }
    if (autoStart !== lastAutoStartRef.current) {
      lastAutoStartRef.current = autoStart;
      queueMicrotask(() => setIsRunning(autoStart));
    }
  }, [durationSeconds, autoStart]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);

            // Play sound
            if (isSoundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }

            // Vibrate
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }

            onComplete?.();
            return 0;
          }

          // Warning beep at 3 seconds
          if (prev <= 4 && isSoundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, isSoundEnabled, onComplete]);

  const handleSkip = () => {
    setIsRunning(false);
    setTimeRemaining(0);
    onSkip?.();
  };

  const handleAddTime = (seconds: number) => {
    setTimeRemaining((prev) => prev + seconds);
    if (!isRunning) setIsRunning(true);
  };

  const progress = ((durationSeconds - timeRemaining) / durationSeconds) * 100;
  const isLowTime = timeRemaining <= 10;

  if (timeRemaining === 0 && !isRunning) return null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all duration-300",
        isLowTime
          ? "border-amber-500 bg-amber-500/10"
          : "border-brand/30 bg-brand/5"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock
            className={cn(
              "w-5 h-5",
              isLowTime ? "text-amber-500 animate-pulse" : "text-brand"
            )}
          />
          <span className="font-medium">Rest</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {isSoundEnabled ? (
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Time display */}
        <div
          className={cn(
            "text-4xl font-mono font-bold tabular-nums",
            isLowTime ? "text-amber-500" : "text-foreground"
          )}
        >
          {formatTime(timeRemaining)}
        </div>

        {/* Progress bar */}
        <div className="flex-1">
          <Progress
            value={progress}
            className={cn("h-2", isLowTime && "[&>div]:bg-amber-500")}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 touch-target-sm"
            onClick={() => handleAddTime(30)}
          >
            +30s
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-9 px-3 bg-brand hover:bg-brand/90 touch-target-sm"
            onClick={handleSkip}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN SET TRACKER COMPONENT
// ============================================================================

export function SetTracker({
  exerciseName,
  exerciseId: _exerciseId,
  sets,
  targetSets = 4,
  targetReps = 10,
  targetWeight = 135,
  previousPerformance,
  restDurationSeconds = 90,
  unit = "lbs",
  onSetComplete,
  onAddSet,
  disabled = false,
}: SetTrackerProps) {
  // exerciseId reserved for future use (e.g., fetching exercise history)
  void _exerciseId;

  const [activeUnit, setActiveUnit] = useState<"lbs" | "kg">(unit);
  const [showRestTimer, setShowRestTimer] = useState(false);
  // Track which set was just completed (for potential future animations/analytics)
  const [, setLastCompletedSetIndex] = useState<number | null>(null);

  const completedSets = sets.filter((s) => s.completed).length;
  const totalSets = sets.length;
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // Convert weight between units
  const convertWeight = useCallback(
    (weight: number, from: "lbs" | "kg", to: "lbs" | "kg"): number => {
      if (from === to) return weight;
      if (from === "lbs" && to === "kg") return Math.round(weight * 0.453592 * 2) / 2;
      return Math.round(weight * 2.20462 * 2) / 2;
    },
    []
  );

  const handleSetComplete = (setIndex: number, data: Partial<ExerciseSet>) => {
    onSetComplete(setIndex, data);

    if (data.completed) {
      setLastCompletedSetIndex(setIndex);
      setShowRestTimer(true);
    }
  };

  const handleRestComplete = () => {
    setShowRestTimer(false);
  };

  const handleUnitToggle = () => {
    setActiveUnit((prev) => (prev === "lbs" ? "kg" : "lbs"));
  };

  return (
    <div className="space-y-4">
      {/* Exercise Header */}
      <Card className="bg-gradient-to-br from-brand/10 to-brand/5 border-brand/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{exerciseName}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="border-brand/30 text-brand">
                  <Target className="w-3 h-3 mr-1" />
                  {targetSets} x {targetReps} @ {targetWeight} {activeUnit}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">
                {completedSets}/{totalSets}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-2 mt-4" />
        </CardHeader>
      </Card>

      {/* Exercise History */}
      <ExerciseHistory
        exerciseName={exerciseName}
        previousPerformance={previousPerformance}
      />

      {/* Rest Timer (shown after completing a set) */}
      {showRestTimer && (
        <RestTimerInline
          durationSeconds={restDurationSeconds}
          onComplete={handleRestComplete}
          onSkip={handleRestComplete}
          autoStart={true}
        />
      )}

      {/* Set Rows */}
      <div className="space-y-3">
        {sets.map((set, index) => (
          <SetInputRow
            key={set.id}
            set={set}
            setIndex={index}
            previousSet={
              previousPerformance?.sets[index]
                ? {
                    reps: previousPerformance.sets[index].reps,
                    weight: convertWeight(
                      previousPerformance.sets[index].weight,
                      "lbs",
                      activeUnit
                    ),
                  }
                : undefined
            }
            unit={activeUnit}
            onUpdate={(data) => handleSetComplete(index, data)}
            onComplete={() => {}}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Add Set Button */}
      {onAddSet && (
        <Button
          variant="outline"
          className="w-full h-12 border-dashed border-2 touch-target"
          onClick={onAddSet}
          disabled={disabled}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Set
        </Button>
      )}

      {/* Unit Toggle */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            activeUnit === "lbs" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          lbs
        </span>
        <Switch
          checked={activeUnit === "kg"}
          onCheckedChange={() => handleUnitToggle()}
        />
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            activeUnit === "kg" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          kg
        </span>
      </div>
    </div>
  );
}

export default SetTracker;
