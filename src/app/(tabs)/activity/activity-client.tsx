"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Dumbbell,
  Target,
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  Flame,
  Star,
  ChevronRight,
  Plus,
  Sparkles,
  Play,
  Award,
  Medal,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Date range filter type
type DateRange = "7d" | "30d" | "90d" | "all";

// Trend indicator component
function TrendIndicator({ 
  current, 
  previous, 
  suffix = ""
}: { 
  current: number; 
  previous: number;
  suffix?: string;
}) {
  const diff = current - previous;
  const percentChange = previous > 0 ? ((diff / previous) * 100).toFixed(0) : 0;
  
  if (diff === 0) {
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <Minus className="h-3 w-3 mr-0.5" />
        No change
      </span>
    );
  }
  
  if (diff > 0) {
    return (
      <span className="flex items-center text-xs text-green-600">
        <ArrowUpRight className="h-3 w-3" />
        +{diff}{suffix} ({percentChange}%)
      </span>
    );
  }
  
  return (
    <span className="flex items-center text-xs text-red-500">
      <ArrowDownRight className="h-3 w-3" />
      {diff}{suffix} ({percentChange}%)
    </span>
  );
}

interface BadgeData {
  id: string;
  badgeId: string;
  earnedAt: string;
  badge: {
    name: string;
    description?: string;
    icon?: string;
    category: string;
    tier: string;
  };
  metadata?: {
    prValue?: number;
    challengeName?: string;
    programName?: string;
  };
}

interface BadgeProgressData {
  badgeId: string;
  badgeName: string;
  category: string;
  tier: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  icon?: string;
}

interface ActivityPageProps {
  stats: {
    totalWorkouts: number;
    totalMinutes: number;
    activeGoalsCount: number;
    personalRecordsCount: number;
    badgeCount?: number;
  };
  workoutHistory: Array<{
    id: string;
    name: string;
    startedAt: string;
    endedAt?: string;
    status: string;
    rating?: number;
    category?: string;
  }>;
  savedPlans: Array<{
    id: string;
    name: string;
    category?: string;
    difficulty?: string;
    estimatedDuration?: number;
    isAiGenerated: boolean;
  }>;
  goals: Array<{
    id: string;
    name: string;
    type: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    deadline?: string;
  }>;
  challenges: Array<{
    id: string;
    name: string;
    category: string;
    durationDays: number;
    completedDays: number;
    currentStreak: number;
    status: string;
  }>;
  personalRecords: Array<{
    id: string;
    exerciseName: string;
    value: number;
    unit: string;
    setAt: string;
  }>;
  programs?: Array<{
    id: string;
    programId: string;
    name: string;
    category: string;
    currentWeek: number;
    currentDay: number;
    workoutsCompleted: number;
    totalWorkouts: number;
    durationWeeks: number;
    daysPerWeek: number;
    startDate?: string;
  }>;
  badges?: BadgeData[];
  badgeProgress?: BadgeProgressData[];
}

export function ActivityPage({
  stats,
  workoutHistory,
  savedPlans,
  goals,
  challenges,
  personalRecords,
  programs = [],
  badges = [],
  badgeProgress = [],
}: ActivityPageProps) {
  const [activeTab, setActiveTab] = useState("today");
  const [historyDateRange, setHistoryDateRange] = useState<DateRange>("30d");

  // Filter workout history by date range
  const filteredHistory = useMemo(() => {
    if (historyDateRange === "all") return workoutHistory;
    
    const now = new Date();
    const days = historyDateRange === "7d" ? 7 : historyDateRange === "30d" ? 30 : 90;
    const cutoff = new Date(now.setDate(now.getDate() - days));
    
    return workoutHistory.filter(w => new Date(w.startedAt) >= cutoff);
  }, [workoutHistory, historyDateRange]);

  // Calculate comparison stats (mock previous period data for now)
  const previousPeriodStats = useMemo(() => ({
    totalWorkouts: Math.floor(stats.totalWorkouts * 0.85),
    totalMinutes: Math.floor(stats.totalMinutes * 0.9),
    activeGoalsCount: stats.activeGoalsCount,
    personalRecordsCount: Math.max(0, stats.personalRecordsCount - 2),
  }), [stats]);

  // Export data function
  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      stats,
      workoutHistory: filteredHistory.map(w => ({
        name: w.name,
        date: w.startedAt,
        status: w.status,
        rating: w.rating,
        category: w.category,
      })),
      goals: goals.map(g => ({
        name: g.name,
        type: g.type,
        target: g.targetValue,
        current: g.currentValue,
        unit: g.unit,
      })),
      personalRecords: personalRecords.map(pr => ({
        exercise: pr.exerciseName,
        value: pr.value,
        unit: pr.unit,
        date: pr.setAt,
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitness-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Data exported successfully!");
  };

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">Your fitness journey</p>
        </div>
        <Link href="/workout/new">
          <Button className="bg-brand-gradient">
            <Plus className="mr-2 h-4 w-4" />
            Workout
          </Button>
        </Link>
      </div>

      {/* Stats Overview with Trends */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
                <Dumbbell className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
                <TrendIndicator 
                  current={stats.totalWorkouts} 
                  previous={previousPeriodStats.totalWorkouts}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-energy/20">
                <Clock className="h-5 w-5 text-energy" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMinutes}</p>
                <p className="text-xs text-muted-foreground">Minutes Active</p>
                <TrendIndicator 
                  current={stats.totalMinutes} 
                  previous={previousPeriodStats.totalMinutes}
                  suffix="m"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeGoalsCount}</p>
                <p className="text-xs text-muted-foreground">Active Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.personalRecordsCount}</p>
                <p className="text-xs text-muted-foreground">Personal Records</p>
                <TrendIndicator 
                  current={stats.personalRecordsCount} 
                  previous={previousPeriodStats.personalRecordsCount}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="-mx-4 px-4">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="today" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5">
              <Dumbbell className="h-4 w-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1.5">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-1.5">
              <Trophy className="h-4 w-4" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-1.5">
              <Award className="h-4 w-4" />
              Badges
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Today Tab */}
        <TabsContent value="today" className="space-y-6 mt-6">
          {/* Quick Start */}
          <section>
            <h3 className="mb-3 font-semibold">Quick Start</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/workout/new">
                <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                    <p className="font-medium">Empty Workout</p>
                    <p className="text-xs text-muted-foreground">Start tracking</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workout/generate">
                <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-energy/20">
                      <Sparkles className="h-6 w-6 text-energy" />
                    </div>
                    <p className="font-medium">AI Generate</p>
                    <p className="text-xs text-muted-foreground">Smart workout</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Active Goals Preview */}
          {goals.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Active Goals</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("goals")}
                >
                  See all <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {goals.slice(0, 2).map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )}

          {/* Recent PRs */}
          {personalRecords.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-energy" />
                Recent PRs
              </h3>
              <ScrollArea className="-mx-4 px-4">
                <div className="flex gap-3 pb-4">
                  {personalRecords.slice(0, 5).map((pr) => (
                    <Card key={pr.id} className="w-40 shrink-0">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground truncate">
                          {pr.exerciseName}
                        </p>
                        <p className="text-lg font-bold">
                          {pr.value} {pr.unit}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(pr.setAt)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </section>
          )}

          {/* Active Challenges */}
          {challenges.filter((c) => c.status === "active").length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-energy" />
                  Active Challenges
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("challenges")}
                >
                  See all <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {challenges
                  .filter((c) => c.status === "active")
                  .slice(0, 2)
                  .map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
              </div>
            </section>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {/* Date Range Filter */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredHistory.length} workout{filteredHistory.length !== 1 ? "s" : ""}
            </p>
            <Select value={historyDateRange} onValueChange={(v) => setHistoryDateRange(v as DateRange)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No workout history"
              description="Complete your first workout to see it here"
            />
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((workout) => (
                <WorkoutHistoryCard key={workout.id} workout={workout} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4 mt-6">
          <div className="flex gap-3 mb-4">
            <Link href="/workout/new" className="flex-1">
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </Link>
            <Link href="/workout/generate" className="flex-1">
              <Button variant="outline" className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Generate
              </Button>
            </Link>
          </div>

          {savedPlans.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No saved plans"
              description="Create or save workout plans to use them later"
            />
          ) : (
            <div className="space-y-3">
              {savedPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4 mt-6">
          <Link href="/you?section=goals&action=new">
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </Link>

          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No active goals"
              description="Set goals to track your progress"
            />
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4 mt-6">
          <Link href="/discover?tab=challenges">
            <Button variant="outline" className="w-full">
              <Trophy className="mr-2 h-4 w-4" />
              Browse Challenges
            </Button>
          </Link>

          {challenges.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No challenges"
              description="Join challenges to compete and stay motivated"
            />
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-6 mt-6">
          {/* Badge Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-energy/20">
                    <Award className="h-5 w-5 text-energy" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{badges.length}</p>
                    <p className="text-xs text-muted-foreground">Badges Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
                    <TrendingUp className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {badgeProgress.filter((b) => b.progressPercent > 0 && b.progressPercent < 100).length}
                    </p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Badges */}
          <section>
            <h3 className="mb-3 font-semibold">Recently Earned</h3>
            {badges.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No badges yet"
                description="Complete workouts, set PRs, and achieve milestones to earn badges"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {badges.slice(0, 4).map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            )}
            {badges.length > 4 && (
              <Link href="/you?section=badges">
                <Button variant="outline" className="w-full mt-3">
                  View All Badges
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            )}
          </section>

          {/* Badge Progress */}
          {badgeProgress.filter((b) => b.progressPercent > 0 && b.progressPercent < 100).length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold">Progress Toward Badges</h3>
              <div className="space-y-3">
                {badgeProgress
                  .filter((b) => b.progressPercent > 0 && b.progressPercent < 100)
                  .sort((a, b) => b.progressPercent - a.progressPercent)
                  .slice(0, 3)
                  .map((progress) => (
                    <BadgeProgressItem key={progress.badgeId} progress={progress} />
                  ))}
              </div>
            </section>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalCard({ goal }: { goal: ActivityPageProps["goals"][0] }) {
  const progress =
    goal.targetValue > 0
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
          <Badge variant="secondary">{Math.round(progress)}%</Badge>
        </div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </span>
          {goal.deadline && <span>Due {formatDate(goal.deadline)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChallengeCard({
  challenge,
}: {
  challenge: ActivityPageProps["challenges"][0];
}) {
  const progress = (challenge.completedDays / challenge.durationDays) * 100;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-energy" />
            <span className="font-medium">{challenge.name}</span>
          </div>
          <Badge
            variant={challenge.status === "active" ? "default" : "secondary"}
          >
            {challenge.status}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Day {challenge.completedDays} of {challenge.durationDays}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-energy" />
            {challenge.currentStreak} day streak
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkoutHistoryCard({
  workout,
}: {
  workout: ActivityPageProps["workoutHistory"][0];
}) {
  const duration =
    workout.endedAt && workout.startedAt
      ? Math.round(
          (new Date(workout.endedAt).getTime() -
            new Date(workout.startedAt).getTime()) /
            1000 /
            60
        )
      : 0;

  return (
    <Link href={`/workout/${workout.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20">
            <Dumbbell className="h-5 w-5 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{workout.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(workout.startedAt)}</span>
              {duration > 0 && <span>· {duration} min</span>}
              {workout.rating && (
                <span className="flex items-center gap-0.5">
                  · <Star className="h-3 w-3 fill-energy text-energy" />
                  {workout.rating}
                </span>
              )}
            </div>
          </div>
          <Badge
            variant={workout.status === "completed" ? "secondary" : "outline"}
          >
            {workout.status}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

function PlanCard({ plan }: { plan: ActivityPageProps["savedPlans"][0] }) {
  return (
    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20">
          {plan.isAiGenerated ? (
            <Sparkles className="h-5 w-5 text-brand" />
          ) : (
            <Dumbbell className="h-5 w-5 text-brand" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{plan.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {plan.category && <span>{plan.category}</span>}
            {plan.estimatedDuration && <span>· {plan.estimatedDuration} min</span>}
          </div>
        </div>
        <Button size="sm">Start</Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-700/10 border-amber-700/30 text-amber-700",
  silver: "bg-slate-400/10 border-slate-400/30 text-slate-500",
  gold: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600",
  platinum: "bg-cyan-400/10 border-cyan-400/30 text-cyan-500",
};

function BadgeCard({ badge }: { badge: BadgeData }) {
  const tierClass = TIER_COLORS[badge.badge.tier] || "";

  return (
    <Card className={cn("border", tierClass)}>
      <CardContent className="p-4 text-center">
        <div className="flex justify-center mb-2">
          {badge.badge.icon ? (
            <span className="text-3xl">{badge.badge.icon}</span>
          ) : (
            <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center">
              <Medal className="h-6 w-6" />
            </div>
          )}
        </div>
        <p className="font-medium text-sm truncate">{badge.badge.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(badge.earnedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
        <Badge variant="outline" className="mt-2 text-[10px] capitalize">
          {badge.badge.tier}
        </Badge>
      </CardContent>
    </Card>
  );
}

function BadgeProgressItem({ progress }: { progress: BadgeProgressData }) {
  const tierClass = TIER_COLORS[progress.tier] || "";

  return (
    <Card className={cn("border", tierClass)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background flex-shrink-0">
            {progress.icon ? (
              <span className="text-xl">{progress.icon}</span>
            ) : (
              <Award className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm truncate">{progress.badgeName}</p>
              <span className="text-xs text-muted-foreground">
                {Math.round(progress.progressPercent)}%
              </span>
            </div>
            <Progress value={progress.progressPercent} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progress.currentValue} / {progress.targetValue}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
