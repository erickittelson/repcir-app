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
import { Shield, Check, Crown } from "lucide-react";
import { ClarificationChips } from "@/components/chat/clarification-chips";
import { useBilling } from "@/hooks/use-billing";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import { QuotaExhausted } from "@/components/billing/quota-exhausted";
import { WorkoutCard } from "@/components/chat/workout-card";
import { WorkoutConfigForm } from "@/components/chat/workout-config-form";
import { GenerationLoadingCard } from "@/components/chat/generation-loading-card";
import {
  DEFAULT_WORKOUT_ACTIONS as WORKOUT_ACTIONS,
} from "@/lib/ai/structured-chat";
import type {
  ClarificationData,
  WorkoutData,
  ActionData,
  ConversationState,
  StructuredChatResponse,
  WorkoutConfigData,
  GenerationJobData,
  GeneratedWorkout,
} from "@/lib/ai/structured-chat";
import type { WorkoutConfigFormData } from "@/lib/types/workout-config";

// Extended message interface to support structured data
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "clarification" | "workout" | "mixed" | "workout_config" | "generation_pending";
  clarification?: ClarificationData;
  workout?: WorkoutData;
  workoutConfig?: WorkoutConfigData;
  generationJob?: GenerationJobData;
  actions?: ActionData[];
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

interface CoachChatProps {
  memberId: string;
}

export function CoachChat({ memberId }: CoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [quotaExhaustedType, setQuotaExhaustedType] = useState<"chat" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const billing = useBilling();

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

  // Handle structured response from API
  const handleStructuredResponse = (result: StructuredChatResponse) => {
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: result.textContent || "",
      type: result.type,
      clarification: result.clarification,
      workout: result.workout,
      workoutConfig: result.workoutConfig,
      generationJob: result.generationJob,
      actions: result.actions,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Update conversation state for clarification flow
    if (result.conversationState) {
      setConversationState(result.conversationState);
    }
  };

  // Check if response is JSON (structured) or streaming text
  const isStructuredResponse = (response: Response): boolean => {
    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json") || false;
  };

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
          memberId,
          mode: "general",
          clarificationState: conversationState,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        // Check for consent required — show modal instead of error
        if (errorText.includes("CONSENT_REQUIRED")) {
          setPendingMessage(text);
          setShowConsentModal(true);
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          return;
        }
        // Check for quota exceeded — show upgrade sheet
        if (response.status === 429) {
          setQuotaExhaustedType("chat");
          if (billing.canShowPaywall("chat-quota")) {
            setShowUpgradeSheet(true);
            billing.recordPaywallShown("chat-quota");
          }
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          return;
        }
        throw new Error(errorText || `Request failed (${response.status})`);
      }

      // Check if this is a structured response (JSON) or streaming text
      if (isStructuredResponse(response)) {
        const result: StructuredChatResponse = await response.json();
        handleStructuredResponse(result);
      } else {
        // Handle streaming text response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          type: "text",
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Clear conversation state on normal chat (not in clarification flow)
        setConversationState(null);

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
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          type: "text",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clarification chip selection
  const handleClarificationSelect = async (value: string, context: string) => {
    if (isLoading) return;

    // Add user's selection as a message (show friendly label if available)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: value,
    };

    setMessages((prev) => [...prev, userMessage]);
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
          memberId,
          mode: "general",
          clarificationState: conversationState,
          clarificationAnswer: value,
          clarificationContext: context,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Request failed (${response.status})`);
      }

      if (isStructuredResponse(response)) {
        const result: StructuredChatResponse = await response.json();
        handleStructuredResponse(result);
      } else {
        // Fallback to streaming if not structured
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          type: "text",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setConversationState(null);

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
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          type: "text",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle workout card actions
  const handleWorkoutAction = (action: string, planId?: string) => {
    if (action === "regenerate") {
      // Re-trigger the config form for modification
      handleSend("Generate me a new workout");
    }
    // Other actions handled within WorkoutCard component
  };

  // Handle workout config form submission
  const handleWorkoutConfigSubmit = async (config: WorkoutConfigFormData) => {
    // Add a summary message from the user
    const sectionLabels = config.workoutSections.map(s => s.label || s.workoutType).join(" + ");
    const summary = `Generate a ${config.duration}min ${sectionLabels} workout at ${config.intensity} intensity`;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: summary,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/generate-workout/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errorData.error || "Failed to start generation");
      }

      const { jobId } = await response.json();

      // Add generation loading message
      const loadingMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Generating your workout...",
        type: "generation_pending",
        generationJob: { jobId, estimatedSeconds: 30 },
      };
      setMessages((prev) => [...prev, loadingMessage]);
    } catch (error) {
      console.error("Workout config submit error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I couldn't start the workout generation. ${error instanceof Error ? error.message : "Please try again."}`,
          type: "text",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle generation complete — replace loading card with workout card
  const handleGenerationComplete = (messageId: string, workout: GeneratedWorkout, planId?: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content: "Here's your workout!",
              type: "workout" as const,
              workout: { data: workout, planId },
              actions: WORKOUT_ACTIONS,
              generationJob: undefined,
            }
          : m
      )
    );
  };

  // Handle generation error
  const handleGenerationError = (messageId: string, error: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content: `Generation failed: ${error}`,
              type: "text" as const,
              generationJob: undefined,
            }
          : m
      )
    );
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

  // Grant AI personalization consent
  const handleGrantConsent = async () => {
    setConsentLoading(true);
    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analytics: true,
          personalization: true,
          marketing: false,
          doNotSell: false,
        }),
      });
      if (res.ok) {
        setShowConsentModal(false);
        // Retry the pending message
        if (pendingMessage) {
          const msg = pendingMessage;
          setPendingMessage(null);
          handleSend(msg);
        }
      }
    } catch {
      // Show error in chat
    } finally {
      setConsentLoading(false);
    }
  };

  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    return (
      <div className="max-w-[85%] space-y-3">
        {/* Text content */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3",
              message.role === "user"
                ? "bg-brand text-white rounded-br-md"
                : "bg-muted rounded-bl-md"
            )}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        )}

        {/* Clarification chips */}
        {message.type === "clarification" && message.clarification && (
          <ClarificationChips
            clarification={message.clarification}
            onSelect={handleClarificationSelect}
            disabled={isLoading}
          />
        )}

        {/* Workout card */}
        {message.type === "workout" && message.workout && (
          <WorkoutCard
            workout={message.workout.data}
            planId={message.workout.planId}
            actions={message.actions || []}
            onAction={handleWorkoutAction}
            memberId={memberId}
          />
        )}

        {/* Workout config form */}
        {message.type === "workout_config" && message.workoutConfig && (
          <WorkoutConfigForm
            defaults={message.workoutConfig}
            memberId={memberId}
            onSubmit={handleWorkoutConfigSubmit}
            disabled={isLoading}
          />
        )}

        {/* Generation loading card */}
        {message.type === "generation_pending" && message.generationJob && (
          <GenerationLoadingCard
            generationId={message.generationJob.jobId}
            onComplete={(workout, planId) => handleGenerationComplete(message.id, workout, planId)}
            onError={(error) => handleGenerationError(message.id, error)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Upgrade Sheet */}
      <UpgradeSheet
        open={showUpgradeSheet}
        onOpenChange={setShowUpgradeSheet}
        currentTier={billing.tier}
        trigger="chat-quota"
      />

      {/* AI Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-2xl p-6 max-w-sm w-full shadow-2xl border"
            >
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-brand/10 mx-auto mb-4">
                <Shield className="h-7 w-7 text-brand" />
              </div>
              <h2 className="text-lg font-semibold text-center mb-2">
                Enable AI Coaching
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                To personalize workouts and coaching, we need your permission to process your fitness data with AI. Your data stays secure and is never shared.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                  Personalized workout generation
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                  Context-aware coaching advice
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                  You can disable this anytime in settings
                </li>
              </ul>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConsentModal(false);
                    setPendingMessage(null);
                  }}
                >
                  Not Now
                </Button>
                <Button
                  className="flex-1 bg-brand-gradient"
                  onClick={handleGrantConsent}
                  disabled={consentLoading}
                >
                  {consentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Enable"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {renderMessageContent(message)}
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
        {/* Quota exhausted card */}
        {quotaExhaustedType === "chat" && billing.data && (
          <div className="max-w-2xl mx-auto mb-2">
            <QuotaExhausted
              type="chat"
              limit={billing.data.usage.aiChats.limit}
              currentTier={billing.tier}
              onUpgrade={() => setShowUpgradeSheet(true)}
            />
          </div>
        )}

        {/* Usage banner for free/plus users */}
        {!billing.isLoading && billing.data && !billing.isPaid && billing.data.usage.aiChats.remaining <= 5 && billing.data.usage.aiChats.remaining > 0 && (
          <div className="max-w-2xl mx-auto mb-2">
            <button
              onClick={() => setShowUpgradeSheet(true)}
              className="flex items-center gap-2 w-full rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Crown className="h-3.5 w-3.5 shrink-0" />
              <span>{billing.data.usage.aiChats.remaining} AI coach messages left this month</span>
              <span className="ml-auto text-[10px] font-medium">Upgrade</span>
            </button>
          </div>
        )}

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
