"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Send,
  Loader2,
  Dumbbell,
  Clock,
  Zap,
  Target,
  TrendingUp,
  MessageCircle,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Quick action prompts for common requests
const QUICK_PROMPTS = [
  {
    icon: Dumbbell,
    label: "Quick Workout",
    prompt: "Generate a 30-minute full body workout I can do right now",
    color: "text-brand",
  },
  {
    icon: Clock,
    label: "15 Min HIIT",
    prompt: "Give me a 15-minute high intensity workout, no equipment needed",
    color: "text-energy",
  },
  {
    icon: Zap,
    label: "Upper Body",
    prompt: "Create an upper body strength workout for today",
    color: "text-success",
  },
  {
    icon: Target,
    label: "Core Focus",
    prompt: "Design a core-focused workout that takes about 20 minutes",
    color: "text-amber-500",
  },
  {
    icon: TrendingUp,
    label: "Progress Check",
    prompt: "Analyze my recent workouts and suggest what I should focus on next",
    color: "text-brand",
  },
  {
    icon: MessageCircle,
    label: "Need Motivation",
    prompt: "I'm struggling to stay motivated. Can you help?",
    color: "text-energy",
  },
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
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
          mode: "general",
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

  // Voice input handler (placeholder - uses Web Speech API)
  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser");
      return;
    }

    setIsListening(!isListening);
    // Voice recognition implementation would go here
  };

  return (
    <div className="relative">
      {/* Scrollable Messages Area - contained scroll */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto overscroll-contain px-4"
        style={{
          height: "calc(100vh - 56px - 80px - 70px)", // viewport - header - bottom nav - input
        }}
      >
        <div className="py-4 space-y-4 max-w-2xl mx-auto">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Welcome */}
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-brand-gradient mb-4 shadow-lg shadow-brand/20"
                  >
                    <Sparkles className="h-10 w-10 text-white" />
                  </motion.div>
                  <h1 className="text-2xl font-display tracking-wider mb-2">
                    AI COACH
                  </h1>
                  <p className="text-muted-foreground">
                    Generate workouts, get advice, track progress
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((prompt, index) => {
                      const Icon = prompt.icon;
                      return (
                        <motion.div
                          key={prompt.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                        >
                          <Card
                            className="cursor-pointer hover:border-brand/50 active:scale-[0.98] transition-all"
                            onClick={() => handleSend(prompt.prompt)}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className={cn("shrink-0", prompt.color)}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-medium">
                                {prompt.label}
                              </span>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Hint */}
                <p className="text-xs text-muted-foreground text-center pb-4">
                  Or type anything below to chat with your AI coach
                </p>
              </motion.div>
            ) : (
              messages.map((message, index) => (
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

      {/* Fixed Input Area - positioned above bottom nav */}
      <div
        className="fixed left-0 right-0 z-20 border-t border-border/50 bg-background/95 backdrop-blur-lg px-4 py-3"
        style={{ bottom: "80px" }}
      >
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          {/* Voice input button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoiceInput}
            className={cn(
              "shrink-0 h-11 w-11 rounded-full transition-colors",
              isListening && "bg-red-500/20 text-red-500"
            )}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            placeholder="Ask for a workout, advice, or anything fitness..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 min-h-[44px] max-h-[120px] resize-none py-3 pr-3 pl-4",
              "rounded-2xl border-border/50 bg-muted/50",
              "focus:bg-background focus:border-brand/50",
              "transition-all duration-200"
            )}
          />

          {/* Send button */}
          <Button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className={cn(
              "shrink-0 h-11 w-11 rounded-full transition-all",
              inputValue.trim()
                ? "bg-brand-gradient shadow-lg shadow-brand/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
