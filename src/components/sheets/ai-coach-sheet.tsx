"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Send,
  Brain,
  Target,
  Heart,
  Flame,
  X,
  Mic,
  MicOff,
  StopCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

type CoachMode = "general" | "motivation" | "goals" | "mental" | "nutrition";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

// Error messages based on status codes
function getErrorMessage(status: number, errorText?: string): string {
  switch (status) {
    case 429:
      return "You're sending messages too quickly. Please wait a moment and try again.";
    case 503:
      return "The AI service is temporarily unavailable. Please try again in a few seconds.";
    case 504:
      return "The request took too long. Please try a shorter question.";
    case 401:
      return "Your session has expired. Please refresh the page.";
    case 403:
      return "Please accept AI personalization consent in settings to use this feature.";
    default:
      return errorText || "Something went wrong. Please try again.";
  }
}

interface AICoachSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COACH_MODES: Array<{
  id: CoachMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { id: "general", label: "General", icon: Sparkles, color: "text-brand" },
  { id: "motivation", label: "Motivation", icon: Flame, color: "text-energy" },
  { id: "goals", label: "Goals", icon: Target, color: "text-success" },
  { id: "mental", label: "Mindset", icon: Brain, color: "text-brand" },
  { id: "nutrition", label: "Nutrition", icon: Heart, color: "text-energy" },
];

export function AICoachSheet({ open, onOpenChange }: AICoachSheetProps) {
  const [mode, setMode] = useState<CoachMode>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use the speech recognition hook
  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error: voiceError,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setInputValue((prev) => prev + text + " ");
      }
    },
    onError: (error) => {
      if (error !== "Speech recognition was aborted.") {
        setLastError(error);
      }
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopListening();
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    };
  }, [stopListening]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setLastError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Set a 60 second timeout for the entire operation
    const STREAM_TIMEOUT = 60000;
    streamTimeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, STREAM_TIMEOUT);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode,
        }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => undefined);
        const errorMessage = getErrorMessage(response.status, errorText);
        setLastError(errorMessage);
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let lastActivityTime = Date.now();

      while (true) {
        // Check if aborted
        if (signal.aborted) {
          reader.cancel();
          break;
        }

        // Create a timeout for individual reads (10s without data = stalled)
        const readPromise = reader.read();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            if (Date.now() - lastActivityTime > 10000) {
              reject(new Error("Stream stalled - no data received"));
            }
          }, 10000);
        });

        try {
          const { done, value } = await Promise.race([readPromise, timeoutPromise]);
          if (done) break;

          lastActivityTime = Date.now();
          const text = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + text }
                : m
            )
          );
        } catch (readError) {
          if (signal.aborted) break;
          throw readError;
        }
      }

      // Flush any remaining bytes
      const finalText = decoder.decode();
      if (finalText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + finalText }
              : m
          )
        );
      }
    } catch (error) {
      if (signal.aborted) {
        // User cancelled - don't show error
        return;
      }

      console.error("AI chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorMessage,
          error: true,
        },
      ]);
    } finally {
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
        streamTimeoutRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // Retry last failed message
  const retryLastMessage = useCallback(() => {
    // Find the last user message
    const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === "user");
    if (lastUserMsgIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserMsg = messages[actualIndex];

    // Remove the error message if present
    const filteredMessages = messages.filter((m, i) => i <= actualIndex || !m.error);
    setMessages(filteredMessages);

    // Re-trigger send with the last user message
    setInputValue(lastUserMsg.content);
    setTimeout(() => {
      setInputValue("");
      const fakeEvent = { target: { value: lastUserMsg.content } };
      // Directly call handleSend logic would be cleaner - but for now set input and trigger
    }, 0);
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceInput = useCallback(() => {
    if (!isVoiceSupported) {
      setLastError("Voice input is not supported in this browser");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      setLastError(null);
      startListening();
    }
  }, [isListening, isVoiceSupported, startListening, stopListening]);

  const currentMode = COACH_MODES.find((m) => m.id === mode)!;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        {/* Header - Fixed */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient shadow-lg shadow-brand/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle>AI Coach</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Your personal fitness assistant
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Error Banner */}
        <AnimatePresence>
          {lastError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-destructive/10 border-b border-destructive/20"
            >
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>{lastError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastError(null)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Selector - Fixed */}
        <div className="px-4 py-2 border-b shrink-0 bg-background/95 backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {COACH_MODES.map((m) => {
              const Icon = m.icon;
              return (
                <Button
                  key={m.id}
                  variant={mode === m.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "shrink-0 rounded-full",
                    mode === m.id && "bg-brand-gradient"
                  )}
                >
                  <Icon className={cn("mr-1.5 h-4 w-4", mode !== m.id && m.color)} />
                  {m.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Messages - Scrollable, content scrolls behind input */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 space-y-4 pb-24">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-brand/10 mb-4"
                  >
                    <currentMode.icon className={cn("h-8 w-8", currentMode.color)} />
                  </motion.div>
                  <p className="text-lg font-medium">
                    {mode === "general" && "How can I help you today?"}
                    {mode === "motivation" && "Need a motivational boost?"}
                    {mode === "goals" && "Let's work on your goals"}
                    {mode === "mental" && "Let's strengthen your mindset"}
                    {mode === "nutrition" && "Let's talk nutrition"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask me anything about fitness, workouts, or health
                  </p>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full mr-2 mt-1",
                        message.error ? "bg-destructive/20" : "bg-brand/20"
                      )}>
                        <Sparkles className={cn("h-4 w-4", message.error ? "text-destructive" : "text-brand")} />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-brand text-white rounded-br-md"
                          : message.error
                          ? "bg-destructive/10 border border-destructive/20 rounded-bl-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className={cn(
                        "text-sm whitespace-pre-wrap leading-relaxed",
                        message.error && "text-destructive"
                      )}>
                        {message.content}
                      </p>
                      {message.error && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={retryLastMessage}
                          className="mt-2 h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Try again
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20">
                    <Sparkles className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-brand/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-brand/60 animate-bounce" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input - Fixed at bottom with fade effect */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Gradient fade */}
          <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          {/* Input container */}
          <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 p-3 safe-area-inset-bottom">
            <div className="flex items-end gap-2">
              {/* Voice input */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVoiceInput}
                className={cn(
                  "shrink-0 h-10 w-10 rounded-full transition-colors",
                  isListening && "bg-red-500/20 text-red-500"
                )}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>

              {/* Text input */}
              <Textarea
                ref={textareaRef}
                placeholder="Ask your coach..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
                className={cn(
                  "flex-1 min-h-[40px] max-h-[120px] resize-none py-2.5 px-4",
                  "rounded-2xl border-border/50 bg-muted/50",
                  "focus:bg-background focus:border-brand/50",
                  "transition-all duration-200"
                )}
              />

              {/* Send / Cancel button */}
              {isLoading ? (
                <Button
                  onClick={cancelRequest}
                  size="icon"
                  variant="destructive"
                  className="shrink-0 h-10 w-10 rounded-full transition-all"
                  title="Cancel request"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  size="icon"
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-full transition-all",
                    inputValue.trim()
                      ? "bg-brand-gradient shadow-lg shadow-brand/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
