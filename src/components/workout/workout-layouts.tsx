"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Repeat,
  Timer,
  Flame,
  Target,
  ListChecks,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Zap,
  ListOrdered,
} from "lucide-react";

// ==================== TYPES ====================

export interface LayoutExercise {
  id?: string;
  name: string;
  reps?: string | number;
  sets?: number;
  duration?: number; // in seconds
  weight?: string;
  notes?: string;
}

export interface WorkoutResult {
  totalTime: number;
  roundsCompleted: number;
  repsCompleted: number;
  score: string;
}

type WorkoutStructure =
  | "standard"
  | "emom"
  | "amrap"
  | "for_time"
  | "tabata"
  | "chipper"
  | "ladder"
  | "intervals";

// ==================== UTILITY FUNCTIONS ====================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeWithHours(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ==================== COUNTDOWN OVERLAY ====================

function CountdownOverlay({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    if (count > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [count, onComplete]);

  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/90 flex items-center justify-center z-20 rounded-lg"
    >
      <motion.div
        key={count}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        className="text-8xl font-bold text-amber-500"
      >
        {count}
      </motion.div>
    </motion.div>
  );
}

// ==================== TIMER CONTROLS ====================

interface TimerControlsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onSkip?: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  accentColor?: string;
  disabled?: boolean;
}

function TimerControls({
  isRunning,
  onPlayPause,
  onReset,
  onSkip,
  soundEnabled,
  onSoundToggle,
  accentColor = "bg-amber-500 hover:bg-amber-600",
  disabled = false,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        onClick={onSoundToggle}
        className="border-zinc-700 hover:bg-zinc-800"
      >
        {soundEnabled ? (
          <Volume2 className="h-4 w-4 text-zinc-300" />
        ) : (
          <VolumeX className="h-4 w-4 text-zinc-500" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onReset}
        className="border-zinc-700 hover:bg-zinc-800"
      >
        <RotateCcw className="h-4 w-4 text-zinc-300" />
      </Button>
      <Button
        size="lg"
        className={cn("w-24", isRunning ? "bg-orange-500 hover:bg-orange-600" : accentColor)}
        onClick={onPlayPause}
        disabled={disabled}
      >
        {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
      {onSkip && (
        <Button
          variant="outline"
          size="icon"
          onClick={onSkip}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          <SkipForward className="h-4 w-4 text-zinc-300" />
        </Button>
      )}
    </div>
  );
}

// ==================== EXERCISE LIST ITEM ====================

interface ExerciseListItemProps {
  exercise: LayoutExercise;
  index: number;
  isActive: boolean;
  isCompleted?: boolean;
  showCheckbox?: boolean;
  onToggleComplete?: (index: number) => void;
}

function ExerciseListItem({
  exercise,
  index,
  isActive,
  isCompleted = false,
  showCheckbox = false,
  onToggleComplete,
}: ExerciseListItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all",
        isActive && "bg-amber-500/20 border border-amber-500/50",
        isCompleted && !isActive && "opacity-50",
        !isActive && !isCompleted && "bg-zinc-800/50"
      )}
    >
      {showCheckbox && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete?.(index)}
          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
        />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            isActive && "text-amber-400",
            isCompleted && "line-through text-zinc-500"
          )}
        >
          {exercise.name}
        </p>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          {exercise.reps && <span>{exercise.reps} reps</span>}
          {exercise.duration && <span>{exercise.duration}s</span>}
          {exercise.weight && <span>{exercise.weight}</span>}
        </div>
      </div>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-2 h-2 rounded-full bg-amber-500"
        />
      )}
    </motion.div>
  );
}

// ==================== EMOM LAYOUT ====================

interface EMOMLayoutProps {
  exercises: LayoutExercise[];
  intervalSeconds?: number;
  totalMinutes?: number;
  alternatingPattern?: "all" | "odd-even" | "sequential";
  onComplete?: (result: WorkoutResult) => void;
  onRoundComplete?: (round: number) => void;
}

export function EMOMLayout({
  exercises,
  intervalSeconds = 60,
  totalMinutes = 20,
  alternatingPattern = "sequential",
  onComplete,
  onRoundComplete,
}: EMOMLayoutProps) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeInRound, setTimeInRound] = useState(intervalSeconds);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalRounds = totalMinutes;

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeInRound((prev) => {
          if (prev <= 1) {
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            onRoundComplete?.(currentRound);

            if (currentRound >= totalRounds) {
              setIsRunning(false);
              onComplete?.({
                totalTime: totalElapsed + 1,
                roundsCompleted: totalRounds,
                repsCompleted: 0,
                score: `${totalRounds} rounds`,
              });
              return 0;
            }

            setCurrentRound((r) => r + 1);
            return intervalSeconds;
          }
          return prev - 1;
        });
        setTotalElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [
    isRunning,
    intervalSeconds,
    currentRound,
    soundEnabled,
    onRoundComplete,
    totalRounds,
    totalElapsed,
    onComplete,
  ]);

  const getCurrentExerciseIndex = useCallback(() => {
    if (alternatingPattern === "odd-even") {
      return currentRound % 2 === 1 ? 0 : 1;
    } else if (alternatingPattern === "sequential") {
      return (currentRound - 1) % exercises.length;
    }
    return -1; // "all" pattern shows all exercises
  }, [alternatingPattern, currentRound, exercises.length]);

  const getUpcomingExercises = useCallback(() => {
    const upcoming: Array<{ round: number; exercise: LayoutExercise }> = [];
    for (let i = 1; i <= 3; i++) {
      const futureRound = currentRound + i;
      if (futureRound <= totalRounds) {
        let exerciseIndex: number;
        if (alternatingPattern === "odd-even") {
          exerciseIndex = futureRound % 2 === 1 ? 0 : 1;
        } else if (alternatingPattern === "sequential") {
          exerciseIndex = (futureRound - 1) % exercises.length;
        } else {
          exerciseIndex = 0;
        }
        upcoming.push({ round: futureRound, exercise: exercises[exerciseIndex] });
      }
    }
    return upcoming;
  }, [currentRound, totalRounds, alternatingPattern, exercises]);

  const reset = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setTimeInRound(intervalSeconds);
    setTotalElapsed(0);
  };

  const handleStart = () => {
    if (!isRunning && totalElapsed === 0) {
      setShowCountdown(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const onCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setIsRunning(true);
  }, []);

  const skipToNext = () => {
    setTimeInRound(1);
  };

  const progress = ((intervalSeconds - timeInRound) / intervalSeconds) * 100;
  const currentExerciseIndex = getCurrentExerciseIndex();
  const upcomingExercises = getUpcomingExercises();

  return (
    <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden">
      <AnimatePresence>
        {showCountdown && <CountdownOverlay onComplete={onCountdownComplete} />}
      </AnimatePresence>
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-black font-bold">
              <Timer className="h-3 w-3 mr-1" />
              EMOM
            </Badge>
            <span className="text-sm text-zinc-400">Every {intervalSeconds}s</span>
          </div>
          <div className="text-sm text-zinc-400">
            Round {currentRound}/{totalRounds}
          </div>
        </div>

        {/* Current Exercise */}
        <div className="text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRound}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-1"
            >
              {alternatingPattern === "all" ? (
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <p key={i} className="text-lg font-medium text-amber-400">
                      {ex.reps && `${ex.reps} `}
                      {ex.name}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-2xl font-bold text-amber-400">
                  {exercises[currentExerciseIndex]?.reps && `${exercises[currentExerciseIndex].reps} `}
                  {exercises[currentExerciseIndex]?.name}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div
            className={cn(
              "text-7xl font-mono font-bold transition-colors",
              timeInRound <= 5 ? "text-red-500 animate-pulse" : "text-amber-500"
            )}
          >
            {formatTime(timeInRound)}
          </div>
          <Progress value={progress} className="h-2 mt-4 bg-zinc-800" />
        </div>

        {/* Upcoming Exercises */}
        {alternatingPattern !== "all" && upcomingExercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Coming Up</p>
            <div className="space-y-1">
              {upcomingExercises.map((item, i) => (
                <motion.div
                  key={item.round}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 - i * 0.25, x: 0 }}
                  className="flex items-center justify-between text-sm text-zinc-400 p-2 rounded bg-zinc-800/50"
                >
                  <span>Min {item.round}</span>
                  <span>
                    {item.exercise.reps && `${item.exercise.reps} `}
                    {item.exercise.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{currentRound}</p>
            <p className="text-zinc-500">Minute</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{formatTimeWithHours(totalElapsed)}</p>
            <p className="text-zinc-500">Total Time</p>
          </div>
        </div>

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          onPlayPause={handleStart}
          onReset={reset}
          onSkip={skipToNext}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        />
      </CardContent>
    </Card>
  );
}

// ==================== AMRAP LAYOUT ====================

interface AMRAPLayoutProps {
  exercises: LayoutExercise[];
  timeCapSeconds?: number;
  onComplete?: (result: WorkoutResult) => void;
}

export function AMRAPLayout({ exercises, timeCapSeconds = 1200, onComplete }: AMRAPLayoutProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeCapSeconds);
  const [rounds, setRounds] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [extraReps, setExtraReps] = useState(0);
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
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            onComplete?.({
              totalTime: timeCapSeconds,
              roundsCompleted: rounds,
              repsCompleted: extraReps,
              score: `${rounds}+${extraReps}`,
            });
            return 0;
          }
          if (prev <= 4 && soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, rounds, extraReps, timeCapSeconds, soundEnabled, onComplete]);

  const reset = () => {
    setIsRunning(false);
    setTimeRemaining(timeCapSeconds);
    setRounds(0);
    setCurrentExerciseIndex(0);
    setExtraReps(0);
  };

  const completeExercise = () => {
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      // Completed a full round
      setRounds((r) => r + 1);
      setCurrentExerciseIndex(0);
      setExtraReps(0);
    } else {
      setCurrentExerciseIndex(nextIndex);
      setExtraReps((r) => r + 1);
    }
  };

  const progress = ((timeCapSeconds - timeRemaining) / timeCapSeconds) * 100;
  const isLowTime = timeRemaining <= 60;

  return (
    <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 text-black font-bold">
              <Repeat className="h-3 w-3 mr-1" />
              AMRAP
            </Badge>
            <span className="text-sm text-zinc-400">{Math.floor(timeCapSeconds / 60)} min</span>
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div
            className={cn(
              "text-7xl font-mono font-bold transition-colors",
              isLowTime ? "text-red-500 animate-pulse" : "text-green-500"
            )}
          >
            {formatTime(timeRemaining)}
          </div>
          <Progress value={progress} className="h-2 mt-4 bg-zinc-800" />
        </div>

        {/* Score Display */}
        <div className="flex justify-center items-baseline gap-2">
          <span className="text-5xl font-bold text-white">{rounds}</span>
          <span className="text-3xl font-bold text-zinc-400">+</span>
          <span className="text-3xl font-bold text-zinc-400">{extraReps}</span>
        </div>

        {/* Exercise List */}
        <div className="space-y-2">
          <AnimatePresence>
            {exercises.map((exercise, index) => (
              <ExerciseListItem
                key={exercise.id || index}
                exercise={exercise}
                index={index}
                isActive={index === currentExerciseIndex}
                isCompleted={index < currentExerciseIndex}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Complete Exercise Button */}
        <Button
          className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-6"
          onClick={completeExercise}
          disabled={!isRunning}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Complete {exercises[currentExerciseIndex]?.name}
        </Button>

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          onPlayPause={() => setIsRunning(!isRunning)}
          onReset={reset}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          accentColor="bg-green-500 hover:bg-green-600"
          disabled={timeRemaining === 0}
        />
      </CardContent>
    </Card>
  );
}

// ==================== FOR TIME LAYOUT ====================

interface ForTimeLayoutProps {
  exercises: LayoutExercise[];
  timeCapSeconds?: number;
  onComplete?: (result: WorkoutResult) => void;
}

export function ForTimeLayout({ exercises, timeCapSeconds, onComplete }: ForTimeLayoutProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        setElapsed((prev) => {
          const newTime = prev + 1;
          if (timeCapSeconds && newTime >= timeCapSeconds) {
            setIsRunning(false);
            return timeCapSeconds;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isFinished, timeCapSeconds]);

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setCompletedExercises(new Set());
    setIsFinished(false);
  };

  const toggleExercise = (index: number) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const finish = () => {
    setIsRunning(false);
    setIsFinished(true);
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    onComplete?.({
      totalTime: elapsed,
      roundsCompleted: 1,
      repsCompleted: completedExercises.size,
      score: formatTimeWithHours(elapsed),
    });
  };

  const progressPercent = (completedExercises.size / exercises.length) * 100;
  const isOverCap = timeCapSeconds && elapsed >= timeCapSeconds;

  return (
    <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500 text-black font-bold">
              <Flame className="h-3 w-3 mr-1" />
              FOR TIME
            </Badge>
            {timeCapSeconds && (
              <span className="text-sm text-zinc-400">Cap: {formatTime(timeCapSeconds)}</span>
            )}
          </div>
          <div className="text-sm text-zinc-400">
            {completedExercises.size}/{exercises.length}
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div
            className={cn(
              "text-7xl font-mono font-bold transition-colors",
              isFinished ? "text-green-500" : isOverCap ? "text-red-500" : "text-orange-500"
            )}
          >
            {formatTimeWithHours(elapsed)}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 bg-zinc-800" />
        </div>

        {/* Exercise Checklist */}
        <div className="space-y-2">
          <AnimatePresence>
            {exercises.map((exercise, index) => (
              <ExerciseListItem
                key={exercise.id || index}
                exercise={exercise}
                index={index}
                isActive={!completedExercises.has(index) && index === Math.min(...[...Array(exercises.length).keys()].filter(i => !completedExercises.has(i)))}
                isCompleted={completedExercises.has(index)}
                showCheckbox
                onToggleComplete={toggleExercise}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Finish Button */}
        {!isFinished && (
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-6"
            onClick={finish}
            disabled={elapsed === 0}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finish Workout
          </Button>
        )}

        {/* Finished State */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 rounded-lg p-4 text-center"
          >
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-400 font-semibold">Workout Complete!</p>
            <p className="text-3xl font-bold text-white mt-2">{formatTimeWithHours(elapsed)}</p>
          </motion.div>
        )}

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          onPlayPause={() => setIsRunning(!isRunning)}
          onReset={reset}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          accentColor="bg-orange-500 hover:bg-orange-600"
          disabled={isFinished}
        />
      </CardContent>
    </Card>
  );
}

// ==================== LADDER LAYOUT ====================

interface LadderLayoutProps {
  exercises: LayoutExercise[];
  ladderType?: "ascending" | "descending" | "pyramid";
  startReps?: number;
  endReps?: number;
  timeCapSeconds?: number;
  onComplete?: (result: WorkoutResult) => void;
}

export function LadderLayout({
  exercises,
  ladderType = "ascending",
  startReps = 1,
  endReps = 10,
  timeCapSeconds,
  onComplete,
}: LadderLayoutProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentRung, setCurrentRung] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  // Generate ladder rungs
  const generateRungs = useCallback(() => {
    const rungs: number[] = [];
    if (ladderType === "ascending") {
      for (let i = startReps; i <= endReps; i++) {
        rungs.push(i);
      }
    } else if (ladderType === "descending") {
      for (let i = endReps; i >= startReps; i--) {
        rungs.push(i);
      }
    } else {
      // Pyramid: up then down
      for (let i = startReps; i <= endReps; i++) {
        rungs.push(i);
      }
      for (let i = endReps - 1; i >= startReps; i--) {
        rungs.push(i);
      }
    }
    return rungs;
  }, [ladderType, startReps, endReps]);

  const rungs = generateRungs();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        setElapsed((prev) => {
          const newTime = prev + 1;
          if (timeCapSeconds && newTime >= timeCapSeconds) {
            setIsRunning(false);
            return timeCapSeconds;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isFinished, timeCapSeconds]);

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setCurrentRung(0);
    setIsFinished(false);
  };

  const completeRung = () => {
    if (currentRung < rungs.length - 1) {
      setCurrentRung((r) => r + 1);
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    } else {
      // Finished all rungs
      setIsRunning(false);
      setIsFinished(true);
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      onComplete?.({
        totalTime: elapsed,
        roundsCompleted: rungs.length,
        repsCompleted: rungs.reduce((a, b) => a + b, 0) * exercises.length,
        score: formatTimeWithHours(elapsed),
      });
    }
  };

  const progress = ((currentRung + 1) / rungs.length) * 100;
  const currentReps = rungs[currentRung];

  const getLadderIcon = () => {
    if (ladderType === "ascending") return <TrendingUp className="h-3 w-3 mr-1" />;
    if (ladderType === "descending") return <TrendingDown className="h-3 w-3 mr-1" />;
    return <ArrowUpDown className="h-3 w-3 mr-1" />;
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500 text-white font-bold">
              {getLadderIcon()}
              LADDER
            </Badge>
            <span className="text-sm text-zinc-400 capitalize">{ladderType}</span>
          </div>
          <div className="text-sm text-zinc-400">
            Rung {currentRung + 1}/{rungs.length}
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div className={cn("text-5xl font-mono font-bold text-purple-500")}>
            {formatTimeWithHours(elapsed)}
          </div>
        </div>

        {/* Current Reps - Large Display */}
        <div className="text-center py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRung}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-8xl font-bold text-purple-400"
            >
              {currentReps}
            </motion.div>
          </AnimatePresence>
          <p className="text-zinc-400 text-lg mt-2">reps each exercise</p>
        </div>

        {/* Exercises for this rung */}
        <div className="space-y-2 bg-zinc-800/50 rounded-lg p-4">
          {exercises.map((exercise, index) => (
            <div key={exercise.id || index} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{exercise.name}</span>
              <span className="text-purple-400 font-mono">{currentReps} reps</span>
            </div>
          ))}
        </div>

        {/* Ladder Visualization */}
        <div className="flex items-end justify-center gap-1 h-24">
          {rungs.map((reps, index) => (
            <motion.div
              key={index}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "w-4 rounded-t transition-colors origin-bottom",
                index < currentRung && "bg-purple-500",
                index === currentRung && "bg-purple-400 animate-pulse",
                index > currentRung && "bg-zinc-700"
              )}
              style={{ height: `${(reps / Math.max(...rungs)) * 100}%` }}
            />
          ))}
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2 bg-zinc-800" />

        {/* Complete Rung Button */}
        {!isFinished && (
          <Button
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-6"
            onClick={completeRung}
            disabled={!isRunning}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete Rung ({currentReps} reps)
          </Button>
        )}

        {/* Finished State */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-purple-500/20 rounded-lg p-4 text-center"
          >
            <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-purple-400 font-semibold">Ladder Complete!</p>
            <p className="text-3xl font-bold text-white mt-2">{formatTimeWithHours(elapsed)}</p>
          </motion.div>
        )}

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          onPlayPause={() => setIsRunning(!isRunning)}
          onReset={reset}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          accentColor="bg-purple-500 hover:bg-purple-600"
          disabled={isFinished}
        />
      </CardContent>
    </Card>
  );
}

// ==================== INTERVAL LAYOUT ====================

interface IntervalExercise extends LayoutExercise {
  workSeconds?: number;
  restSeconds?: number;
}

interface IntervalLayoutProps {
  exercises: IntervalExercise[];
  defaultWorkSeconds?: number;
  defaultRestSeconds?: number;
  rounds?: number;
  onComplete?: (result: WorkoutResult) => void;
}

export function IntervalLayout({
  exercises,
  defaultWorkSeconds = 40,
  defaultRestSeconds = 20,
  rounds = 1,
  onComplete,
}: IntervalLayoutProps) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [timeInPhase, setTimeInPhase] = useState(
    exercises[0]?.workSeconds || defaultWorkSeconds
  );
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  const currentExercise = exercises[currentExerciseIndex];
  const workSeconds = currentExercise?.workSeconds || defaultWorkSeconds;
  const restSeconds = currentExercise?.restSeconds || defaultRestSeconds;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        setTimeInPhase((prev) => {
          if (prev <= 1) {
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }

            if (isWorkPhase) {
              // Switch to rest
              setIsWorkPhase(false);
              return restSeconds;
            } else {
              // End of rest - next exercise or round
              const nextExerciseIndex = currentExerciseIndex + 1;

              if (nextExerciseIndex >= exercises.length) {
                // End of round
                if (currentRound >= rounds) {
                  // Workout complete
                  setIsRunning(false);
                  setIsFinished(true);
                  onComplete?.({
                    totalTime: totalElapsed + 1,
                    roundsCompleted: rounds,
                    repsCompleted: exercises.length * rounds,
                    score: `${rounds} rounds`,
                  });
                  return 0;
                }
                // Next round
                setCurrentRound((r) => r + 1);
                setCurrentExerciseIndex(0);
                setIsWorkPhase(true);
                return exercises[0]?.workSeconds || defaultWorkSeconds;
              } else {
                // Next exercise
                setCurrentExerciseIndex(nextExerciseIndex);
                setIsWorkPhase(true);
                return exercises[nextExerciseIndex]?.workSeconds || defaultWorkSeconds;
              }
            }
          }
          return prev - 1;
        });
        setTotalElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [
    isRunning,
    isFinished,
    isWorkPhase,
    currentExerciseIndex,
    currentRound,
    exercises,
    rounds,
    workSeconds,
    restSeconds,
    defaultWorkSeconds,
    defaultRestSeconds,
    soundEnabled,
    totalElapsed,
    onComplete,
  ]);

  const reset = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setCurrentExerciseIndex(0);
    setIsWorkPhase(true);
    setTimeInPhase(exercises[0]?.workSeconds || defaultWorkSeconds);
    setTotalElapsed(0);
    setIsFinished(false);
  };

  const handleStart = () => {
    if (!isRunning && totalElapsed === 0) {
      setShowCountdown(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const onCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setIsRunning(true);
  }, []);

  const skipPhase = () => {
    setTimeInPhase(1);
  };

  const progress = isWorkPhase
    ? ((workSeconds - timeInPhase) / workSeconds) * 100
    : ((restSeconds - timeInPhase) / restSeconds) * 100;

  // Get upcoming exercises
  const getUpcomingExercises = () => {
    const upcoming: Array<{ exercise: LayoutExercise; round: number }> = [];
    let tempIndex = currentExerciseIndex;
    let tempRound = currentRound;

    for (let i = 0; i < 3; i++) {
      tempIndex++;
      if (tempIndex >= exercises.length) {
        tempIndex = 0;
        tempRound++;
      }
      if (tempRound <= rounds) {
        upcoming.push({ exercise: exercises[tempIndex], round: tempRound });
      }
    }
    return upcoming;
  };

  const upcomingExercises = getUpcomingExercises();

  return (
    <Card
      className={cn(
        "border-zinc-800 relative overflow-hidden transition-colors duration-300",
        isWorkPhase
          ? "bg-gradient-to-br from-red-900/30 to-zinc-900"
          : "bg-gradient-to-br from-blue-900/30 to-zinc-900"
      )}
    >
      <AnimatePresence>
        {showCountdown && <CountdownOverlay onComplete={onCountdownComplete} />}
      </AnimatePresence>
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "font-bold",
                isWorkPhase ? "bg-red-500 text-white" : "bg-blue-500 text-white"
              )}
            >
              <Zap className="h-3 w-3 mr-1" />
              INTERVALS
            </Badge>
            <span className="text-sm text-zinc-400">
              {workSeconds}s/{restSeconds}s
            </span>
          </div>
          <div className="text-sm text-zinc-400">
            Round {currentRound}/{rounds}
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={isWorkPhase ? "work" : "rest"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "text-3xl font-bold uppercase tracking-wider",
                isWorkPhase ? "text-red-500" : "text-blue-500"
              )}
            >
              {isWorkPhase ? "WORK" : "REST"}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div
            className={cn(
              "text-8xl font-mono font-bold transition-colors",
              timeInPhase <= 5 && "animate-pulse",
              isWorkPhase ? "text-red-500" : "text-blue-500"
            )}
          >
            {timeInPhase}
          </div>
          <Progress value={progress} className="h-3 mt-4 bg-zinc-800" />
        </div>

        {/* Current Exercise */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentExerciseIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className={cn(
                "text-2xl font-bold py-4 px-6 rounded-lg",
                isWorkPhase ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
              )}
            >
              {currentExercise?.name}
              {currentExercise?.reps && (
                <span className="block text-lg font-normal mt-1">
                  {currentExercise.reps} reps
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Upcoming */}
        {upcomingExercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Coming Up</p>
            <div className="space-y-1">
              {upcomingExercises.map((item, i) => (
                <motion.div
                  key={`${item.round}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 - i * 0.3, x: 0 }}
                  className="flex items-center justify-between text-sm text-zinc-400 p-2 rounded bg-zinc-800/50"
                >
                  <span>{item.exercise.name}</span>
                  {item.round > currentRound && (
                    <Badge variant="outline" className="text-xs">
                      R{item.round}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {currentExerciseIndex + 1}/{exercises.length}
            </p>
            <p className="text-zinc-500">Exercise</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{formatTimeWithHours(totalElapsed)}</p>
            <p className="text-zinc-500">Total Time</p>
          </div>
        </div>

        {/* Finished State */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 rounded-lg p-4 text-center"
          >
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-400 font-semibold">Intervals Complete!</p>
            <p className="text-3xl font-bold text-white mt-2">
              {formatTimeWithHours(totalElapsed)}
            </p>
          </motion.div>
        )}

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          onPlayPause={handleStart}
          onReset={reset}
          onSkip={skipPhase}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          accentColor={isWorkPhase ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
          disabled={isFinished}
        />
      </CardContent>
    </Card>
  );
}

// ==================== CHIPPER LAYOUT ====================

interface ChipperLayoutProps {
  exercises: LayoutExercise[];
  timeCapSeconds?: number;
  onComplete?: (result: WorkoutResult) => void;
}

export function ChipperLayout({ exercises, timeCapSeconds, onComplete }: ChipperLayoutProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        setElapsed((prev) => {
          const newTime = prev + 1;
          if (timeCapSeconds && newTime >= timeCapSeconds) {
            setIsRunning(false);
            return timeCapSeconds;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isFinished, timeCapSeconds]);

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setCurrentExerciseIndex(0);
    setIsFinished(false);
  };

  const completeExercise = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((i) => i + 1);
    } else {
      // Finished all exercises
      setIsRunning(false);
      setIsFinished(true);
      onComplete?.({
        totalTime: elapsed,
        roundsCompleted: 1,
        repsCompleted: exercises.reduce((acc, ex) => {
          const reps = typeof ex.reps === "number" ? ex.reps : parseInt(String(ex.reps)) || 0;
          return acc + reps;
        }, 0),
        score: formatTimeWithHours(elapsed),
      });
    }
  };

  const progress = ((currentExerciseIndex + 1) / exercises.length) * 100;
  const currentExercise = exercises[currentExerciseIndex];
  const isOverCap = timeCapSeconds && elapsed >= timeCapSeconds;

  // Calculate total reps for summary
  const totalReps = exercises.reduce((acc, ex) => {
    const reps = typeof ex.reps === "number" ? ex.reps : parseInt(String(ex.reps)) || 0;
    return acc + reps;
  }, 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500 text-black font-bold">
              <ListOrdered className="h-3 w-3 mr-1" />
              CHIPPER
            </Badge>
            {timeCapSeconds && (
              <span className="text-sm text-zinc-400">Cap: {formatTime(timeCapSeconds)}</span>
            )}
          </div>
          <div className="text-sm text-zinc-400">{totalReps} total reps</div>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div
            className={cn(
              "text-6xl font-mono font-bold transition-colors",
              isFinished ? "text-green-500" : isOverCap ? "text-red-500" : "text-cyan-500"
            )}
          >
            {formatTimeWithHours(elapsed)}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-400">
            <span>
              Exercise {currentExerciseIndex + 1} of {exercises.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Current Exercise - Prominent Display */}
        {!isFinished && (
          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-cyan-500/20 border border-cyan-500/50 rounded-xl p-6 text-center"
          >
            <p className="text-lg text-cyan-400 mb-2">NOW</p>
            <p className="text-4xl font-bold text-white mb-2">{currentExercise?.name}</p>
            {currentExercise?.reps && (
              <p className="text-5xl font-mono font-bold text-cyan-400">
                {currentExercise.reps}
                <span className="text-lg ml-2">reps</span>
              </p>
            )}
            {currentExercise?.notes && (
              <p className="text-sm text-zinc-400 mt-2">{currentExercise.notes}</p>
            )}
          </motion.div>
        )}

        {/* Exercise List */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {exercises.map((exercise, index) => (
            <motion.div
              key={exercise.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: index === currentExerciseIndex ? 1 : index < currentExerciseIndex ? 0.5 : 0.7,
                x: 0,
              }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-all text-sm",
                index === currentExerciseIndex && "bg-cyan-500/20 border border-cyan-500/30",
                index < currentExerciseIndex && "bg-zinc-800/30 line-through text-zinc-500",
                index > currentExerciseIndex && "bg-zinc-800/50 text-zinc-400"
              )}
            >
              <div className="flex items-center gap-3">
                {index < currentExerciseIndex ? (
                  <CheckCircle className="h-4 w-4 text-cyan-500" />
                ) : index === currentExerciseIndex ? (
                  <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-zinc-600" />
                )}
                <span>{exercise.name}</span>
              </div>
              <span className="font-mono">{exercise.reps}</span>
            </motion.div>
          ))}
        </div>

        {/* Complete Exercise Button */}
        {!isFinished && (
          <Button
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-6"
            onClick={completeExercise}
            disabled={!isRunning}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete {currentExercise?.name}
          </Button>
        )}

        {/* Finished State */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 rounded-lg p-6 text-center"
          >
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-green-400 font-semibold text-xl">Chipper Complete!</p>
            <p className="text-4xl font-bold text-white mt-3">{formatTimeWithHours(elapsed)}</p>
            <p className="text-zinc-400 mt-2">
              {exercises.length} exercises | {totalReps} reps
            </p>
          </motion.div>
        )}

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          onPlayPause={() => setIsRunning(!isRunning)}
          onReset={reset}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          accentColor="bg-cyan-500 hover:bg-cyan-600"
          disabled={isFinished}
        />
      </CardContent>
    </Card>
  );
}

// ==================== WORKOUT LAYOUT SELECTOR ====================

interface WorkoutLayoutProps {
  structureType: WorkoutStructure;
  exercises: LayoutExercise[];
  timeCapSeconds?: number;
  roundsTarget?: number;
  emomIntervalSeconds?: number;
  ladderType?: "ascending" | "descending" | "pyramid";
  ladderStartReps?: number;
  ladderEndReps?: number;
  intervalWorkSeconds?: number;
  intervalRestSeconds?: number;
  onComplete?: (result: WorkoutResult) => void;
  onRoundComplete?: (round: number) => void;
}

export function WorkoutLayout({
  structureType,
  exercises,
  timeCapSeconds,
  roundsTarget,
  emomIntervalSeconds = 60,
  ladderType = "ascending",
  ladderStartReps = 1,
  ladderEndReps = 10,
  intervalWorkSeconds = 40,
  intervalRestSeconds = 20,
  onComplete,
  onRoundComplete,
}: WorkoutLayoutProps) {
  switch (structureType) {
    case "emom":
      return (
        <EMOMLayout
          exercises={exercises}
          intervalSeconds={emomIntervalSeconds}
          totalMinutes={roundsTarget || 20}
          onComplete={onComplete}
          onRoundComplete={onRoundComplete}
        />
      );
    case "amrap":
      return (
        <AMRAPLayout
          exercises={exercises}
          timeCapSeconds={timeCapSeconds || 1200}
          onComplete={onComplete}
        />
      );
    case "for_time":
      return (
        <ForTimeLayout
          exercises={exercises}
          timeCapSeconds={timeCapSeconds}
          onComplete={onComplete}
        />
      );
    case "ladder":
      return (
        <LadderLayout
          exercises={exercises}
          ladderType={ladderType}
          startReps={ladderStartReps}
          endReps={ladderEndReps}
          timeCapSeconds={timeCapSeconds}
          onComplete={onComplete}
        />
      );
    case "intervals":
    case "tabata":
      return (
        <IntervalLayout
          exercises={exercises}
          defaultWorkSeconds={structureType === "tabata" ? 20 : intervalWorkSeconds}
          defaultRestSeconds={structureType === "tabata" ? 10 : intervalRestSeconds}
          rounds={roundsTarget || (structureType === "tabata" ? 8 : 1)}
          onComplete={onComplete}
        />
      );
    case "chipper":
      return (
        <ChipperLayout
          exercises={exercises}
          timeCapSeconds={timeCapSeconds}
          onComplete={onComplete}
        />
      );
    default:
      // Standard workout uses For Time layout
      return (
        <ForTimeLayout
          exercises={exercises}
          timeCapSeconds={timeCapSeconds}
          onComplete={onComplete}
        />
      );
  }
}

export default WorkoutLayout;
