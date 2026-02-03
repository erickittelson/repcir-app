"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Dumbbell,
  Clock,
  Target,
  Trash2,
  Edit2,
  Info,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// =============================================================================
// TYPES
// =============================================================================

export interface ExerciseData {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category?: string;
  muscleGroups?: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  difficulty?: string;
  videoUrl?: string;
  imageUrl?: string;
  safetyNotes?: string;
}

export interface ExerciseSetData {
  id: string;
  setNumber: number;
  targetReps?: number;
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  completed: boolean;
  rpe?: number;
  notes?: string;
}

export interface PlanExerciseData {
  id: string;
  exercise: ExerciseData;
  sets?: number;
  reps?: string;
  weight?: string;
  duration?: number;
  restBetweenSets?: number;
  notes?: string;
  groupId?: string;
  groupType?: string;
}

// =============================================================================
// MUSCLE GROUP COLORS
// =============================================================================

const muscleGroupColors: Record<string, string> = {
  // Upper body
  chest: "bg-red-500/20 text-red-400 border-red-500/30",
  shoulders: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  triceps: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  biceps: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  forearms: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  back: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  lats: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  traps: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  // Core
  abs: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  obliques: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  core: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  // Lower body
  glutes: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  quads: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  hamstrings: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  calves: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  // Default
  default: "bg-brand/20 text-brand border-brand/30",
};

function getMuscleGroupColor(muscle: string): string {
  const key = muscle.toLowerCase().replace(/\s+/g, "");
  return muscleGroupColors[key] || muscleGroupColors.default;
}

// =============================================================================
// EXERCISE CARD - Main exercise display card
// =============================================================================

interface ExerciseCardProps {
  exercise: ExerciseData;
  sets?: number;
  reps?: string;
  weight?: string;
  restTime?: number;
  notes?: string;
  videoThumbnail?: string;
  onExpand?: () => void;
  defaultExpanded?: boolean;
  className?: string;
}

export function ExerciseCard({
  exercise,
  sets,
  reps,
  weight,
  restTime,
  notes,
  videoThumbnail,
  onExpand,
  defaultExpanded = false,
  className,
}: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onExpand) {
      onExpand();
    }
  };

  const muscleGroups = exercise.muscleGroups || [];
  const thumbnail = videoThumbnail || exercise.imageUrl;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "bg-card border-border overflow-hidden transition-all duration-300",
          isExpanded && "ring-1 ring-brand/30 glow-brand",
          className
        )}
      >
        <CardContent className="p-0">
          {/* Main Content - Touchable Header */}
          <button
            onClick={handleToggle}
            className="w-full text-left p-4 min-h-[88px] flex items-start gap-4 touch-target"
          >
            {/* Thumbnail */}
            {thumbnail && (
              <motion.div
                layout
                className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0"
              >
                <img
                  src={thumbnail}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
                {exercise.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                )}
              </motion.div>
            )}

            {/* Exercise Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate pr-2">
                    {exercise.name}
                  </h3>

                  {/* Quick Stats Row */}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                    {sets && reps && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {sets} x {reps}
                      </span>
                    )}
                    {weight && (
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5" />
                        {weight}
                      </span>
                    )}
                    {restTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {restTime}s rest
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </div>

              {/* Muscle Groups */}
              {muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {muscleGroups.slice(0, 3).map((muscle) => (
                    <Badge
                      key={muscle}
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 capitalize border",
                        getMuscleGroupColor(muscle)
                      )}
                    >
                      {muscle}
                    </Badge>
                  ))}
                  {muscleGroups.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 bg-muted/50"
                    >
                      +{muscleGroups.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Description */}
                  {exercise.description && (
                    <div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {exercise.description}
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  {exercise.instructions && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Info className="w-4 h-4 text-brand" />
                        Instructions
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {exercise.instructions}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {notes && (
                    <div className="bg-brand/10 rounded-lg p-3 border border-brand/20">
                      <p className="text-sm text-brand">{notes}</p>
                    </div>
                  )}

                  {/* Safety Notes */}
                  {exercise.safetyNotes && (
                    <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                      <p className="text-sm text-destructive/80">
                        {exercise.safetyNotes}
                      </p>
                    </div>
                  )}

                  {/* Equipment */}
                  {exercise.equipment && exercise.equipment.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Equipment
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.equipment.map((item) => (
                          <Badge
                            key={item}
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Secondary Muscles */}
                  {exercise.secondaryMuscles &&
                    exercise.secondaryMuscles.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Secondary Muscles
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {exercise.secondaryMuscles.map((muscle) => (
                            <Badge
                              key={muscle}
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-5 capitalize border opacity-70",
                                getMuscleGroupColor(muscle)
                              )}
                            >
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// COMPACT EXERCISE CARD - Smaller version for lists
// =============================================================================

interface CompactExerciseCardProps {
  exercise: ExerciseData;
  sets?: number;
  reps?: string;
  weight?: string;
  onTap?: () => void;
  isActive?: boolean;
  completed?: boolean;
  className?: string;
}

export function CompactExerciseCard({
  exercise,
  sets,
  reps,
  weight,
  onTap,
  isActive = false,
  completed = false,
  className,
}: CompactExerciseCardProps) {
  return (
    <motion.button
      onClick={onTap}
      className={cn(
        "w-full text-left rounded-xl p-3 min-h-[56px] transition-all duration-200",
        "bg-card border border-border",
        "active:scale-[0.98]",
        isActive && "ring-2 ring-brand border-brand bg-brand/5",
        completed && "opacity-60",
        className
      )}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {/* Completion Indicator */}
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            completed
              ? "bg-success text-success-foreground"
              : "bg-muted border border-border"
          )}
        >
          {completed && <Check className="w-4 h-4" />}
        </div>

        {/* Exercise Info */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "font-medium text-foreground truncate",
              completed && "line-through"
            )}
          >
            {exercise.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {sets && reps && <span>{sets} x {reps}</span>}
            {weight && (
              <>
                <span className="text-border">•</span>
                <span>{weight}</span>
              </>
            )}
          </div>
        </div>

        {/* Muscle Preview */}
        {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 h-5 capitalize border",
              getMuscleGroupColor(exercise.muscleGroups[0])
            )}
          >
            {exercise.muscleGroups[0]}
          </Badge>
        )}

        {/* Chevron */}
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </motion.button>
  );
}

// =============================================================================
// EXERCISE SET ROW - Individual set display
// =============================================================================

interface ExerciseSetRowProps {
  setData: ExerciseSetData;
  onComplete?: (completed: boolean) => void;
  onUpdateReps?: (reps: number) => void;
  onUpdateWeight?: (weight: number) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  weightUnit?: string;
  isEditing?: boolean;
  className?: string;
}

export function ExerciseSetRow({
  setData,
  onComplete,
  onUpdateReps,
  onUpdateWeight,
  onDelete,
  onEdit,
  weightUnit = "lbs",
  isEditing = false,
  className,
}: ExerciseSetRowProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const SWIPE_THRESHOLD = 80;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setSwipeX(-120);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  };

  const handleComplete = () => {
    onComplete?.(!setData.completed);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Hidden Actions (revealed on swipe) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-14 rounded-none bg-muted/50 hover:bg-muted"
          onClick={() => {
            onEdit?.();
            setSwipeX(0);
            setIsRevealed(false);
          }}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-14 rounded-none bg-destructive/20 hover:bg-destructive/30 text-destructive"
          onClick={() => {
            onDelete?.();
            setSwipeX(0);
            setIsRevealed(false);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeX }}
        className={cn(
          "relative flex items-center gap-3 p-3 bg-card border border-border rounded-xl min-h-[56px]",
          setData.completed && "bg-success/5 border-success/30"
        )}
      >
        {/* Checkmark Button */}
        <motion.button
          onClick={handleComplete}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all touch-target",
            setData.completed
              ? "bg-success text-success-foreground"
              : "bg-muted border-2 border-dashed border-border hover:border-brand"
          )}
          whileTap={{ scale: 0.9 }}
        >
          {setData.completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Check className="w-5 h-5" />
            </motion.div>
          )}
        </motion.button>

        {/* Set Number */}
        <div className="w-8 text-center">
          <span className="text-sm font-bold text-muted-foreground">
            {setData.setNumber}
          </span>
        </div>

        {/* Reps Input/Display */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isEditing ? (
              <Input
                type="number"
                value={setData.actualReps ?? setData.targetReps ?? ""}
                onChange={(e) => onUpdateReps?.(parseInt(e.target.value) || 0)}
                className="w-16 h-8 text-center text-sm"
                min={0}
              />
            ) : (
              <span
                className={cn(
                  "font-medium",
                  setData.completed ? "text-success" : "text-foreground"
                )}
              >
                {setData.actualReps ?? setData.targetReps ?? "-"}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {setData.targetReps && setData.actualReps !== setData.targetReps
                ? `/ ${setData.targetReps} reps`
                : "reps"}
            </span>
          </div>
        </div>

        {/* Weight Input/Display */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <Input
              type="number"
              value={setData.actualWeight ?? setData.targetWeight ?? ""}
              onChange={(e) =>
                onUpdateWeight?.(parseFloat(e.target.value) || 0)
              }
              className="w-16 h-8 text-center text-sm"
              min={0}
              step={2.5}
            />
          ) : (
            <span
              className={cn(
                "font-medium",
                setData.completed ? "text-success" : "text-foreground"
              )}
            >
              {setData.actualWeight ?? setData.targetWeight ?? "-"}
            </span>
          )}
          <span className="text-sm text-muted-foreground">{weightUnit}</span>
        </div>

        {/* RPE Badge */}
        {setData.rpe && (
          <Badge variant="outline" className="text-xs">
            RPE {setData.rpe}
          </Badge>
        )}
      </motion.div>
    </div>
  );
}

// =============================================================================
// REST TIMER - Beautiful rest timer between sets
// =============================================================================

interface RestTimerProps {
  durationSeconds: number;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RestTimer({
  durationSeconds,
  onComplete,
  onSkip,
  autoStart = false,
  size = "md",
  className,
}: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isComplete, setIsComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            onComplete?.();
            return 0;
          }
          // Warning beep at 3 seconds
          if (prev === 4 && soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, soundEnabled, onComplete]);

  const reset = useCallback(() => {
    setTimeRemaining(durationSeconds);
    setIsRunning(false);
    setIsComplete(false);
  }, [durationSeconds]);

  const toggleRunning = () => {
    if (isComplete) {
      reset();
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleSkip = () => {
    setIsRunning(false);
    setIsComplete(true);
    onSkip?.();
    onComplete?.();
  };

  const progress = ((durationSeconds - timeRemaining) / durationSeconds) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sizes = {
    sm: { container: "w-24 h-24", text: "text-xl", icon: "w-4 h-4" },
    md: { container: "w-32 h-32", text: "text-3xl", icon: "w-5 h-5" },
    lg: { container: "w-40 h-40", text: "text-4xl", icon: "w-6 h-6" },
  };

  const currentSize = sizes[size];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("flex flex-col items-center gap-4", className)}
    >
      {/* Circular Progress Timer */}
      <div className={cn("relative", currentSize.container)}>
        {/* Background Circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className={cn(
              "transition-colors duration-300",
              isComplete
                ? "text-success"
                : timeRemaining <= 3
                  ? "text-destructive"
                  : "text-brand"
            )}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
            animate={{
              strokeDashoffset,
            }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="text-success"
            >
              <Check className={currentSize.icon} strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.span
              className={cn(
                "font-mono font-bold",
                currentSize.text,
                timeRemaining <= 3 ? "text-destructive animate-pulse" : "text-foreground"
              )}
              animate={
                isComplete
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
            >
              {formatTime(timeRemaining)}
            </motion.span>
          )}

          {!isComplete && (
            <span className="text-xs text-muted-foreground mt-1">
              {isRunning ? "Rest" : "Paused"}
            </span>
          )}
        </div>

        {/* Pulse Animation when complete */}
        {isComplete && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-success"
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              scale: [1, 1.3, 1.3],
              opacity: [1, 0, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="w-10 h-10"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={reset}
          className="w-10 h-10"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          onClick={toggleRunning}
          className={cn(
            "w-14 h-10",
            isRunning
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-brand hover:bg-brand/90"
          )}
        >
          {isRunning ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleSkip}
          className="w-10 h-10"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Skip text */}
      <button
        onClick={handleSkip}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip rest
      </button>
    </motion.div>
  );
}

// =============================================================================
// EXERCISE PROGRESS - Progress through exercise sets
// =============================================================================

interface ExerciseProgressProps {
  currentSet: number;
  totalSets: number;
  completedSets?: number[];
  variant?: "dots" | "bar" | "text";
  showLabel?: boolean;
  className?: string;
}

export function ExerciseProgress({
  currentSet,
  totalSets,
  completedSets = [],
  variant = "dots",
  showLabel = true,
  className,
}: ExerciseProgressProps) {
  const progress = (completedSets.length / totalSets) * 100;

  if (variant === "text") {
    return (
      <div className={cn("text-center", className)}>
        <span className="text-sm text-muted-foreground">
          Set{" "}
          <span className="font-bold text-foreground">{currentSet}</span> of{" "}
          <span className="font-bold text-foreground">{totalSets}</span>
        </span>
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedSets.length}/{totalSets} sets
            </span>
          </div>
        )}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-brand rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Current set indicator */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-brand-foreground rounded-full"
            animate={{
              left: `${((currentSet - 1) / totalSets) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    );
  }

  // Dots variant (default)
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          Set{" "}
          <span className="font-bold text-foreground">{currentSet}</span> of{" "}
          <span className="font-bold text-foreground">{totalSets}</span>
        </span>
      )}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSets }, (_, i) => {
          const setNumber = i + 1;
          const isCompleted = completedSets.includes(setNumber);
          const isCurrent = setNumber === currentSet;

          return (
            <motion.div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                isCompleted
                  ? "bg-success"
                  : isCurrent
                    ? "bg-brand ring-2 ring-brand/30"
                    : "bg-muted"
              )}
              initial={false}
              animate={{
                width: isCurrent ? 12 : 8,
                height: isCurrent ? 12 : 8,
                scale: isCompleted ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  ExerciseCard,
  CompactExerciseCard,
  ExerciseSetRow,
  RestTimer,
  ExerciseProgress,
};
