"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Send,
  Loader2,
  User,
  Sparkles,
  Dumbbell,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Flame,
  AlertTriangle,
  Star,
  Zap,
  Brain,
  Heart,
  Scale,
  ClipboardCheck,
  Shield,
  MessageCircle,
  History,
  Plus,
} from "lucide-react";
import { AIUsageDashboard } from "@/components/ai/usage-dashboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CircleMember {
  id: string;
  name: string;
}

interface MemberDetails {
  id: string;
  name: string;
  goals: Array<{ id: string; title: string; status: string; category: string }>;
  limitations: Array<{ id: string; type: string; description: string }>;
  skills: Array<{ id: string; name: string; status: string }>;
  personalRecords: Array<{ id: string; exercise: string; value: number; unit: string }>;
  recentWorkouts: Array<{ id: string; name: string }>;
}

interface Conversation {
  id: string;
  mode: string;
  title: string | null;
  lastMessageAt: string;
  status: string;
}

// Coaching modes configuration
const COACHING_MODES = [
  {
    id: "general",
    name: "General Coach",
    icon: MessageCircle,
    color: "text-brand",
    bgColor: "bg-brand/10",
    description: "General fitness advice and recommendations",
  },
  {
    id: "mental_block",
    name: "Mental Blocks",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Work through fears, anxiety, and mental barriers",
  },
  {
    id: "motivation",
    name: "Motivation",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description: "Find your drive and stay motivated",
  },
  {
    id: "life_balance",
    name: "Life Balance",
    icon: Scale,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description: "Balance fitness with work, school, and life",
  },
  {
    id: "goal_setting",
    name: "Goal Setting",
    icon: Target,
    color: "text-brand",
    bgColor: "bg-brand/10",
    description: "Set meaningful, achievable goals",
  },
  {
    id: "accountability",
    name: "Accountability",
    icon: ClipboardCheck,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Stay consistent with your commitments",
  },
  {
    id: "confidence",
    name: "Confidence",
    icon: Shield,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    description: "Build self-belief and trust in yourself",
  },
];

// Parse and render AI message content beautifully
function AIMessageContent({ content }: { content: string }) {
  const renderContent = () => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let listType: "bullet" | "numbered" | null = null;
    let key = 0;

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        elements.push(
          <div key={key++} className="my-3">
            {listType === "numbered" ? (
              <div className="space-y-2">
                {currentList.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {currentList.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <CheckCircle2 className="flex-shrink-0 w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        currentList = [];
        listType = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      if (!line.trim()) {
        flushList();
        continue;
      }

      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (headerMatch) {
        flushList();
        const headerText = cleanMarkdown(headerMatch[1]);
        elements.push(
          <h3 key={key++} className="font-semibold text-base mt-4 mb-2 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            {headerText}
          </h3>
        );
        continue;
      }

      const numberedMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (numberedMatch) {
        if (listType !== "numbered") {
          flushList();
          listType = "numbered";
        }
        currentList.push(cleanMarkdown(numberedMatch[1]));
        continue;
      }

      const bulletMatch = line.match(/^[\-\*•]\s*(.+)$/);
      if (bulletMatch) {
        if (listType !== "bullet") {
          flushList();
          listType = "bullet";
        }
        currentList.push(cleanMarkdown(bulletMatch[1]));
        continue;
      }

      flushList();
      const cleanedLine = cleanMarkdown(line);
      if (cleanedLine) {
        elements.push(
          <p key={key++} className="text-sm leading-relaxed my-2">
            {cleanedLine}
          </p>
        );
      }
    }

    flushList();
    return elements;
  };

  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
  };

  return <div className="space-y-1">{renderContent()}</div>;
}

// Generate personalized prompts based on member data and mode
function generatePersonalizedPrompts(
  member: MemberDetails | null,
  mode: string
): Array<{ icon: any; text: string; color: string }> {
  // Mode-specific prompts
  const modePrompts: Record<string, Array<{ icon: any; text: string; color: string }>> = {
    mental_block: [
      { icon: Brain, text: "I'm scared to try a skill", color: "text-purple-500" },
      { icon: AlertTriangle, text: "I keep overthinking during training", color: "text-amber-500" },
      { icon: Heart, text: "I had a bad fall and now I'm scared", color: "text-red-500" },
    ],
    motivation: [
      { icon: Flame, text: "I don't feel like working out lately", color: "text-orange-500" },
      { icon: Target, text: "Help me remember why I started", color: "text-brand" },
      { icon: TrendingUp, text: "How do I stay consistent?", color: "text-green-500" },
    ],
    life_balance: [
      { icon: Scale, text: "How do I fit training into my busy schedule?", color: "text-green-500" },
      { icon: Heart, text: "I feel guilty when I miss workouts", color: "text-pink-500" },
      { icon: Calendar, text: "Help me create a realistic schedule", color: "text-brand" },
    ],
    goal_setting: [
      { icon: Target, text: "Help me set better goals", color: "text-brand" },
      { icon: TrendingUp, text: "Break down my big goal into steps", color: "text-green-500" },
      { icon: Star, text: "Am I being realistic about my goals?", color: "text-yellow-500" },
    ],
    accountability: [
      { icon: ClipboardCheck, text: "Check in on my progress", color: "text-amber-500" },
      { icon: Calendar, text: "Why do I keep skipping workouts?", color: "text-brand" },
      { icon: TrendingUp, text: "Help me track my consistency", color: "text-green-500" },
    ],
    confidence: [
      { icon: Shield, text: "I don't believe I can do it", color: "text-pink-500" },
      { icon: Star, text: "Help me with competition nerves", color: "text-yellow-500" },
      { icon: Brain, text: "I compare myself to others too much", color: "text-purple-500" },
    ],
  };

  if (mode !== "general" && modePrompts[mode]) {
    return modePrompts[mode];
  }

  // General mode - personalized based on member data
  if (!member) {
    return [
      { icon: Target, text: "How can I hit my goals?", color: "text-brand" },
      { icon: Calendar, text: "Create a weekly plan", color: "text-green-500" },
      { icon: TrendingUp, text: "What should I work on?", color: "text-purple-500" },
    ];
  }

  const prompts: Array<{ icon: any; text: string; color: string }> = [];

  // Add goal-specific prompts
  const activeGoals = member.goals?.filter(g => g.status === "active") || [];
  if (activeGoals.length > 0) {
    const goal = activeGoals[0];
    prompts.push({
      icon: Target,
      text: `How do I achieve my ${goal.title.toLowerCase()} goal?`,
      color: "text-brand",
    });
  }

  // Add limitation-aware prompts
  if (member.limitations && member.limitations.length > 0) {
    const limitation = member.limitations[0];
    prompts.push({
      icon: AlertTriangle,
      text: `Workouts that work around my ${limitation.type.toLowerCase()}`,
      color: "text-amber-500",
    });
  }

  // Add skill-specific prompts
  const learningSkills = member.skills?.filter(s => s.status === "learning") || [];
  if (learningSkills.length > 0) {
    const skill = learningSkills[0];
    prompts.push({
      icon: Star,
      text: `Help me get my ${skill.name}`,
      color: "text-yellow-500",
    });
  }

  // Add PR-based prompts
  if (member.personalRecords && member.personalRecords.length > 0) {
    const pr = member.personalRecords[0];
    if (pr.exercise && typeof pr.exercise === "string") {
      prompts.push({
        icon: Zap,
        text: `How can I improve my ${pr.exercise.toLowerCase()}?`,
        color: "text-purple-500",
      });
    }
  }

  // Fill with defaults if needed
  const defaults = [
    { icon: Calendar, text: "Create a weekly training plan", color: "text-green-500" },
    { icon: TrendingUp, text: "How am I progressing?", color: "text-indigo-500" },
    { icon: Dumbbell, text: "What should my next workout be?", color: "text-brand" },
  ];

  while (prompts.length < 3 && defaults.length > 0) {
    const def = defaults.shift()!;
    if (!prompts.some(p => p.text === def.text)) {
      prompts.push(def);
    }
  }

  return prompts.slice(0, 3);
}

// Mode selector component
function ModeSelector({
  selectedMode,
  onSelectMode,
}: {
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
      {COACHING_MODES.slice(0, 4).map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelectMode(mode.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center",
            selectedMode === mode.id
              ? `${mode.bgColor} ring-2 ring-primary/50`
              : "hover:bg-muted"
          )}
        >
          <mode.icon className={cn("w-5 h-5", mode.color)} />
          <span className="text-xs font-medium">{mode.name}</span>
        </button>
      ))}
      {COACHING_MODES.slice(4).map((mode) => (
        <button
          key={mode.id}
          onClick={() => onSelectMode(mode.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center",
            selectedMode === mode.id
              ? `${mode.bgColor} ring-2 ring-primary/50`
              : "hover:bg-muted"
          )}
        >
          <mode.icon className={cn("w-5 h-5", mode.color)} />
          <span className="text-xs font-medium">{mode.name}</span>
        </button>
      ))}
    </div>
  );
}

// Quick action pills
function QuickActions({
  prompts,
  onSelect,
  disabled,
}: {
  prompts: Array<{ icon: any; text: string; color: string }>;
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {prompts.map((suggestion) => (
        <button
          key={suggestion.text}
          onClick={() => onSelect(suggestion.text)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-secondary/50 hover:bg-secondary transition-colors",
            "text-sm font-medium",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <suggestion.icon className={cn("w-4 h-4", suggestion.color)} />
          {suggestion.text}
        </button>
      ))}
    </div>
  );
}

export default function AICoachPage() {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMode, setSelectedMode] = useState("general");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/ai/chat",
      }),
    []
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
  } = useChat({
    transport,
    onError: () => {
      toast.error("Failed to get AI response. Please try again.");
      setIsSubmitting(false);
    },
    onFinish: () => {
      setIsSubmitting(false);
    },
  });

  const isLoading = status === "streaming" || status === "submitted" || isSubmitting;

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    if (selectedMember) {
      fetchMemberDetails(selectedMember);
      fetchConversations(selectedMember);
    }
  }, [selectedMember, setMessages]);

  // Reset conversation when mode changes
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
  }, [selectedMode, setMessages]);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
        if (data.length > 0) {
          setSelectedMember(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (memberId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setMemberDetails(data);
      }
    } catch (error) {
      console.error("Failed to fetch member details:", error);
    }
  };

  const fetchConversations = async (memberId: string) => {
    try {
      const response = await fetch(`/api/coach/conversations?memberId=${memberId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsSubmitting(true);
    const message = inputValue;
    setInputValue("");

    await sendMessage(
      { text: message },
      {
        body: {
          memberId: selectedMember,
          mode: selectedMode,
          conversationId,
        },
      }
    );
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    setIsSubmitting(true);
    await sendMessage(
      { text: prompt },
      {
        body: {
          memberId: selectedMember,
          mode: selectedMode,
          conversationId,
        },
      }
    );
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const getMessageText = (message: any): string => {
    if (message.parts) {
      return message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("");
    }
    return message.content || "";
  };

  const selectedMemberName = members.find(m => m.id === selectedMember)?.name || "Member";
  const personalizedPrompts = generatePersonalizedPrompts(memberDetails, selectedMode);
  const currentMode = COACHING_MODES.find(m => m.id === selectedMode) || COACHING_MODES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading AI Coach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Coach</h1>
            <p className="text-sm text-muted-foreground">
              {currentMode.description}
            </p>
          </div>
        </div>
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AIUsageDashboard />

      {!selectedMember ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Member Selected</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Add circle members to start chatting with your AI coach
            </p>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col h-[calc(100vh-160px)] min-h-[500px] overflow-hidden">
          {/* Mode Selector */}
          <div className="border-b p-2 flex-shrink-0">
            <ModeSelector selectedMode={selectedMode} onSelectMode={setSelectedMode} />
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-4",
                  currentMode.bgColor
                )}>
                  <currentMode.icon className={cn("h-8 w-8", currentMode.color)} />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {selectedMode === "general"
                    ? `Hey ${selectedMemberName}!`
                    : currentMode.name}
                </h3>
                <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
                  {selectedMode === "general"
                    ? "I know your goals, limitations, and progress. Ask me anything!"
                    : currentMode.description}
                </p>

                <div className="w-full max-w-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Try asking
                  </p>
                  <QuickActions
                    prompts={personalizedPrompts}
                    onSelect={handleQuickPrompt}
                    disabled={isLoading}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  const text = getMessageText(message);

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        isUser ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className={cn(
                        "h-8 w-8 flex-shrink-0",
                        isUser
                          ? "bg-primary"
                          : "bg-gradient-to-br from-primary/80 to-primary/40"
                      )}>
                        <AvatarFallback className="bg-transparent text-primary-foreground">
                          {isUser ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted/70 rounded-tl-sm"
                        )}
                      >
                        {isUser ? (
                          <p className="text-sm leading-relaxed">{text}</p>
                        ) : (
                          <AIMessageContent content={text} />
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 bg-gradient-to-br from-primary/80 to-primary/40">
                      <AvatarFallback className="bg-transparent text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-background p-3 flex-shrink-0">
            {messages.length > 0 && (
              <div className="flex justify-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                  className="text-xs text-muted-foreground"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New conversation
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  selectedMode === "mental_block"
                    ? "Tell me what's on your mind..."
                    : selectedMode === "motivation"
                    ? "What's going on with your motivation?"
                    : "Ask me anything..."
                }
                disabled={isLoading}
                className="flex-1 h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-11 w-11 rounded-xl p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
