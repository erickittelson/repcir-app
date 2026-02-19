"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, Mic, MicOff, Sparkles, Brain, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { OnboardingActions } from "./onboarding-actions";
import type { SectionProps } from "./types";

const WORD_LIMIT = 500;
const WARNING_THRESHOLD = 450;
const DANGER_THRESHOLD = 490;

const VALUE_POINTS = [
  {
    icon: Brain,
    title: "Smarter workouts",
    description: "AI tailors every session to your real situation",
  },
  {
    icon: Sparkles,
    title: "Context machines miss",
    description: "Checkboxes can't capture your full story",
  },
  {
    icon: Shield,
    title: "Private to you",
    description: "Only used by AI to personalize your training",
  },
];

const PROMPTS = [
  "What are you training for right now?",
  "What's held you back in the past?",
  "Any injuries, schedule constraints, or goals on the horizon?",
  "What does a good week of training look like for you?",
];

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function truncateToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ");
}

export function PersonalContextSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [text, setText] = useState(data.personalContext || "");
  const [showPrompts, setShowPrompts] = useState(!data.personalContext);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = countWords(text);
  const isOverLimit = wordCount > WORD_LIMIT;
  const isWarning = wordCount >= WARNING_THRESHOLD && wordCount <= DANGER_THRESHOLD;
  const isDanger = wordCount > DANGER_THRESHOLD;
  const progress = Math.min(wordCount / WORD_LIMIT, 1);

  // Speech recognition via existing hook
  const onSpeechResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setText((prev) => {
        const combined = prev + (prev ? " " : "") + transcript;
        return truncateToWordLimit(combined, WORD_LIMIT);
      });
      setShowPrompts(false);
    }
  }, []);

  const {
    isListening,
    isSupported: speechSupported,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    onResult: onSpeechResult,
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  // Save to parent on change (debounced slightly)
  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate({ personalContext: text || undefined });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newWordCount = countWords(newText);

    if (newWordCount > WORD_LIMIT) {
      setText(truncateToWordLimit(newText, WORD_LIMIT));
    } else {
      setText(newText);
    }
    setShowPrompts(false);
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleContinue = () => {
    if (isListening) stopListening();
    onUpdate({ personalContext: text.trim() || undefined, personalContextAcknowledged: true });
    onNext();
  };

  const handleSkip = () => {
    if (isListening) stopListening();
    onUpdate({ personalContext: undefined, personalContextAcknowledged: true });
    onNext();
  };

  // Word count ring SVG
  const ringSize = 28;
  const strokeWidth = 2.5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
      <div className="max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand/10 flex items-center justify-center">
              <MessageSquareText className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Anything else AI should know?
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The more context you give, the better your workouts fit your life.
              This is optional but makes a real difference.
            </p>
          </div>

          {/* Value proposition cards */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {VALUE_POINTS.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex flex-col items-center text-center p-3 rounded-xl bg-card border border-border"
              >
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4 text-brand" />
                </div>
                <span className="text-xs font-semibold leading-tight">{title}</span>
                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</span>
              </motion.div>
            ))}
          </div>

          {/* Prompt suggestions */}
          <AnimatePresence>
            {showPrompts && !text && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <p className="text-xs font-medium text-muted-foreground mb-2">Not sure what to say? Try answering:</p>
                <div className="space-y-1.5">
                  {PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setText(prompt + " ");
                        setShowPrompts(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-brand/5 hover:border-brand/30 transition-colors text-muted-foreground"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea with word count ring */}
          <div className="relative mb-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              placeholder="Tell AI about your training journey, goals, obstacles, schedule — anything that helps it understand you better..."
              className={cn(
                "w-full min-h-[160px] max-h-[300px] p-4 pr-12 rounded-xl border-2 bg-card text-sm leading-relaxed resize-none transition-colors focus:outline-none",
                isListening
                  ? "border-red-400 ring-2 ring-red-400/20"
                  : isOverLimit
                    ? "border-destructive"
                    : "border-border focus:border-brand"
              )}
              disabled={isListening}
            />

            {/* Word count ring — bottom-right of textarea */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <svg width={ringSize} height={ringSize} className="-rotate-90">
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-muted/30"
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-300",
                    isDanger || isOverLimit
                      ? "text-destructive"
                      : isWarning
                        ? "text-amber-500"
                        : "text-brand"
                  )}
                  stroke="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* Voice button + word count row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {speechSupported && (
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {isListening ? (
                    <><MicOff className="w-3.5 h-3.5" />Tap to stop</>
                  ) : (
                    <><Mic className="w-3.5 h-3.5" />Voice</>
                  )}
                </button>
              )}
            </div>

            <span
              className={cn(
                "text-xs font-medium tabular-nums transition-colors",
                isOverLimit || isDanger
                  ? "text-destructive"
                  : isWarning
                    ? "text-amber-500"
                    : "text-muted-foreground"
              )}
            >
              {wordCount}/{WORD_LIMIT} words
            </span>
          </div>

          {/* Speech error */}
          {speechError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive mb-4 text-center"
            >
              {speechError}
            </motion.p>
          )}

          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center justify-center gap-2 mb-4 p-2 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-red-500 rounded-full"
                      animate={{ height: [4, 12, 4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Listening... speak naturally
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Encouragement badge */}
          <AnimatePresence>
            {wordCount >= 20 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 mb-4"
              >
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-xs text-green-700 dark:text-green-400">
                  {wordCount >= 100
                    ? "Great detail — AI will have a lot to work with"
                    : wordCount >= 50
                      ? "Nice start — more detail helps AI personalize better"
                      : "Good — even a little context helps a lot"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1 h-12"
            >
              Skip for now
            </Button>
            <OnboardingActions
              onNext={handleContinue}
              onBack={onBack}
              nextDisabled={false}
              className="flex-1"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
