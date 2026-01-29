"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, ChevronRight, Trophy, Flame, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BadgeProgressData {
  badgeId: string;
  badgeName: string;
  category: string;
  tier: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  icon?: string;
  description?: string;
}

interface BadgeProgressCardProps {
  badgeProgress: BadgeProgressData[];
  maxItems?: number;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "border-amber-700/30 bg-amber-700/10",
  silver: "border-slate-400/30 bg-slate-400/10",
  gold: "border-yellow-500/30 bg-yellow-500/10",
  platinum: "border-cyan-400/30 bg-cyan-400/10",
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  strength: Trophy,
  consistency: Flame,
  skill: Target,
};

export function BadgeProgressCard({
  badgeProgress,
  maxItems = 2,
}: BadgeProgressCardProps) {
  // Filter to badges that are in progress (not earned, has some progress)
  const inProgressBadges = badgeProgress
    .filter((b) => b.progressPercent > 0 && b.progressPercent < 100)
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, maxItems);

  if (inProgressBadges.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-energy" />
            Badge Progress
          </CardTitle>
          <Link href="/you?section=badges">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {inProgressBadges.map((badge) => (
          <BadgeProgressItem key={badge.badgeId} badge={badge} />
        ))}
      </CardContent>
    </Card>
  );
}

function BadgeProgressItem({ badge }: { badge: BadgeProgressData }) {
  const Icon = CATEGORY_ICONS[badge.category] || Award;
  const tierClass = TIER_COLORS[badge.tier] || "";

  // Format progress message
  const progressMessage = getProgressMessage(badge);

  return (
    <div className={cn("rounded-lg border p-3", tierClass)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
          {badge.icon ? (
            <span className="text-xl">{badge.icon}</span>
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{badge.badgeName}</p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {badge.tier}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {progressMessage}
          </p>
          <div className="mt-2">
            <Progress value={badge.progressPercent} className="h-1.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function getProgressMessage(badge: BadgeProgressData): string {
  const remaining = badge.targetValue - badge.currentValue;

  if (badge.category === "strength") {
    return `${remaining} lbs to go`;
  }
  if (badge.category === "consistency" && badge.badgeName.includes("Streak")) {
    return `${remaining} more days`;
  }
  if (badge.category === "consistency" && badge.badgeName.includes("Workout")) {
    return `${remaining} more workouts`;
  }
  if (badge.progressPercent >= 90) {
    return "Almost there!";
  }
  return `${Math.round(badge.progressPercent)}% complete`;
}

/**
 * Compact badge progress for home page
 */
export function BadgeProgressCompact({
  badge,
}: {
  badge: BadgeProgressData;
}) {
  const Icon = CATEGORY_ICONS[badge.category] || Award;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
        {badge.icon ? (
          <span className="text-lg">{badge.icon}</span>
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{badge.badgeName}</p>
        <Progress value={badge.progressPercent} className="h-1 mt-1" />
      </div>
      <span className="text-xs text-muted-foreground">
        {Math.round(badge.progressPercent)}%
      </span>
    </div>
  );
}
