"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";

export interface ParsedWorkoutData {
  workoutType?: string;
  duration?: number;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: string;
  }>;
  notes?: string;
  feeling?: string;
}

interface VoiceLoggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: ParsedWorkoutData, rawTranscript: string) => void;
  promptText?: string;
  parseMode?: "workout" | "caption" | "freeform";
}

const WORKOUT_TYPE_KEYWORDS: Record<string, string[]> = {
  strength: ["strength", "weights", "lifting", "lift", "resistance", "bench", "squat", "deadlift"],
  cardio: ["cardio", "running", "run", "cycling", "bike", "swimming", "walk", "walking", "jog", "jogging"],
  hiit: ["hiit", "interval", "circuits", "crossfit", "tabata"],
  flexibility: ["stretch", "stretching", "yoga", "mobility", "flexibility", "pilates"],
  sports: ["basketball", "soccer", "tennis", "football", "golf", "volleyball", "baseball"],
  other: ["workout", "exercise", "training", "session"],
};

const DURATION_PATTERNS = [
  /(\d+)\s*(minutes?|mins?|min)/i,
  /(\d+)\s*(hours?|hrs?|hr)/i,
  /for\s+(\d+)/i,
  /(\d+)\s*(?:minute|min)/i,
];

function parseWorkoutFromTranscript(transcript: string): ParsedWorkoutData {
  const lower = transcript.toLowerCase();
  const result: ParsedWorkoutData = { notes: transcript };

  // Parse workout type
  for (const [type, keywords] of Object.entries(WORKOUT_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      result.workoutType = type;
      break;
    }
  }

  // Parse duration
  for (const pattern of DURATION_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      let duration = parseInt(match[1], 10);
      if (lower.includes("hour") || lower.includes("hr")) {
        duration *= 60;
      }
      result.duration = duration;
      break;
    }
  }

  // Parse feeling words
  const feelingWords = ["great", "amazing", "good", "tired", "exhausted", "energized", "strong", "weak", "sore"];
  for (const word of feelingWords) {
    if (lower.includes(word)) {
      result.feeling = word;
      break;
    }
  }

  // Parse exercises (simple pattern matching)
  const exercisePatterns = [
    /(\d+)\s*sets?\s*(?:of\s*)?(\d+)\s*(?:reps?\s*)?(?:of\s*)?([a-z\s]+?)(?:\s*at\s*|\s*with\s*|\s*@\s*)(\d+\s*(?:lbs?|kg|pounds?))/gi,
    /(\d+)\s*(?:x|times)\s*(\d+)\s*([a-z\s]+)/gi,
  ];

  const exercises: ParsedWorkoutData["exercises"] = [];
  for (const pattern of exercisePatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      if (match[3]) {
        exercises.push({
          name: match[3].trim(),
          sets: parseInt(match[1], 10),
          reps: parseInt(match[2], 10),
          weight: match[4] || undefined,
        });
      }
    }
  }
  if (exercises.length > 0) {
    result.exercises = exercises;
  }

  return result;
}

export function VoiceLogger({
  open,
  onOpenChange,
  onComplete,
  promptText = "Describe your workout...",
  parseMode = "workout",
}: VoiceLoggerProps) {
  const [phase, setPhase] = useState<"listening" | "processing" | "confirming">("listening");
  const [parsedData, setParsedData] = useState<ParsedWorkoutData | null>(null);
  const [fullTranscript, setFullTranscript] = useState("");

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

  // Start listening when opened
  useEffect(() => {
    if (open && isSupported) {
      resetTranscript();
      setPhase("listening");
      setParsedData(null);
      setFullTranscript("");
      startListening();
      haptics.medium(); // Haptic on recording start
    }
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [open, isSupported]);

  const handleStopRecording = useCallback(() => {
    stopListening();
    haptics.light(); // Haptic on recording stop
    const finalTranscript = (transcript + " " + interimTranscript).trim();
    setFullTranscript(finalTranscript);

    if (finalTranscript) {
      setPhase("processing");
      // Simulate processing delay for UX
      setTimeout(() => {
        const parsed = parseMode === "workout"
          ? parseWorkoutFromTranscript(finalTranscript)
          : { notes: finalTranscript };
        setParsedData(parsed);
        setPhase("confirming");
      }, 500);
    }
  }, [stopListening, transcript, interimTranscript, parseMode]);

  const handleConfirm = useCallback(() => {
    if (parsedData) {
      haptics.success();
      onComplete(parsedData, fullTranscript);
      onOpenChange(false);
    }
  }, [parsedData, fullTranscript, onComplete, onOpenChange]);

  const handleRetry = useCallback(() => {
    resetTranscript();
    setPhase("listening");
    setParsedData(null);
    setFullTranscript("");
    startListening();
    haptics.medium();
  }, [resetTranscript, startListening]);

  const handleClose = useCallback(() => {
    stopListening();
    resetTranscript();
    onOpenChange(false);
  }, [stopListening, resetTranscript, onOpenChange]);

  if (!isSupported) {
    return null;
  }

  const displayText = transcript + (interimTranscript ? " " + interimTranscript : "");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
              <span className="font-medium">Voice Logger</span>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {phase === "listening" && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Listening animation */}
                  <div className="relative mb-8">
                    <motion.div
                      className="w-32 h-32 rounded-full bg-brand/20 flex items-center justify-center"
                      animate={{
                        scale: isListening ? [1, 1.1, 1] : 1,
                      }}
                      transition={{
                        duration: 1,
                        repeat: isListening ? Infinity : 0,
                        ease: "easeInOut",
                      }}
                    >
                      <motion.div
                        className="w-24 h-24 rounded-full bg-brand/40 flex items-center justify-center"
                        animate={{
                          scale: isListening ? [1, 1.15, 1] : 1,
                        }}
                        transition={{
                          duration: 1,
                          repeat: isListening ? Infinity : 0,
                          ease: "easeInOut",
                          delay: 0.1,
                        }}
                      >
                        <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-white">
                          {isListening ? (
                            <Mic className="h-8 w-8" />
                          ) : (
                            <MicOff className="h-8 w-8" />
                          )}
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Waveform bars */}
                    {isListening && (
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-brand rounded-full"
                            animate={{
                              height: [8, 24 + Math.random() * 16, 8],
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.1,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-lg font-medium mb-2">
                    {isListening ? "Listening..." : "Tap to start"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-8 max-w-xs">
                    {promptText}
                  </p>

                  {/* Transcript preview */}
                  {displayText && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-muted/50 rounded-xl p-4 max-w-sm w-full mb-6"
                    >
                      <p className="text-sm">
                        {transcript}
                        {interimTranscript && (
                          <span className="text-muted-foreground"> {interimTranscript}</span>
                        )}
                        <motion.span
                          animate={{ opacity: [1, 0.3] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="inline-block w-0.5 h-4 bg-brand ml-1 align-middle rounded-full"
                        />
                      </p>
                    </motion.div>
                  )}

                  {/* Control button */}
                  <Button
                    onClick={isListening ? handleStopRecording : handleRetry}
                    className={cn(
                      "h-14 px-8 rounded-full text-lg",
                      isListening
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-brand-gradient"
                    )}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-5 w-5 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>

                  {error && (
                    <p className="text-sm text-destructive mt-4">{error}</p>
                  )}
                </motion.div>
              )}

              {phase === "processing" && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center mb-4">
                    <Loader2 className="h-8 w-8 text-brand animate-spin" />
                  </div>
                  <p className="text-lg font-medium">Processing...</p>
                  <p className="text-sm text-muted-foreground">
                    Understanding your workout
                  </p>
                </motion.div>
              )}

              {phase === "confirming" && parsedData && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-sm"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Got it!</p>
                      <p className="text-sm text-muted-foreground">
                        Here's what I understood
                      </p>
                    </div>
                  </div>

                  {/* Parsed data display */}
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3 mb-6">
                    {parsedData.workoutType && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <span className="text-sm font-medium capitalize">
                          {parsedData.workoutType}
                        </span>
                      </div>
                    )}
                    {parsedData.duration && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm font-medium">
                          {parsedData.duration} min
                        </span>
                      </div>
                    )}
                    {parsedData.feeling && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Feeling</span>
                        <span className="text-sm font-medium capitalize">
                          {parsedData.feeling}
                        </span>
                      </div>
                    )}
                    {parsedData.exercises && parsedData.exercises.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">
                          Exercises
                        </span>
                        {parsedData.exercises.map((ex, i) => (
                          <div key={i} className="text-sm">
                            {ex.sets}x{ex.reps} {ex.name}
                            {ex.weight && ` @ ${ex.weight}`}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground block mb-1">
                        Full transcript
                      </span>
                      <p className="text-sm">{fullTranscript}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleRetry}
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      className="flex-1 bg-brand-gradient"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Use This
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
