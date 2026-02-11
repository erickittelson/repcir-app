"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Flame,
  Target,
  Dumbbell,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Trophy,
  MessageSquare,
  Clock,
  Zap,
  X,
  Lightbulb,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeProgressCard } from "@/components/badges/badge-progress-card";

interface HomeFeedProps {
  user: {
    name: string;
    image?: string;
  };
  stats: {
    workoutsThisWeek: number;
    currentStreak: number;
    activeGoalsCount: number;
  };
  /** Whether user has group circles (non-system). If false, show a join/create prompt */
  hasGroupCircles?: boolean;
  activeGoals: Array<{
    id: string;
    name: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    type: string;
  }>;
  recentWorkouts: Array<{
    id: string;
    name: string;
    completedAt: string;
    duration: number;
    status: string;
  }>;
  activityFeed: Array<{
    id: string;
    userId: string;
    activityType: string;
    entityType?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
  completeness?: {
    overallPercent: number;
    hasEquipment: boolean;
    recommendations: Array<{
      id: string;
      message: string;
      action: string;
      actionUrl: string;
    }>;
  };
  badgeProgress?: Array<{
    badgeId: string;
    badgeName: string;
    category: string;
    tier: string;
    currentValue: number;
    targetValue: number;
    progressPercent: number;
    icon?: string;
  }>;
}

export function HomeFeed({
  user,
  stats,
  activeGoals,
  recentWorkouts,
  activityFeed,
  completeness,
  badgeProgress,
  hasGroupCircles = true,
}: HomeFeedProps) {
  const greeting = getGreeting();
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());

  const handleDismissPrompt = (promptId: string) => {
    setDismissedPrompts((prev) => new Set(prev).add(promptId));
    // Optionally persist this dismissal
    fetch("/api/user/completeness/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId }),
    }).catch(() => {});
  };

  // Filter out dismissed prompts
  const activePrompts = completeness?.recommendations.filter(
    (r) => !dismissedPrompts.has(r.id)
  ) || [];

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Personalized Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {greeting}, {user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          {getMotivationalMessage(stats)}
        </p>
      </div>

      {/* Smart Prompts - Profile Completeness */}
      {activePrompts.length > 0 && (
        <SmartPromptBanner
          prompt={activePrompts[0]}
          onDismiss={() => handleDismissPrompt(activePrompts[0].id)}
        />
      )}

      {/* Join/Create Circle Prompt for solo users */}
      {!hasGroupCircles && (
        <Card className="border-brand/20 bg-gradient-to-r from-brand/5 to-energy/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20">
                <Users className="h-5 w-5 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Train with others</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Join or create a circle to train with friends and stay accountable together.
                </p>
                <div className="flex gap-2 mt-3">
                  <Link href="/discover">
                    <Button size="sm" variant="secondary">Discover</Button>
                  </Link>
                  <Link href="/circles">
                    <Button size="sm" className="bg-brand-gradient">Create Circle</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Focus Card */}
      <TodaysFocusCard stats={stats} />

      {/* Quick Actions Strip */}
      <QuickActionsStrip />

      {/* Stats Overview */}
      <StatsRow stats={stats} />

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Goals</h2>
            <Link href="/activity?tab=goals">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                See all <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {activeGoals.slice(0, 2).map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}

      {/* Badge Progress */}
      {badgeProgress && badgeProgress.length > 0 && (
        <BadgeProgressCard badgeProgress={badgeProgress} maxItems={2} />
      )}

      {/* Activity Feed */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Activity</h2>
        </div>
        {activityFeed.length > 0 ? (
          <div className="space-y-3">
            {activityFeed.slice(0, 10).map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No activity yet. Complete a workout or invite your circle to see updates here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function TodaysFocusCard({ stats }: { stats: HomeFeedProps["stats"] }) {
  // AI-suggested focus for today
  const suggestedWorkout =
    stats.workoutsThisWeek < 3 ? "Upper Body Strength" : "Active Recovery";

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-brand/20 via-energy/10 to-transparent border-brand/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-xs font-medium text-brand">
                AI Recommended
              </span>
            </div>
            <h3 className="text-lg font-semibold">Today&apos;s Focus</h3>
            <p className="text-2xl font-bold">{suggestedWorkout}</p>
            <p className="text-sm text-muted-foreground">
              Based on your recent activity and goals
            </p>
          </div>
          <Button className="bg-brand-gradient hover:opacity-90">
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsStrip() {
  const actions = [
    {
      icon: Dumbbell,
      label: "Quick Workout",
      href: "/workout/new",
      gradient: true,
    },
    {
      icon: Sparkles,
      label: "AI Generate",
      href: "/workout/generate",
    },
    {
      icon: Clock,
      label: "Log Workout",
      href: "/workout/log",
    },
    {
      icon: MessageSquare,
      label: "AI Coach",
      href: "/coach",
    },
  ];

  return (
    <ScrollArea className="-mx-4 px-4">
      <div className="flex gap-3 pb-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <div
                className={cn(
                  "flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all hover:scale-105 active:scale-95",
                  action.gradient
                    ? "border-0 bg-brand-gradient text-white"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] font-medium text-center leading-tight">
                  {action.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function StatsRow({ stats }: { stats: HomeFeedProps["stats"] }) {
  const statItems = [
    {
      icon: Dumbbell,
      value: stats.workoutsThisWeek,
      label: "This Week",
      color: "text-brand",
    },
    {
      icon: Flame,
      value: stats.currentStreak,
      label: "Day Streak",
      color: "text-energy",
    },
    {
      icon: Target,
      value: stats.activeGoalsCount,
      label: "Active Goals",
      color: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {statItems.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <Icon className={cn("mx-auto h-5 w-5", stat.color)} />
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GoalCard({
  goal,
}: {
  goal: HomeFeedProps["activeGoals"][0];
}) {
  const progress = goal.targetValue > 0
    ? Math.min((goal.currentValue / goal.targetValue) * 100, 100)
    : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" />
            <span className="font-medium">{goal.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {Math.round(progress)}%
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {goal.currentValue} / {goal.targetValue} {goal.unit}
        </p>
      </CardContent>
    </Card>
  );
}

function ActivityCard({
  activity,
}: {
  activity: HomeFeedProps["activityFeed"][0];
}) {
  const { icon: Icon, text, color } = getActivityDisplay(activity);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            color
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{text}</p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(activity.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivationalMessage(stats: HomeFeedProps["stats"]): string {
  if (stats.currentStreak >= 7) {
    return "Amazing streak! Keep the momentum going!";
  }
  if (stats.workoutsThisWeek >= 3) {
    return "Great progress this week! You're crushing it.";
  }
  if (stats.workoutsThisWeek === 0) {
    return "Ready to start your week strong?";
  }
  return "Let's keep building those healthy habits!";
}

function getActivityDisplay(activity: HomeFeedProps["activityFeed"][0]) {
  switch (activity.activityType) {
    case "workout_completed":
      return {
        icon: Dumbbell,
        text: "Completed a workout",
        color: "bg-brand/20 text-brand",
      };
    case "goal_achieved":
      return {
        icon: Trophy,
        text: "Achieved a goal",
        color: "bg-success/20 text-success",
      };
    case "pr_set":
      return {
        icon: TrendingUp,
        text: "Set a new personal record",
        color: "bg-energy/20 text-energy",
      };
    case "joined_circle":
      return {
        icon: Zap,
        text: "Joined a new circle",
        color: "bg-brand/20 text-brand",
      };
    default:
      return {
        icon: Zap,
        text: "Activity",
        color: "bg-muted text-muted-foreground",
      };
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function SmartPromptBanner({
  prompt,
  onDismiss,
}: {
  prompt: {
    id: string;
    message: string;
    action: string;
    actionUrl: string;
  };
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-brand/10 border border-brand/20">
      <div className="flex items-center gap-3 min-w-0">
        <Lightbulb className="h-5 w-5 text-brand flex-shrink-0" />
        <p className="text-sm text-brand truncate">{prompt.message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={prompt.actionUrl}>
          <Button size="sm" variant="secondary">
            {prompt.action}
          </Button>
        </Link>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-brand/10 transition-colors"
        >
          <X className="h-4 w-4 text-brand" />
        </button>
      </div>
    </div>
  );
}
