"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Trophy,
  Target,
  Lock,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  category: string;
  tier: string;
  criteriaDescription: string | null;
  rarity: string | null;
}

interface EarnedBadge {
  id: string;
  badgeId: string;
  earnedAt: string;
  isFeatured: boolean;
  badge: {
    name: string;
    description: string | null;
    icon: string | null;
    imageUrl: string | null;
    category: string;
    tier: string;
    criteriaDescription: string | null;
  };
}

interface BadgeProgress {
  badgeId: string;
  badgeName: string;
  category: string;
  tier: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  isEarned: boolean;
  earnedAt?: string;
}

interface AchievementsClientProps {
  userId: string;
  memberId: string | null;
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  platinum: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-500" },
  gold: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-500" },
  silver: { bg: "bg-gray-400/10", border: "border-gray-400/30", text: "text-gray-400" },
  bronze: { bg: "bg-amber-600/10", border: "border-amber-600/30", text: "text-amber-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  strength: "Strength",
  skill: "Skills",
  sport: "Sports",
  consistency: "Consistency",
  challenge: "Challenges",
  program: "Programs",
  social: "Social",
  track: "Track & Field",
  milestone: "Milestones",
};

export function AchievementsClient({ userId, memberId }: AchievementsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("earned");
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingGoal, setSettingGoal] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [earnedRes, allRes, progressRes] = await Promise.all([
        fetch("/api/badges/user"),
        fetch("/api/badges"),
        fetch("/api/badges/progress"),
      ]);

      if (earnedRes.ok) setEarnedBadges(await earnedRes.json());
      if (allRes.ok) setAllBadges(await allRes.json());
      if (progressRes.ok) setProgress(await progressRes.json());
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId));

  const handleSetGoal = async (badge: BadgeDefinition) => {
    if (!memberId) {
      toast.error("Join a circle to set goals");
      return;
    }

    setSettingGoal(badge.id);
    try {
      const progressEntry = progress.find((p) => p.badgeId === badge.id);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          title: `Earn: ${badge.name}`,
          description: badge.criteriaDescription || badge.description || `Unlock the ${badge.name} badge`,
          category: badge.category,
          targetValue: progressEntry?.targetValue || 1,
          targetUnit: "badge",
          currentValue: progressEntry?.currentValue || 0,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create goal");
      }

      toast.success(`Goal set: ${badge.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set goal");
    } finally {
      setSettingGoal(null);
    }
  };

  // Group badges by category
  const groupByCategory = <T extends { category?: string; badge?: { category: string } }>(
    items: T[],
    getCat: (item: T) => string
  ) => {
    return items.reduce((acc, item) => {
      const cat = getCat(item);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  };

  const earnedGrouped = groupByCategory(earnedBadges, (b) => b.badge.category);
  const unearnedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));
  const discoverGrouped = groupByCategory(unearnedBadges, (b) => b.category);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            {earnedBadges.length} earned of {allBadges.length} total
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-2">
        {(["bronze", "silver", "gold", "platinum"] as const).map((tier) => {
          const count = earnedBadges.filter((b) => b.badge.tier === tier).length;
          const style = TIER_STYLES[tier];
          return (
            <div
              key={tier}
              className={cn("text-center p-3 rounded-xl border", style.bg, style.border)}
            >
              <p className={cn("text-lg font-bold", style.text)}>{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{tier}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="earned" className="flex-1">
            Earned ({earnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex-1">
            Discover ({unearnedBadges.length})
          </TabsTrigger>
        </TabsList>

        {/* Earned Tab */}
        <TabsContent value="earned" className="mt-4 space-y-6">
          {earnedBadges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No badges earned yet</p>
                <p className="text-sm mt-1">
                  Complete workouts and challenges to earn achievements
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(earnedGrouped).map(([category, badges]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((badge) => {
                    const style = TIER_STYLES[badge.badge.tier] || TIER_STYLES.bronze;
                    return (
                      <Card
                        key={badge.id}
                        className={cn("overflow-hidden border", style.border)}
                      >
                        <CardContent className={cn("p-3", style.bg)}>
                          <div className="flex items-start gap-2">
                            <span className="text-2xl">{badge.badge.icon || "🏆"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {badge.badge.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground capitalize">
                                {badge.badge.tier}
                              </p>
                            </div>
                          </div>
                          {badge.badge.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {badge.badge.description}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Earned {formatDistanceToNow(new Date(badge.earnedAt), { addSuffix: true })}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="mt-4 space-y-6">
          {unearnedBadges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-3 text-success opacity-50" />
                <p className="font-medium">All badges earned!</p>
                <p className="text-sm mt-1">You've unlocked every achievement</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(discoverGrouped).map(([category, badges]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="space-y-3">
                  {badges.map((badge) => {
                    const style = TIER_STYLES[badge.tier] || TIER_STYLES.bronze;
                    const prog = progress.find((p) => p.badgeId === badge.id);
                    const percent = prog?.progressPercent || 0;

                    return (
                      <Card
                        key={badge.id}
                        className={cn("overflow-hidden border", style.border)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                                style.bg
                              )}
                            >
                              <span className="text-xl opacity-50">
                                {badge.icon || "🔒"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {badge.name}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] capitalize", style.text)}
                                >
                                  {badge.tier}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {badge.criteriaDescription || badge.description || "Complete the requirements to unlock"}
                              </p>

                              {/* Progress Bar */}
                              {prog && prog.targetValue > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                    <span>Progress</span>
                                    <span>
                                      {Math.round(prog.currentValue)}/{Math.round(prog.targetValue)}
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        percent >= 100
                                          ? "bg-success"
                                          : percent >= 50
                                          ? "bg-brand"
                                          : "bg-muted-foreground/30"
                                      )}
                                      style={{ width: `${Math.min(100, percent)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Set as Goal */}
                          {memberId && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => handleSetGoal(badge)}
                                disabled={settingGoal === badge.id}
                              >
                                {settingGoal === badge.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Target className="h-3 w-3 mr-1" />
                                )}
                                Set as Goal
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
