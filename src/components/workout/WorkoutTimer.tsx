"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  Target,
  Flame,
  CheckCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WorkoutStructure = "standard" | "emom" | "amrap" | "for_time" | "tabata" | "chipper" | "ladder" | "intervals";

interface WorkoutTimerProps {
  structureType: WorkoutStructure;
  timeCapSeconds?: number;
  roundsTarget?: number;
  emomIntervalSeconds?: number;
  exercises?: Array<{ name: string; reps?: string; duration?: number }>;
  onComplete?: (result: WorkoutResult) => void;
  onRoundComplete?: (round: number) => void;
}

interface WorkoutResult {
  totalTime: number;
  roundsCompleted: number;
  repsCompleted: number;
  score: string;
}

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

// Local storage helpers
const STORAGE_KEY = "workout_timer_state";

function saveTimerState(key: string, state: Record<string, unknown>) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data[key] = { ...state, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function loadTimerState<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    const state = parsed[key];
    // Only restore state if less than 1 hour old
    if (state && Date.now() - state.timestamp < 3600000) {
      return state as T;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function clearTimerState(key: string) {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      delete parsed[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore storage errors
  }
}

// Countdown component for 3-2-1 animation
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
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 rounded-lg">
      <div className="text-8xl font-bold text-white animate-pulse">
        {count}
      </div>
    </div>
  );
}

// ==================== EMOM TIMER ====================
function EMOMTimer({ 
  intervalSeconds = 60, 
  totalMinutes = 20,
  onRoundComplete,
  onComplete 
}: { 
  intervalSeconds: number;
  totalMinutes?: number;
  onRoundComplete?: (round: number) => void;
  onComplete?: (result: WorkoutResult) => void;
}) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeInRound, setTimeInRound] = useState(intervalSeconds);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load persisted state
  useEffect(() => {
    const saved = loadTimerState<{
      currentRound: number;
      timeInRound: number;
      totalElapsed: number;
    }>("emom");
    if (saved) {
      setCurrentRound(saved.currentRound);
      setTimeInRound(saved.timeInRound);
      setTotalElapsed(saved.totalElapsed);
    }
  }, []);

  // Save state when running
  useEffect(() => {
    if (isRunning) {
      saveTimerState("emom", { currentRound, timeInRound, totalElapsed });
    }
  }, [isRunning, currentRound, timeInRound, totalElapsed]);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeInRound((prev) => {
          if (prev <= 1) {
            // Round complete
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            onRoundComplete?.(currentRound);
            setCurrentRound((r) => r + 1);
            return intervalSeconds;
          }
          return prev - 1;
        });
        setTotalElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, intervalSeconds, currentRound, soundEnabled, onRoundComplete]);

  const reset = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setTimeInRound(intervalSeconds);
    setTotalElapsed(0);
    clearTimerState("emom");
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

  const progress = ((intervalSeconds - timeInRound) / intervalSeconds) * 100;

  return (
    <Card className="bg-gradient-to-br from-brand/10 to-energy/10 border-brand/20 relative overflow-hidden">
      {showCountdown && <CountdownOverlay onComplete={onCountdownComplete} />}
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-brand text-white">EMOM</Badge>
            <span className="text-sm text-muted-foreground">Every {intervalSeconds}s</span>
          </div>

          {/* Current Round */}
          <div className={cn(
            "text-6xl font-mono font-bold transition-colors",
            timeInRound <= 3 ? "text-red-500 animate-pulse" : "text-brand"
          )}>
            {formatTime(timeInRound)}
          </div>

          {/* Round Progress */}
          <Progress value={progress} className="h-2" />

          {/* Stats Row */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold">{currentRound}</p>
              <p className="text-muted-foreground">Round</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatTimeWithHours(totalElapsed)}</p>
              <p className="text-muted-foreground">Total Time</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={reset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className={cn(
                "w-24",
                isRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-brand hover:bg-brand/90"
              )}
              onClick={handleStart}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setTimeInRound(1); // Trigger round change
              }}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== AMRAP TIMER ====================
function AMRAPTimer({ 
  timeCapSeconds = 1200,
  onComplete 
}: { 
  timeCapSeconds: number;
  onComplete?: (result: WorkoutResult) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeCapSeconds);
  const [rounds, setRounds] = useState(0);
  const [reps, setReps] = useState(0);
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
              repsCompleted: reps,
              score: `${rounds}+${reps}`,
            });
            return 0;
          }
          // Warning beeps at 3, 2, 1
          if (prev <= 4 && soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, rounds, reps, timeCapSeconds, soundEnabled, onComplete]);

  const reset = () => {
    setIsRunning(false);
    setTimeRemaining(timeCapSeconds);
    setRounds(0);
    setReps(0);
  };

  const addRound = () => setRounds((r) => r + 1);
  const addRep = () => setReps((r) => r + 1);
  const subtractRep = () => setReps((r) => Math.max(0, r - 1));

  const progress = ((timeCapSeconds - timeRemaining) / timeCapSeconds) * 100;
  const isLowTime = timeRemaining <= 60;

  return (
    <Card className="bg-gradient-to-br from-energy/10 to-success/10 border-energy/20">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-energy text-white">AMRAP</Badge>
            <span className="text-sm text-muted-foreground">{Math.floor(timeCapSeconds / 60)} min</span>
          </div>

          {/* Time Remaining */}
          <div className={cn(
            "text-6xl font-mono font-bold transition-colors",
            isLowTime ? "text-destructive animate-pulse" : "text-energy"
          )}>
            {formatTime(timeRemaining)}
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2" />

          {/* Score Display */}
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold">{rounds}</p>
              <p className="text-muted-foreground">Rounds</p>
            </div>
            <div className="text-center text-2xl font-bold text-muted-foreground">+</div>
            <div className="text-center">
              <p className="text-4xl font-bold">{reps}</p>
              <p className="text-muted-foreground">Reps</p>
            </div>
          </div>

          {/* Round/Rep Buttons */}
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={subtractRep}>-1 Rep</Button>
            <Button variant="outline" size="sm" onClick={addRep}>+1 Rep</Button>
            <Button className="bg-success hover:bg-success/90" size="sm" onClick={addRound}>
              <CheckCircle className="h-4 w-4 mr-1" /> Round
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={reset} aria-label="Reset timer">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className={cn(
                "w-24",
                isRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-energy hover:bg-energy/90"
              )}
              onClick={() => setIsRunning(!isRunning)}
              disabled={timeRemaining === 0}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== FOR TIME TIMER ====================
function ForTimeTimer({ 
  timeCapSeconds,
  onComplete 
}: { 
  timeCapSeconds?: number;
  onComplete?: (result: WorkoutResult) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isFinished) {
      interval = setInterval(() => {
        setElapsed((prev) => {
          const newTime = prev + 1;
          // Auto-stop at time cap
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
    setIsFinished(false);
  };

  const finish = () => {
    setIsRunning(false);
    setIsFinished(true);
    onComplete?.({
      totalTime: elapsed,
      roundsCompleted: 0,
      repsCompleted: 0,
      score: formatTimeWithHours(elapsed),
    });
  };

  const isOverCap = timeCapSeconds && elapsed >= timeCapSeconds;

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-orange-500 text-white">FOR TIME</Badge>
            {timeCapSeconds && (
              <span className="text-sm text-muted-foreground">Cap: {formatTime(timeCapSeconds)}</span>
            )}
          </div>

          {/* Elapsed Time */}
          <div className={cn(
            "text-6xl font-mono font-bold transition-colors",
            isFinished ? "text-success" : isOverCap ? "text-destructive" : "text-orange-500"
          )}>
            {formatTimeWithHours(elapsed)}
          </div>

          {/* Time Cap Progress */}
          {timeCapSeconds && (
            <Progress value={(elapsed / timeCapSeconds) * 100} className="h-2" />
          )}

          {/* Finished State */}
          {isFinished && (
            <div className="bg-success/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Workout Complete!</span>
              </div>
              <p className="text-2xl font-bold mt-2">{formatTimeWithHours(elapsed)}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={reset} aria-label="Reset timer">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className={cn(
                "w-24",
                isRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-orange-500 hover:bg-orange-600"
              )}
              onClick={() => setIsRunning(!isRunning)}
              disabled={isFinished}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              className="bg-success hover:bg-success/90"
              onClick={finish}
              disabled={isFinished || elapsed === 0}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Done
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== TABATA TIMER ====================
function TabataTimer({ 
  workSeconds: initialWorkSeconds = 20,
  restSeconds: initialRestSeconds = 10,
  totalRounds: initialTotalRounds = 8,
  onComplete 
}: { 
  workSeconds?: number;
  restSeconds?: number;
  totalRounds?: number;
  onComplete?: (result: WorkoutResult) => void;
}) {
  // Customizable settings
  const [workSeconds, setWorkSeconds] = useState(initialWorkSeconds);
  const [restSeconds, setRestSeconds] = useState(initialRestSeconds);
  const [totalRounds, setTotalRounds] = useState(initialTotalRounds);
  const [showSettings, setShowSettings] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [isWork, setIsWork] = useState(true);
  const [timeInPhase, setTimeInPhase] = useState(workSeconds);
  const [totalReps, setTotalReps] = useState(0);
  const [roundReps, setRoundReps] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load persisted state
  useEffect(() => {
    const saved = loadTimerState<{
      currentRound: number;
      timeInPhase: number;
      isWork: boolean;
      totalReps: number;
      workSeconds: number;
      restSeconds: number;
      totalRounds: number;
    }>("tabata");
    if (saved) {
      setCurrentRound(saved.currentRound);
      setTimeInPhase(saved.timeInPhase);
      setIsWork(saved.isWork);
      setTotalReps(saved.totalReps);
      if (saved.workSeconds) setWorkSeconds(saved.workSeconds);
      if (saved.restSeconds) setRestSeconds(saved.restSeconds);
      if (saved.totalRounds) setTotalRounds(saved.totalRounds);
    }
  }, []);

  // Save state when running
  useEffect(() => {
    if (isRunning) {
      saveTimerState("tabata", { currentRound, timeInPhase, isWork, totalReps, workSeconds, restSeconds, totalRounds });
    }
  }, [isRunning, currentRound, timeInPhase, isWork, totalReps, workSeconds, restSeconds, totalRounds]);

  useEffect(() => {
    audioRef.current = new Audio("/beep.mp3");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeInPhase((prev) => {
          if (prev <= 1) {
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            
            if (isWork) {
              // Switch to rest
              setIsWork(false);
              return restSeconds;
            } else {
              // End of rest - next round or finish
              if (currentRound >= totalRounds) {
                setIsRunning(false);
                onComplete?.({
                  totalTime: totalRounds * (workSeconds + restSeconds),
                  roundsCompleted: totalRounds,
                  repsCompleted: totalReps,
                  score: `${totalReps} reps`,
                });
                return 0;
              }
              setCurrentRound((r) => r + 1);
              setIsWork(true);
              return workSeconds;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isWork, currentRound, totalRounds, workSeconds, restSeconds, soundEnabled, totalReps, onComplete]);

  const reset = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setIsWork(true);
    setTimeInPhase(workSeconds);
    setTotalReps(0);
    setRoundReps([]);
    clearTimerState("tabata");
  };

  const handleStart = () => {
    if (!isRunning && currentRound === 1 && timeInPhase === workSeconds) {
      setShowCountdown(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const onCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setIsRunning(true);
  }, []);

  const addReps = (count: number) => {
    setTotalReps((r) => r + count);
  };

  const progress = isWork 
    ? ((workSeconds - timeInPhase) / workSeconds) * 100
    : ((restSeconds - timeInPhase) / restSeconds) * 100;

  // Settings presets
  const presets = [
    { name: "Classic Tabata", work: 20, rest: 10, rounds: 8 },
    { name: "30/15", work: 30, rest: 15, rounds: 8 },
    { name: "45/15", work: 45, rest: 15, rounds: 6 },
    { name: "60/30", work: 60, rest: 30, rounds: 6 },
  ];

  return (
    <Card className={cn(
      "transition-colors duration-300 relative overflow-hidden",
      isWork 
        ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30" 
        : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30"
    )}>
      {showCountdown && <CountdownOverlay onComplete={onCountdownComplete} />}
      <CardContent className="pt-6">
        {/* Settings Panel */}
        {showSettings && !isRunning && (
          <div className="absolute inset-0 bg-background/95 z-10 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Customize Tabata</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Work (s)</label>
                  <input
                    type="number"
                    value={workSeconds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setWorkSeconds(v);
                      setTimeInPhase(v);
                    }}
                    className="w-full border rounded px-2 py-1 text-center"
                    min={5}
                    max={120}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rest (s)</label>
                  <input
                    type="number"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(parseInt(e.target.value))}
                    className="w-full border rounded px-2 py-1 text-center"
                    min={5}
                    max={120}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rounds</label>
                  <input
                    type="number"
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                    className="w-full border rounded px-2 py-1 text-center"
                    min={1}
                    max={20}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Presets</p>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkSeconds(preset.work);
                        setRestSeconds(preset.rest);
                        setTotalRounds(preset.rounds);
                        setTimeInPhase(preset.work);
                        setShowSettings(false);
                      }}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <Button onClick={() => setShowSettings(false)} className="mt-4">
              Apply Settings
            </Button>
          </div>
        )}

        <div className="text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <Badge className={isWork ? "bg-red-500 text-white" : "bg-blue-500 text-white"}>
              TABATA
            </Badge>
            <button 
              onClick={() => !isRunning && setShowSettings(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {workSeconds}s work / {restSeconds}s rest
            </button>
          </div>

          {/* Phase Indicator */}
          <div className={cn(
            "text-2xl font-bold uppercase tracking-wider",
            isWork ? "text-red-500" : "text-blue-500"
          )}>
            {isWork ? "WORK!" : "REST"}
          </div>

          {/* Time Display */}
          <div className={cn(
            "text-7xl font-mono font-bold transition-colors",
            timeInPhase <= 3 ? "animate-pulse" : "",
            isWork ? "text-red-500" : "text-blue-500"
          )}>
            {timeInPhase}
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-3" />

          {/* Stats */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold">{currentRound}/{totalRounds}</p>
              <p className="text-muted-foreground">Round</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{totalReps}</p>
              <p className="text-muted-foreground">Reps</p>
            </div>
          </div>

          {/* Quick Rep Buttons (during work) */}
          {isWork && isRunning && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => addReps(1)}>+1</Button>
              <Button variant="outline" size="sm" onClick={() => addReps(5)}>+5</Button>
              <Button variant="outline" size="sm" onClick={() => addReps(10)}>+10</Button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={reset} aria-label="Reset timer">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className={cn(
                "w-24",
                isRunning 
                  ? "bg-orange-500 hover:bg-orange-600" 
                  : isWork ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
              )}
              onClick={handleStart}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN WORKOUT TIMER COMPONENT ====================
export function WorkoutTimer({
  structureType,
  timeCapSeconds,
  roundsTarget,
  emomIntervalSeconds = 60,
  exercises,
  onComplete,
  onRoundComplete,
}: WorkoutTimerProps) {
  switch (structureType) {
    case "emom":
      return (
        <EMOMTimer
          intervalSeconds={emomIntervalSeconds}
          onRoundComplete={onRoundComplete}
          onComplete={onComplete}
        />
      );
    case "amrap":
      return (
        <AMRAPTimer
          timeCapSeconds={timeCapSeconds || 1200}
          onComplete={onComplete}
        />
      );
    case "for_time":
      return (
        <ForTimeTimer
          timeCapSeconds={timeCapSeconds}
          onComplete={onComplete}
        />
      );
    case "tabata":
      return (
        <TabataTimer
          onComplete={onComplete}
        />
      );
    case "chipper":
    case "ladder":
    case "intervals":
      // These use For Time timer as base
      return (
        <ForTimeTimer
          timeCapSeconds={timeCapSeconds}
          onComplete={onComplete}
        />
      );
    default:
      // Standard workout - no special timer, just show elapsed time
      return (
        <ForTimeTimer
          onComplete={onComplete}
        />
      );
  }
}

export default WorkoutTimer;
