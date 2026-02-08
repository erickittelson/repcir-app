"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  X,
  Check,
  Plus,
  Edit3,
  ChevronRight,
  Loader2,
  Volume2,
  AlertCircle,
  Dumbbell,
  Timer,
  Activity,
  Heart,
  Trash2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  weight?: number;
  unit?: "lbs" | "kg";
  duration?: number;
  distance?: number;
  distanceUnit?: "miles" | "km" | "meters";
}

export interface ParsedWorkoutData {
  exercises: ParsedExercise[];
  duration?: number;
  feeling?: string;
  rpe?: number;
  notes?: string;
  confidence: number;
}

interface VoiceLoggerProps {
  onTranscript?: (text: string) => void;
  onParsedData?: (data: ParsedWorkoutData) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showTranscript?: boolean;
  placeholder?: string;
}

interface MicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onClick: () => void;
}

interface WaveformVisualizerProps {
  isActive: boolean;
  className?: string;
}

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  className?: string;
}

interface ListeningIndicatorProps {
  isListening: boolean;
}

interface ParsedExerciseCardProps {
  exercise: ParsedExercise;
  onEdit: (exercise: ParsedExercise) => void;
  onDelete: (id: string) => void;
}

interface VoiceWorkoutFormProps {
  onSubmit: (data: ParsedWorkoutData) => void;
  onCancel?: () => void;
  className?: string;
}

interface VoiceFeelingLoggerProps {
  onFeelingCaptured: (feeling: string, rpe?: number) => void;
  className?: string;
}

interface FallbackTextInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// PARSING UTILITIES
// ============================================================================

/**
 * Parses natural speech into structured workout data
 */
export function parseWorkoutSpeech(text: string): ParsedWorkoutData {
  const normalizedText = text.toLowerCase().trim();
  const exercises: ParsedExercise[] = [];
  let confidence = 0.5;
  let duration: number | undefined;
  let feeling: string | undefined;
  let rpe: number | undefined;
  let notes: string | undefined;

  // Common exercise name patterns and their normalized forms
  const exerciseAliases: Record<string, string> = {
    "bench press": "Bench Press",
    bench: "Bench Press",
    "flat bench": "Flat Bench Press",
    "incline bench": "Incline Bench Press",
    squat: "Squat",
    squats: "Squat",
    "back squat": "Back Squat",
    "front squat": "Front Squat",
    deadlift: "Deadlift",
    deadlifts: "Deadlift",
    "push-up": "Push-ups",
    "push up": "Push-ups",
    pushup: "Push-ups",
    pushups: "Push-ups",
    "pull-up": "Pull-ups",
    "pull up": "Pull-ups",
    pullup: "Pull-ups",
    pullups: "Pull-ups",
    "chin-up": "Chin-ups",
    "chin up": "Chin-ups",
    chinup: "Chin-ups",
    chinups: "Chin-ups",
    curl: "Bicep Curls",
    curls: "Bicep Curls",
    "bicep curl": "Bicep Curls",
    "bicep curls": "Bicep Curls",
    row: "Rows",
    rows: "Rows",
    "bent over row": "Bent Over Rows",
    "barbell row": "Barbell Rows",
    "dumbbell row": "Dumbbell Rows",
    run: "Running",
    ran: "Running",
    running: "Running",
    jog: "Running",
    jogging: "Running",
    burpee: "Burpees",
    burpees: "Burpees",
    lunge: "Lunges",
    lunges: "Lunges",
    plank: "Plank",
    "shoulder press": "Shoulder Press",
    "overhead press": "Overhead Press",
    ohp: "Overhead Press",
    "lat pulldown": "Lat Pulldown",
    "cable fly": "Cable Flyes",
    "leg press": "Leg Press",
    "leg curl": "Leg Curls",
    "leg extension": "Leg Extensions",
    "calf raise": "Calf Raises",
    "calf raises": "Calf Raises",
    dip: "Dips",
    dips: "Dips",
    "tricep extension": "Tricep Extensions",
    "tricep pushdown": "Tricep Pushdowns",
    crunch: "Crunches",
    crunches: "Crunches",
    "sit-up": "Sit-ups",
    "sit up": "Sit-ups",
    situp: "Sit-ups",
    situps: "Sit-ups",
  };

  // Parse "X sets of Y reps at Z pounds/kg" pattern
  // "I did 4 sets of 10 reps at 135 pounds on bench press"
  const setsRepsWeightPattern =
    /(\d+)\s*(?:sets?|x)\s*(?:of\s*)?(\d+)\s*(?:reps?)?\s*(?:at|@|with)?\s*(\d+(?:\.\d+)?)\s*(pounds?|lbs?|kilos?|kg|kilograms?)?\s*(?:on|of|for|doing)?\s*([a-zA-Z\s-]+)/gi;

  let match;
  while ((match = setsRepsWeightPattern.exec(normalizedText)) !== null) {
    const exerciseName = normalizeExerciseName(match[5].trim(), exerciseAliases);
    const unit = match[4]?.toLowerCase().includes("kg") || match[4]?.toLowerCase().includes("kilo") ? "kg" : "lbs";

    exercises.push({
      id: generateId(),
      name: exerciseName,
      sets: parseInt(match[1]),
      reps: match[2],
      weight: parseFloat(match[3]),
      unit,
    });
    confidence = Math.min(confidence + 0.15, 1);
  }

  // Parse "Exercise, X by Y at Z" pattern
  // "Squats, 5 by 5 at 225"
  const exerciseFirstPattern =
    /([a-zA-Z\s-]+?)(?:,|\s)\s*(\d+)\s*(?:by|x|×)\s*(\d+)\s*(?:at|@|with)?\s*(\d+(?:\.\d+)?)\s*(pounds?|lbs?|kilos?|kg|kilograms?)?/gi;

  while ((match = exerciseFirstPattern.exec(normalizedText)) !== null) {
    const exerciseName = normalizeExerciseName(match[1].trim(), exerciseAliases);
    // Skip if we already found this exercise
    if (exercises.some((e) => e.name.toLowerCase() === exerciseName.toLowerCase())) continue;

    const unit = match[5]?.toLowerCase().includes("kg") || match[5]?.toLowerCase().includes("kilo") ? "kg" : "lbs";

    exercises.push({
      id: generateId(),
      name: exerciseName,
      sets: parseInt(match[2]),
      reps: match[3],
      weight: parseFloat(match[4]),
      unit,
    });
    confidence = Math.min(confidence + 0.15, 1);
  }

  // Parse cardio pattern
  // "Ran 3 miles in 24 minutes"
  const cardioPattern =
    /(?:ran|run|jog|jogged|walked|walk|cycled|biked)\s*(\d+(?:\.\d+)?)\s*(miles?|km|kilometers?|meters?|m)\s*(?:in\s*)?(\d+)?\s*(?:minutes?|mins?)?/gi;

  while ((match = cardioPattern.exec(normalizedText)) !== null) {
    let distanceUnit: "miles" | "km" | "meters" = "miles";
    if (match[2].includes("km") || match[2].includes("kilometer")) {
      distanceUnit = "km";
    } else if (match[2].includes("meter") || match[2] === "m") {
      distanceUnit = "meters";
    }

    exercises.push({
      id: generateId(),
      name: "Running",
      distance: parseFloat(match[1]),
      distanceUnit,
      duration: match[3] ? parseInt(match[3]) : undefined,
    });
    confidence = Math.min(confidence + 0.15, 1);
  }

  // Parse bodyweight to failure pattern
  // "Did push-ups to failure, got 25 reps, then 20, then 15"
  const toFailurePattern =
    /(?:did\s+)?([a-zA-Z\s-]+?)(?:\s+to\s+failure)?(?:,|\s)(?:got\s+)?(\d+)\s*(?:reps?)?,?\s*(?:then\s+)?(\d+)?(?:\s*,?\s*then\s+)?(\d+)?/gi;

  while ((match = toFailurePattern.exec(normalizedText)) !== null) {
    const exerciseName = normalizeExerciseName(match[1].trim(), exerciseAliases);
    // Skip if we already found this exercise or name is too generic
    if (
      exercises.some((e) => e.name.toLowerCase() === exerciseName.toLowerCase()) ||
      exerciseName.length < 3
    )
      continue;

    const reps: number[] = [parseInt(match[2])];
    if (match[3]) reps.push(parseInt(match[3]));
    if (match[4]) reps.push(parseInt(match[4]));

    exercises.push({
      id: generateId(),
      name: exerciseName,
      sets: reps.length,
      reps: reps.join(", "),
    });
    confidence = Math.min(confidence + 0.1, 1);
  }

  // Parse EMOM pattern
  // "EMOM 10 minutes, 5 burpees each minute"
  const emomPattern =
    /(?:emom|every\s+minute\s+on\s+the\s+minute)\s*(\d+)\s*(?:minutes?|mins?)?,?\s*(\d+)\s*([a-zA-Z\s-]+?)(?:\s+each\s+minute)?/gi;

  while ((match = emomPattern.exec(normalizedText)) !== null) {
    const exerciseName = normalizeExerciseName(match[3].trim(), exerciseAliases);
    exercises.push({
      id: generateId(),
      name: `EMOM: ${exerciseName}`,
      sets: parseInt(match[1]),
      reps: match[2],
      duration: parseInt(match[1]),
    });
    confidence = Math.min(confidence + 0.1, 1);
  }

  // Parse simple exercise mention with weight
  // "bench 225" or "squat 315"
  const simplePattern = /([a-zA-Z\s-]+?)\s*(?:at|@)?\s*(\d{2,3})\s*(pounds?|lbs?|kg)?(?:\s|$)/gi;

  while ((match = simplePattern.exec(normalizedText)) !== null) {
    const exerciseName = normalizeExerciseName(match[1].trim(), exerciseAliases);
    if (
      exercises.some((e) => e.name.toLowerCase() === exerciseName.toLowerCase()) ||
      exerciseName.length < 3 ||
      !exerciseAliases[exerciseName.toLowerCase()]
    )
      continue;

    const unit = match[3]?.toLowerCase().includes("kg") ? "kg" : "lbs";
    exercises.push({
      id: generateId(),
      name: exerciseName,
      weight: parseFloat(match[2]),
      unit,
    });
    confidence = Math.min(confidence + 0.05, 1);
  }

  // Parse overall duration
  const durationMatch = normalizedText.match(
    /(?:for|total|overall|about|around)\s*(\d+)\s*(?:minutes?|mins?|hours?)/i
  );
  if (durationMatch) {
    duration = parseInt(durationMatch[1]);
    if (normalizedText.includes("hour")) {
      duration *= 60;
    }
  }

  // Parse feeling/mood
  const feelingPatterns = [
    { pattern: /felt?\s+(great|amazing|awesome|fantastic|strong|powerful)/i, feeling: "great" },
    { pattern: /felt?\s+(good|nice|solid|decent)/i, feeling: "good" },
    { pattern: /felt?\s+(okay|ok|alright|fine)/i, feeling: "okay" },
    { pattern: /felt?\s+(tired|exhausted|fatigued|drained)/i, feeling: "tired" },
    { pattern: /felt?\s+(bad|rough|terrible|awful|weak)/i, feeling: "struggled" },
    { pattern: /pretty\s+(good|great|solid)/i, feeling: "good" },
    { pattern: /really\s+(good|great|strong)/i, feeling: "great" },
  ];

  for (const { pattern, feeling: f } of feelingPatterns) {
    if (pattern.test(normalizedText)) {
      feeling = f;
      break;
    }
  }

  // Parse RPE
  const rpeMatch = normalizedText.match(/(?:rpe|rate\s+of\s+perceived\s+exertion)\s*(?:of|was|at)?\s*(\d+(?:\.\d+)?)/i);
  if (rpeMatch) {
    rpe = Math.min(10, Math.max(1, parseFloat(rpeMatch[1])));
  }

  // Extract notes (anything that feels like a note)
  const notesPatterns = [
    /(?:note:|notes:|felt\s+like|thought)/i,
  ];
  for (const pattern of notesPatterns) {
    const noteMatch = normalizedText.match(pattern);
    if (noteMatch) {
      // Get the rest of the sentence
      const idx = normalizedText.indexOf(noteMatch[0]);
      const afterMatch = normalizedText.slice(idx);
      const endIdx = afterMatch.search(/[.!?]|\s{2,}/);
      notes = afterMatch.slice(0, endIdx > 0 ? endIdx : undefined).replace(noteMatch[0], "").trim();
      break;
    }
  }

  // If no exercises found, reduce confidence significantly
  if (exercises.length === 0) {
    confidence = 0.1;
  }

  return {
    exercises,
    duration,
    feeling,
    rpe,
    notes,
    confidence,
  };
}

function normalizeExerciseName(name: string, aliases: Record<string, string>): string {
  const normalized = name.toLowerCase().trim();
  return aliases[normalized] || capitalizeWords(name);
}

function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Parse feeling/mood from speech
 */
export function parseFeelingFromSpeech(text: string): { feeling: string; rpe?: number } {
  const normalizedText = text.toLowerCase().trim();

  // Map feelings to RPE ranges
  const feelingToRpe: Record<string, number> = {
    amazing: 5,
    fantastic: 5,
    great: 6,
    strong: 6,
    powerful: 6,
    good: 7,
    solid: 7,
    decent: 7,
    okay: 8,
    fine: 8,
    tired: 8.5,
    hard: 9,
    difficult: 9,
    exhausted: 9.5,
    brutal: 10,
    terrible: 10,
  };

  let feeling = "okay";
  let rpe: number | undefined;

  // Check for explicit RPE mention
  const rpeMatch = normalizedText.match(/(?:rpe|rate)\s*(?:of|was|at|is)?\s*(\d+(?:\.\d+)?)/i);
  if (rpeMatch) {
    rpe = Math.min(10, Math.max(1, parseFloat(rpeMatch[1])));
  }

  // Find feeling words
  for (const [word, rpeValue] of Object.entries(feelingToRpe)) {
    if (normalizedText.includes(word)) {
      feeling = word;
      if (!rpe) {
        rpe = rpeValue;
      }
      break;
    }
  }

  // Check for qualifiers
  if (normalizedText.includes("pretty") || normalizedText.includes("fairly")) {
    feeling = `pretty ${feeling}`;
  }
  if (normalizedText.includes("really") || normalizedText.includes("very")) {
    feeling = `really ${feeling}`;
    if (rpe) rpe = Math.min(10, rpe + 0.5);
  }
  if (normalizedText.includes("kind of") || normalizedText.includes("kinda")) {
    feeling = `kind of ${feeling}`;
    if (rpe) rpe = Math.max(1, rpe - 0.5);
  }

  return { feeling, rpe };
}

// ============================================================================
// MIC BUTTON COMPONENT
// ============================================================================

export function MicButton({
  isListening,
  isSupported,
  disabled = false,
  size = "md",
  onClick,
}: MicButtonProps) {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
  };

  if (!isSupported) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center text-muted-foreground",
          sizeClasses[size]
        )}
      >
        <MicOff className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/50",
        sizeClasses[size],
        isListening
          ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 scale-110"
          : "bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-300 hover:text-white hover:from-zinc-700 hover:to-zinc-800 border border-zinc-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Pulse animation rings when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute inset-0 rounded-full bg-amber-500"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.3,
              }}
              className="absolute inset-0 rounded-full bg-amber-500"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.2 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.6,
              }}
              className="absolute inset-0 rounded-full bg-amber-500"
            />
          </>
        )}
      </AnimatePresence>

      {/* Icon */}
      <span className="relative z-10 flex items-center justify-center">
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <MicOff className={iconSizes[size]} />
          </motion.div>
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </span>
    </button>
  );
}

// ============================================================================
// WAVEFORM VISUALIZER
// ============================================================================

// Pre-computed waveform bar data to avoid impure Math.random calls during render
const WAVEFORM_BARS = [
  { maxHeight: 28, duration: 0.38 },
  { maxHeight: 32, duration: 0.45 },
  { maxHeight: 24, duration: 0.35 },
  { maxHeight: 30, duration: 0.42 },
  { maxHeight: 26, duration: 0.40 },
  { maxHeight: 34, duration: 0.48 },
  { maxHeight: 22, duration: 0.33 },
  { maxHeight: 29, duration: 0.44 },
  { maxHeight: 25, duration: 0.36 },
  { maxHeight: 31, duration: 0.46 },
  { maxHeight: 27, duration: 0.39 },
  { maxHeight: 33, duration: 0.47 },
];

export function WaveformVisualizer({ isActive, className }: WaveformVisualizerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {WAVEFORM_BARS.map((bar, i) => (
        <motion.div
          key={i}
          className="w-1 bg-amber-500 rounded-full"
          initial={{ height: 8 }}
          animate={
            isActive
              ? {
                  height: [8, bar.maxHeight, 8],
                }
              : { height: 8 }
          }
          transition={{
            duration: bar.duration,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// TRANSCRIPT DISPLAY
// ============================================================================

export function TranscriptDisplay({
  transcript,
  interimTranscript,
  isListening,
  className,
}: TranscriptDisplayProps) {
  const displayText = transcript + (interimTranscript ? " " + interimTranscript : "");

  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[80px] max-h-[200px] overflow-y-auto",
        className
      )}
    >
      {displayText ? (
        <p className="text-base leading-relaxed text-foreground">
          {transcript}
          {interimTranscript && (
            <span className="text-muted-foreground/60">{" "}{interimTranscript}</span>
          )}
          {isListening && (
            <motion.span
              animate={{ opacity: [1, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-0.5 h-5 bg-amber-500 ml-1 align-middle rounded-full"
            />
          )}
        </p>
      ) : (
        <p className="text-muted-foreground/50 text-base italic">
          {isListening ? "Start speaking..." : "Press the mic to start"}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// LISTENING INDICATOR
// ============================================================================

export function ListeningIndicator({ isListening }: ListeningIndicatorProps) {
  if (!isListening) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 text-amber-500"
    >
      <Volume2 className="h-4 w-4" />
      <span className="text-sm font-medium">Listening</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </span>
    </motion.div>
  );
}

// ============================================================================
// PARSED EXERCISE CARD
// ============================================================================

export function ParsedExerciseCard({
  exercise,
  onEdit,
  onDelete,
}: ParsedExerciseCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedExercise, setEditedExercise] = useState(exercise);

  const handleSave = () => {
    onEdit(editedExercise);
    setIsEditing(false);
  };

  const getExerciseIcon = () => {
    if (exercise.distance) return <Activity className="h-4 w-4 text-blue-400" />;
    if (exercise.duration && !exercise.weight) return <Timer className="h-4 w-4 text-green-400" />;
    return <Dumbbell className="h-4 w-4 text-amber-400" />;
  };

  const getExerciseSummary = () => {
    const parts: string[] = [];
    if (exercise.sets) parts.push(`${exercise.sets} sets`);
    if (exercise.reps) parts.push(`${exercise.reps} reps`);
    if (exercise.weight) parts.push(`${exercise.weight} ${exercise.unit || "lbs"}`);
    if (exercise.distance)
      parts.push(`${exercise.distance} ${exercise.distanceUnit || "miles"}`);
    if (exercise.duration && !exercise.distance) parts.push(`${exercise.duration} min`);
    return parts.join(" x ");
  };

  if (isEditing) {
    return (
      <Card className="bg-zinc-900 border-amber-500/50">
        <CardContent className="p-4 space-y-3">
          <Input
            value={editedExercise.name}
            onChange={(e) =>
              setEditedExercise({ ...editedExercise, name: e.target.value })
            }
            placeholder="Exercise name"
            className="bg-zinc-800 border-zinc-700"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              value={editedExercise.sets || ""}
              onChange={(e) =>
                setEditedExercise({
                  ...editedExercise,
                  sets: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="Sets"
              className="bg-zinc-800 border-zinc-700"
            />
            <Input
              value={editedExercise.reps || ""}
              onChange={(e) =>
                setEditedExercise({ ...editedExercise, reps: e.target.value })
              }
              placeholder="Reps"
              className="bg-zinc-800 border-zinc-700"
            />
            <Input
              type="number"
              value={editedExercise.weight || ""}
              onChange={(e) =>
                setEditedExercise({
                  ...editedExercise,
                  weight: parseFloat(e.target.value) || undefined,
                })
              }
              placeholder="Weight"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1 bg-amber-500 hover:bg-amber-600">
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            {getExerciseIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">{getExerciseSummary()}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(exercise.id)}
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// FALLBACK TEXT INPUT
// ============================================================================

export function FallbackTextInput({
  onSubmit,
  placeholder = "Type your workout details...",
  className,
}: FallbackTextInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-sm text-amber-500">
          Voice input not supported in this browser. Please type your workout.
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-[100px] bg-zinc-900 border-zinc-800"
      />
      <Button onClick={handleSubmit} disabled={!text.trim()} className="w-full bg-amber-500 hover:bg-amber-600">
        <Sparkles className="h-4 w-4 mr-2" />
        Parse Workout
      </Button>
    </div>
  );
}

// ============================================================================
// VOICE LOGGER - MAIN COMPONENT
// ============================================================================

export function VoiceLogger({
  onTranscript,
  onParsedData,
  disabled = false,
  className,
  size = "lg",
  showTranscript = true,
  placeholder,
}: VoiceLoggerProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
  });

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      // Process final transcript
      const finalText = (transcript + " " + interimTranscript).trim();
      if (finalText) {
        onTranscript?.(finalText);
        const parsed = parseWorkoutSpeech(finalText);
        onParsedData?.(parsed);
      }
    } else {
      resetTranscript();
      startListening();
    }
  }, [
    isListening,
    stopListening,
    startListening,
    resetTranscript,
    transcript,
    interimTranscript,
    onTranscript,
    onParsedData,
  ]);

  // Fallback for unsupported browsers
  if (!isSupported) {
    return (
      <FallbackTextInput
        onSubmit={(text) => {
          onTranscript?.(text);
          const parsed = parseWorkoutSpeech(text);
          onParsedData?.(parsed);
        }}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Mic Button */}
      <MicButton
        isListening={isListening}
        isSupported={isSupported}
        disabled={disabled}
        size={size}
        onClick={handleToggle}
      />

      {/* Waveform Visualizer */}
      <WaveformVisualizer isActive={isListening} />

      {/* Listening Indicator */}
      <AnimatePresence>
        <ListeningIndicator isListening={isListening} />
      </AnimatePresence>

      {/* Transcript Display */}
      {showTranscript && (
        <TranscriptDisplay
          transcript={transcript}
          interimTranscript={interimTranscript}
          isListening={isListening}
          className="w-full max-w-md"
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Instructions */}
      {!isListening && !transcript && (
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {placeholder || "Tap the mic and tell me about your workout"}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// VOICE WORKOUT FORM - COMPLETE FORM
// ============================================================================

export function VoiceWorkoutForm({ onSubmit, onCancel, className }: VoiceWorkoutFormProps) {
  const [parsedData, setParsedData] = useState<ParsedWorkoutData | null>(null);
  const [exercises, setExercises] = useState<ParsedExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [feeling, setFeeling] = useState("");
  const [rpe, setRpe] = useState<number | undefined>();
  const [step, setStep] = useState<"voice" | "review">("voice");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleParsedData = useCallback((data: ParsedWorkoutData) => {
    setIsProcessing(true);
    // Simulate processing time for better UX
    setTimeout(() => {
      setParsedData(data);
      setExercises((prev) => [...prev, ...data.exercises]);
      if (data.notes) setNotes((prev) => (prev ? prev + " " + data.notes : data.notes || ""));
      if (data.feeling) setFeeling(data.feeling);
      if (data.rpe) setRpe(data.rpe);
      setStep("review");
      setIsProcessing(false);
    }, 500);
  }, []);

  const handleEditExercise = (updated: ParsedExercise) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  };

  const handleDeleteExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddMore = () => {
    setStep("voice");
  };

  const handleSubmitWorkout = () => {
    const finalData: ParsedWorkoutData = {
      exercises,
      duration: parsedData?.duration,
      feeling: feeling || undefined,
      rpe,
      notes: notes || undefined,
      confidence: parsedData?.confidence || 0.5,
    };
    onSubmit(finalData);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <AnimatePresence mode="wait">
        {step === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Tell me about your workout</h2>
              <p className="text-sm text-muted-foreground">
                Speak natucircle - I&apos;ll extract the details
              </p>
            </div>

            {/* Voice Logger */}
            <VoiceLogger
              onParsedData={handleParsedData}
              size="lg"
              showTranscript={true}
              placeholder='Try: "4 sets of 10 at 135 on bench press"'
            />

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-amber-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing your workout...</span>
              </div>
            )}

            {/* Previously Added */}
            {exercises.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Already added: {exercises.length} exercise{exercises.length > 1 ? "s" : ""}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setStep("review")}
                  className="w-full"
                >
                  Review & Edit
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Review Your Workout</h2>
              {parsedData && (
                <Badge
                  variant={parsedData.confidence > 0.7 ? "default" : "secondary"}
                  className={cn(
                    parsedData.confidence > 0.7
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}
                >
                  {Math.round(parsedData.confidence * 100)}% confidence
                </Badge>
              )}
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Exercises ({exercises.length})
                </h3>
              </div>
              <AnimatePresence mode="popLayout">
                {exercises.map((exercise) => (
                  <ParsedExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={handleEditExercise}
                    onDelete={handleDeleteExercise}
                  />
                ))}
              </AnimatePresence>
              {exercises.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No exercises detected. Try speaking again.</p>
                </div>
              )}
            </div>

            {/* Add More Button */}
            <Button
              variant="outline"
              onClick={handleAddMore}
              className="w-full border-dashed border-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add more exercises
            </Button>

            {/* Feeling & Notes */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-400" />
                  How did it feel?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feeling && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Feeling: {feeling}
                  </Badge>
                )}
                {rpe && (
                  <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    RPE: {rpe}
                  </Badge>
                )}
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="bg-zinc-800 border-zinc-700 min-h-[60px]"
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmitWorkout}
                disabled={exercises.length === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Workout
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// VOICE FEELING LOGGER
// ============================================================================

export function VoiceFeelingLogger({
  onFeelingCaptured,
  className,
}: VoiceFeelingLoggerProps) {
  const [capturedFeeling, setCapturedFeeling] = useState<string | null>(null);
  const [capturedRpe, setCapturedRpe] = useState<number | undefined>();

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
  });

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      const finalText = (transcript + " " + interimTranscript).trim();
      if (finalText) {
        const { feeling, rpe } = parseFeelingFromSpeech(finalText);
        setCapturedFeeling(feeling);
        setCapturedRpe(rpe);
        onFeelingCaptured(feeling, rpe);
      }
    } else {
      resetTranscript();
      setCapturedFeeling(null);
      setCapturedRpe(undefined);
      startListening();
    }
  }, [
    isListening,
    stopListening,
    startListening,
    resetTranscript,
    transcript,
    interimTranscript,
    onFeelingCaptured,
  ]);

  return (
    <Card className={cn("bg-zinc-900 border-zinc-800", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-400" />
          How did that feel?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <MicButton
            isListening={isListening}
            isSupported={isSupported}
            size="sm"
            onClick={handleToggle}
          />
          <div className="flex-1">
            {isListening ? (
              <div className="space-y-1">
                <ListeningIndicator isListening={true} />
                <p className="text-sm text-muted-foreground">
                  {transcript || interimTranscript || "Tell me how it felt..."}
                </p>
              </div>
            ) : capturedFeeling ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-400">
                    {capturedFeeling}
                  </Badge>
                  {capturedRpe && (
                    <Badge className="bg-blue-500/20 text-blue-400">
                      RPE {capturedRpe}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tap mic to try again
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tap the mic and tell me how you&apos;re feeling
              </p>
            )}
          </div>
        </div>

        {/* Fallback for unsupported browsers */}
        {!isSupported && (
          <div className="text-sm text-amber-500">
            Voice not supported. Type how you felt:
            <Input
              placeholder="e.g., Felt great, RPE 7"
              className="mt-2 bg-zinc-800 border-zinc-700"
              onChange={(e) => {
                const { feeling, rpe } = parseFeelingFromSpeech(e.target.value);
                setCapturedFeeling(feeling);
                setCapturedRpe(rpe);
              }}
              onBlur={() => {
                if (capturedFeeling) {
                  onFeelingCaptured(capturedFeeling, capturedRpe);
                }
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default VoiceLogger;
