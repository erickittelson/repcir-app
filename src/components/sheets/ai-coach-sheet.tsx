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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Loader2,
  Brain,
  Target,
  Heart,
  Flame,
  X,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type CoachMode = "general" | "motivation" | "goals" | "mental" | "nutrition";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

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
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + text }
              : m
          )
        );
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser");
      return;
    }
    setIsListening(!isListening);
  };

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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 mr-2 mt-1">
                        <Sparkles className="h-4 w-4 text-brand" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-brand text-white rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
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

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className={cn(
                  "shrink-0 h-10 w-10 rounded-full transition-all",
                  inputValue.trim()
                    ? "bg-brand-gradient shadow-lg shadow-brand/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
