"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Check, X, Loader2, Volume2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";

interface InlineVoiceInputProps {
  onComplete: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineVoiceInput({
  onComplete,
  placeholder = "Tap to speak about your workout...",
  className,
}: InlineVoiceInputProps) {
  const [phase, setPhase] = useState<"idle" | "listening" | "confirming">("idle");
  const [finalText, setFinalText] = useState("");

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

  // Auto-stop after silence
  useEffect(() => {
    if (isListening && transcript) {
      const timer = setTimeout(() => {
        // If no new input for 2 seconds, auto-stop
        if (interimTranscript === "") {
          handleStopRecording();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, interimTranscript]);

  const handleStartRecording = useCallback(() => {
    resetTranscript();
    setPhase("listening");
    setFinalText("");
    startListening();
    haptics.medium();
  }, [resetTranscript, startListening]);

  const handleStopRecording = useCallback(() => {
    stopListening();
    haptics.light();
    const text = (transcript + " " + interimTranscript).trim();
    setFinalText(text);

    if (text) {
      setPhase("confirming");
    } else {
      setPhase("idle");
    }
  }, [stopListening, transcript, interimTranscript]);

  const handleConfirm = useCallback(() => {
    if (finalText) {
      haptics.success();
      onComplete(finalText);
      setPhase("idle");
      setFinalText("");
      resetTranscript();
    }
  }, [finalText, onComplete, resetTranscript]);

  const handleCancel = useCallback(() => {
    stopListening();
    resetTranscript();
    setPhase("idle");
    setFinalText("");
  }, [stopListening, resetTranscript]);

  const displayText = phase === "confirming"
    ? finalText
    : transcript + (interimTranscript ? " " + interimTranscript : "");

  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleStartRecording}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-brand/30 bg-brand/5 hover:bg-brand/10 hover:border-brand/50 transition-all"
          >
            <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
              <Mic className="h-6 w-6 text-brand" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-brand">Tap to Speak</p>
              <p className="text-xs text-muted-foreground">{placeholder}</p>
            </div>
          </motion.button>
        )}

        {phase === "listening" && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border-2 border-brand bg-brand/5 overflow-hidden"
          >
            {/* Recording indicator */}
            <div className="flex items-center gap-3 p-4 border-b border-brand/20">
              <motion.div
                className="h-12 w-12 rounded-full bg-brand flex items-center justify-center flex-shrink-0"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mic className="h-6 w-6 text-white" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-brand">Listening...</p>
                  <motion.div
                    className="h-2 w-2 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Speak clearly into your device</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Live transcription */}
            <div className="p-4 min-h-[80px] bg-background/50">
              {displayText ? (
                <p className="text-sm leading-relaxed">
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
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Waiting for you to speak...
                </p>
              )}
            </div>

            {/* Waveform visualization */}
            <div className="flex items-center justify-center gap-1 p-3 border-t border-brand/20 bg-brand/10">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-brand rounded-full"
                  animate={{
                    height: [4, 16 + Math.random() * 12, 4],
                  }}
                  transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Stop button */}
            <div className="p-3 bg-muted/30">
              <Button
                onClick={handleStopRecording}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                <MicOff className="h-4 w-4 mr-2" />
                Done Speaking
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "confirming" && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border-2 border-success/50 bg-success/5 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-success/20">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <Volume2 className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-success">Got it!</p>
                <p className="text-xs text-muted-foreground">Review and confirm your text</p>
              </div>
            </div>

            {/* Transcription result */}
            <div className="p-4 bg-background/50 min-h-[80px]">
              <p className="text-sm leading-relaxed">{finalText}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 p-3 bg-muted/30">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <Check className="h-4 w-4 mr-2" />
                Use This
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
