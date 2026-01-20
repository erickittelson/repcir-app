"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Pencil,
  Check,
  X,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChatBubble, StreamingChatBubble } from "@/components/chat-bubble";
import { QuickReplies } from "@/components/quick-replies";
import { LiveTranscription } from "@/components/voice-input";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  ProfilePanel,
  type ExtractedProfileData,
} from "@/components/onboarding/profile-panel";
import { ProfileReviewModal } from "@/components/onboarding/profile-review-modal";
import { BodyFatSelector } from "@/components/body-fat-selector";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Total expected profile fields for progress calculation
// Must match profile-panel.tsx: 16 fields + 2 special (limitations, personalRecords) = 18
const TOTAL_PROFILE_FIELDS = 18;

// Labels for extracted data display
const DATA_LABELS: Record<string, string> = {
  name: "Name",
  age: "Age",
  gender: "Gender",
  heightFeet: "Height",
  weight: "Weight",
  bodyFatPercentage: "Body Fat",
  fitnessLevel: "Level",
  primaryMotivation: "Goal",
  trainingFrequency: "Days/week",
  workoutDuration: "Duration",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("welcome");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedProfileData>({});
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Panel and modal state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit mode state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Body fat selector state
  const [bodyFatValue, setBodyFatValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Voice recognition
  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
  });

  // Check for mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-collapse panel on mobile
  useEffect(() => {
    if (isMobile) {
      setIsPanelCollapsed(true);
    }
  }, [isMobile]);

  // Determine if we should show the body fat selector
  // Show when in body_composition phase and AI just asked about body fat
  const showBodyFatSelector = useMemo(() => {
    if (currentPhase !== "body_composition") return false;
    if (extractedData.bodyFatPercentage !== undefined) return false;
    if (isLoading || isStreaming) return false;

    // Check if the last assistant message mentions body fat
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistantMessage) return false;

    const content = lastAssistantMessage.content.toLowerCase();
    return content.includes("body fat") ||
           content.includes("body composition") ||
           content.includes("physique") ||
           content.includes("body type");
  }, [currentPhase, extractedData.bodyFatPercentage, messages, isLoading, isStreaming]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  // Fetch initial welcome message or restore saved progress
  useEffect(() => {
    async function fetchWelcome() {
      try {
        const response = await fetch("/api/onboarding/chat");
        const data = await response.json();

        if (data.isResuming && data.conversationHistory?.length > 0) {
          const restoredMessages = data.conversationHistory.map(
            (msg: { role: string; content: string; timestamp: string }) => ({
              id: crypto.randomUUID(),
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            })
          );
          setMessages(restoredMessages);
          setCurrentPhase(data.phase || "welcome");
          setPhaseIndex(data.phaseIndex || 0);
          setExtractedData(data.extractedData || {});
          setQuickReplies(data.quickReplies || []);
        } else if (data.message) {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
            },
          ]);
          setCurrentPhase(data.phase || "welcome");
          setPhaseIndex(data.phaseIndex || 0);
          setQuickReplies(data.quickReplies || []);
        }
      } catch (err) {
        console.error("Failed to fetch welcome message:", err);
        setMessages([
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Hey! I'm your AI coach here at Workout Circle.\n\nBefore we start building workouts together, I'd love to get to know you a bit.\n\nWhat should I call you?`,
            timestamp: new Date(),
          },
        ]);
      }
    }

    fetchWelcome();
  }, []);

  // Handle sending a message
  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = messageText || inputValue.trim();
      if (!text || isLoading) return;

      setInputValue("");
      setError(null);
      setQuickReplies([]);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);
      setIsStreaming(true);
      setStreamingMessage("");

      try {
        const response = await fetch("/api/onboarding/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            currentPhase,
            extractedData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const newPhase = response.headers.get("X-Phase") || currentPhase;
        const newPhaseIndex = parseInt(
          response.headers.get("X-Phase-Index") || "0",
          10
        );
        const complete = response.headers.get("X-Is-Complete") === "true";
        const newQuickReplies = JSON.parse(
          response.headers.get("X-Quick-Replies") || "[]"
        );
        const newExtractedData = JSON.parse(
          response.headers.get("X-Extracted-Data") || "{}"
        );

        setCurrentPhase(newPhase);
        setPhaseIndex(newPhaseIndex);
        setIsComplete(complete);
        setExtractedData((prev) => ({ ...prev, ...newExtractedData }));

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullMessage = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullMessage += chunk;
          setStreamingMessage(fullMessage);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: fullMessage,
            timestamp: new Date(),
          },
        ]);
        setStreamingMessage("");
        setIsStreaming(false);

        setTimeout(() => {
          setQuickReplies(newQuickReplies);
        }, 300);

        // Show review modal instead of auto-completing
        if (complete) {
          setShowReviewModal(true);
        }
      } catch (err) {
        console.error("Chat error:", err);
        setError("Something went wrong. Please try again.");
        setStreamingMessage("");
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading, messages, currentPhase, extractedData]
  );

  // Handle completing onboarding via review modal
  const handleConfirmProfile = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractedData),
      });

      if (!response.ok) {
        console.error("Failed to save profile");
      }

      setShowReviewModal(false);
      setIsComplete(true);

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle quick reply selection
  const handleQuickReply = (option: string) => {
    handleSend(option);
  };

  // Handle body fat selector selection
  const handleBodyFatSelection = useCallback((action: "select" | "skip") => {
    if (action === "skip") {
      handleSend("I'm not sure about my body fat percentage, let's skip this for now");
    } else if (bodyFatValue) {
      handleSend(`My body fat is around ${bodyFatValue}%`);
      // Reset the value after sending
      setBodyFatValue("");
    }
  }, [bodyFatValue, handleSend]);

  // Voice handlers
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const handleVoiceSend = useCallback(() => {
    const text = (transcript + " " + interimTranscript).trim();
    if (text) {
      handleSend(text);
    }
    stopListening();
    resetTranscript();
  }, [transcript, interimTranscript, handleSend, stopListening, resetTranscript]);

  const handleVoiceCancel = useCallback(() => {
    stopListening();
    resetTranscript();
  }, [stopListening, resetTranscript]);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  // Edit field handlers
  const handleStartEdit = (key: string, value: unknown) => {
    setEditingField(key);
    setEditValue(String(value));
  };

  const handleSaveEdit = () => {
    if (editingField && editValue.trim()) {
      setExtractedData((prev) => ({
        ...prev,
        [editingField]: editValue.trim(),
      }));
      const label = DATA_LABELS[editingField] || editingField;
      handleSend(`Actually, my ${label.toLowerCase()} is ${editValue.trim()}`);
    }
    setEditingField(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  // Calculate progress based on filled fields (must match profile-panel.tsx exactly)
  // Profile panel tracks these specific fields across phases
  const trackedFields: (keyof ExtractedProfileData)[] = [
    // welcome
    "name", "primaryMotivation",
    // basics
    "age", "gender", "heightFeet", "weight",
    // fitness_background
    "fitnessLevel", "trainingFrequency", "currentActivity",
    // goals
    "primaryGoal", "timeline",
    // body_composition
    "bodyFatPercentage", "targetWeight",
    // preferences
    "workoutDuration", "equipmentAccess", "workoutDays",
  ];
  const filledFieldsCount = trackedFields.filter(
    (k) => extractedData[k] !== undefined
  ).length;
  // Add special fields (limitations + personalRecords count as 1 each if they have items)
  const specialFieldsCount =
    (extractedData.limitations?.length ? 1 : 0) +
    (extractedData.personalRecords?.length ? 1 : 0);
  const progressPercent = Math.round(((filledFieldsCount + specialFieldsCount) / TOTAL_PROFILE_FIELDS) * 100);

  return (
    <div className="flex h-[100dvh] bg-background mesh-gradient">
      {/* Side Panel - Hidden on mobile, shown on desktop */}
      <AnimatePresence mode="wait">
        {!isMobile && (
          <ProfilePanel
            data={extractedData}
            currentPhase={currentPhase}
            onEdit={handleStartEdit}
            onReviewClick={() => setShowReviewModal(true)}
            isCollapsed={isPanelCollapsed}
            onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          />
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border/30 glass">
          <div className="px-4 py-3 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              {/* Left side - toggle and logo */}
              <div className="flex items-center gap-3">
                {/* Panel toggle for desktop */}
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                    className="h-9 w-9 rounded-xl"
                  >
                    {isPanelCollapsed ? (
                      <PanelLeft className="w-4 h-4" />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" />
                    )}
                  </Button>
                )}

                <div className="w-10 h-10 rounded-2xl bg-energy-gradient flex items-center justify-center shadow-lg glow-brand">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">AI Coach</h1>
                  <p className="text-xs text-muted-foreground">
                    Setting up your profile
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {Math.round(progressPercent)}%
                </span>
                <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-energy-gradient rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>

                {/* Mobile: Show profile button */}
                {isMobile && Object.keys(extractedData).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReviewModal(true)}
                    className="h-8 px-3 rounded-xl bg-brand/10 text-brand hover:bg-brand/20"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Review
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Chat area */}
        <main
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Messages */}
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message.content}
                    isUser={message.role === "user"}
                    timestamp={message.timestamp}
                  />
                ))}
              </AnimatePresence>

              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <StreamingChatBubble
                  message={streamingMessage}
                  isComplete={false}
                />
              )}

              {/* Body Fat Selector - show when in body composition phase */}
              {showBodyFatSelector && !isLoading && !isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="my-4 mx-auto max-w-md"
                >
                  <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-lg">
                    <BodyFatSelector
                      value={bodyFatValue}
                      onChange={setBodyFatValue}
                      gender={extractedData.gender}
                    />
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleBodyFatSelection("skip")}
                      >
                        Skip for now
                      </Button>
                      <Button
                        className="flex-1 bg-brand hover:bg-brand/90"
                        onClick={() => handleBodyFatSelection("select")}
                        disabled={!bodyFatValue}
                      >
                        Confirm {bodyFatValue ? `${bodyFatValue}%` : ""}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Typing indicator */}
              {isLoading && !streamingMessage && (
                <ChatBubble message="" isUser={false} isTyping />
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-destructive py-4"
                >
                  {error}
                </motion.div>
              )}

              {/* Completion */}
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-gradient mb-4 glow-success"
                  >
                    <Check className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2">You're all set!</h3>
                  <p className="text-muted-foreground">
                    Taking you to your dashboard...
                  </p>
                </motion.div>
              )}
            </div>

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Quick replies */}
        <AnimatePresence>
          {quickReplies.length > 0 && !isLoading && !isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-shrink-0 max-w-2xl mx-auto w-full"
            >
              <QuickReplies
                options={quickReplies}
                onSelect={handleQuickReply}
                disabled={isLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <footer className="flex-shrink-0 border-t border-border/30 glass">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="relative">
              {/* Live transcription */}
              <LiveTranscription
                isListening={isListening}
                transcript={transcript}
                interimTranscript={interimTranscript}
                onSend={handleVoiceSend}
                onCancel={handleVoiceCancel}
              />

              {/* Input form */}
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                {/* Voice button */}
                {isVoiceSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceToggle}
                    disabled={isLoading || isComplete}
                    className={cn(
                      "relative h-12 w-12 rounded-2xl transition-all duration-300 flex-shrink-0",
                      isListening
                        ? "bg-brand text-white shadow-lg"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {isListening ? (
                      <motion.div className="flex items-center gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-white rounded-full"
                            animate={{ height: [8, 16, 8] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </motion.div>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </Button>
                )}

                {/* Text input */}
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      isComplete
                        ? "All done!"
                        : isListening
                        ? "Listening..."
                        : "Type your message..."
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading || isComplete || isListening}
                    className={cn(
                      "w-full h-12 px-5 pr-14 rounded-2xl",
                      "bg-surface border border-border/50",
                      "text-[15px] text-foreground placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-all duration-200"
                    )}
                  />

                  {/* Send button */}
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim() || isLoading || isComplete}
                    className={cn(
                      "absolute right-1.5 top-1/2 -translate-y-1/2",
                      "h-9 w-9 rounded-xl",
                      "bg-energy-gradient",
                      "hover:opacity-90",
                      "disabled:opacity-30 disabled:cursor-not-allowed",
                      "shadow-lg glow-brand",
                      "transition-all duration-200"
                    )}
                  >
                    <ArrowUp className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </footer>
      </div>

      {/* Review Modal */}
      <ProfileReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onConfirm={handleConfirmProfile}
        onEdit={(key, value) => {
          setShowReviewModal(false);
          handleStartEdit(key, value);
        }}
        data={extractedData}
        isSubmitting={isSubmitting}
      />

      {/* Edit field modal */}
      <AnimatePresence>
        {editingField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCancelEdit}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border/50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-lg">
                  Edit {DATA_LABELS[editingField] || editingField}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-5">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className={cn(
                    "w-full h-12 px-4 rounded-xl",
                    "bg-surface border border-border/50",
                    "text-[15px] text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50",
                    "transition-all duration-200"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  I'll let Coach know about this change
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-5 pt-0">
                <Button
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editValue.trim()}
                  className="flex-1 h-11 rounded-xl bg-energy-gradient hover:opacity-90"
                >
                  Save & Update
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
