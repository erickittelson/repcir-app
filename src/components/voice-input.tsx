"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({
  onTranscript,
  onInterimTranscript,
  disabled = false,
  className,
}: VoiceInputProps) {
  const [hasStarted, setHasStarted] = useState(false);

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
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        onTranscript(text.trim());
      } else if (!isFinal) {
        onInterimTranscript?.(text);
      }
    },
  });

  const handleToggle = useCallback(() => {
    if (!isSupported) return;

    if (isListening) {
      stopListening();
      setHasStarted(false);
      haptics.light(); // Haptic on recording stop
      // Submit final transcript if exists
      const finalText = transcript || interimTranscript;
      if (finalText?.trim()) {
        onTranscript(finalText.trim());
      }
    } else {
      resetTranscript();
      startListening();
      setHasStarted(true);
      haptics.medium(); // Haptic on recording start
    }
  }, [
    isSupported,
    isListening,
    stopListening,
    startListening,
    resetTranscript,
    transcript,
    interimTranscript,
    onTranscript,
  ]);

  const handleCancel = useCallback(() => {
    stopListening();
    resetTranscript();
    setHasStarted(false);
  }, [stopListening, resetTranscript]);

  if (!isSupported) {
    return null; // Hide if not supported
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "relative h-11 w-11 rounded-full transition-all duration-300",
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white scale-110"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}

        {/* Pulse rings when listening */}
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
                className="absolute inset-0 rounded-full bg-red-500"
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
                className="absolute inset-0 rounded-full bg-red-500"
              />
            </>
          )}
        </AnimatePresence>
      </Button>

      {/* Cancel button when listening */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            className="absolute -left-12 top-1/2 -translate-y-1/2"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-9 w-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Live transcription overlay that shows above the input
interface LiveTranscriptionProps {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onSend: () => void;
  onCancel: () => void;
}

export function LiveTranscription({
  isListening,
  transcript,
  interimTranscript,
  onSend,
  onCancel,
}: LiveTranscriptionProps) {
  const displayText = transcript + (interimTranscript ? ` ${interimTranscript}` : "");

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-full left-0 right-0 mb-3 mx-2"
        >
          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            {/* Header with waveform */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-red-500 rounded-full"
                      animate={{
                        height: [8, 16 + Math.random() * 8, 8],
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
                <span className="text-sm font-medium text-red-500">
                  Listening...
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSend}
                  disabled={!displayText.trim()}
                  className="h-8 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  Send
                </Button>
              </div>
            </div>

            {/* Transcription text */}
            <div className="px-4 py-4 min-h-[60px] max-h-[120px] overflow-y-auto">
              {displayText ? (
                <p className="text-[15px] leading-relaxed">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-muted-foreground/70">
                      {" "}{interimTranscript}
                    </span>
                  )}
                  <motion.span
                    animate={{ opacity: [1, 0.3] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-0.5 h-5 bg-red-500 ml-1 align-middle rounded-full"
                  />
                </p>
              ) : (
                <p className="text-muted-foreground/50 text-[15px]">
                  Start speaking...
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Standalone voice input with integrated transcription
interface VoiceInputWithTranscriptionProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputWithTranscription({
  onSubmit,
  disabled = false,
}: VoiceInputWithTranscriptionProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
  });

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      haptics.light(); // Haptic on recording stop
    } else {
      resetTranscript();
      startListening();
      haptics.medium(); // Haptic on recording start
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const handleSend = useCallback(() => {
    const text = (transcript + " " + interimTranscript).trim();
    if (text) {
      onSubmit(text);
      haptics.success(); // Haptic on successful send
    }
    stopListening();
    resetTranscript();
  }, [transcript, interimTranscript, onSubmit, stopListening, resetTranscript]);

  const handleCancel = useCallback(() => {
    stopListening();
    resetTranscript();
    haptics.light();
  }, [stopListening, resetTranscript]);

  if (!isSupported) return null;

  return (
    <div className="relative">
      {/* Live transcription overlay */}
      <LiveTranscription
        isListening={isListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        onSend={handleSend}
        onCancel={handleCancel}
      />

      {/* Mic button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "relative h-11 w-11 rounded-full transition-all duration-300",
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}

        {/* Pulse animation */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute inset-0 rounded-full bg-red-500"
            />
          )}
        </AnimatePresence>
      </Button>
    </div>
  );
}
