"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  Brain,
  Target,
  Heart,
  Flame,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const currentMode = COACH_MODES.find((m) => m.id === mode)!;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient">
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
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Mode Selector */}
        <div className="px-4 py-2 border-b">
          <ScrollArea className="-mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {COACH_MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <Button
                    key={m.id}
                    variant={mode === m.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "shrink-0",
                      mode === m.id && "bg-brand-gradient"
                    )}
                  >
                    <Icon className={cn("mr-1.5 h-4 w-4", mode !== m.id && m.color)} />
                    {m.label}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-brand/10 mb-4">
                  <currentMode.icon className={cn("h-8 w-8", currentMode.color)} />
                </div>
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
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 mr-2">
                      <Sparkles className="h-4 w-4 text-brand" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2",
                      message.role === "user"
                        ? "bg-brand text-white rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20">
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask your coach..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              className="min-h-[40px] max-h-[120px] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="bg-brand-gradient shrink-0 h-10 w-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
