"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Award, ChevronRight, Trophy, Star, Zap, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeData {
  id: string;
  badgeId: string;
  earnedAt: string;
  isFeatured: boolean;
  badge: {
    name: string;
    description?: string;
    icon?: string;
    imageUrl?: string;
    category: string;
    tier: string;
    criteriaDescription?: string;
  };
}

interface BadgeShowcaseProps {
  badges: BadgeData[];
  featuredBadges: BadgeData[];
  onToggleFeatured?: (userBadgeId: string, isFeatured: boolean) => void;
}

const TIER_COLORS = {
  bronze: "bg-amber-700/20 text-amber-700 border-amber-700/30",
  silver: "bg-slate-400/20 text-slate-500 border-slate-400/30",
  gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  platinum: "bg-cyan-400/20 text-cyan-500 border-cyan-400/30",
};

const TIER_ICONS = {
  bronze: Medal,
  silver: Star,
  gold: Trophy,
  platinum: Zap,
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
};

export function BadgeShowcase({
  badges,
  featuredBadges,
  onToggleFeatured,
}: BadgeShowcaseProps) {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);

  const totalBadges = badges.length;

  if (totalBadges === 0 && featuredBadges.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-energy" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Complete workouts, set PRs, and achieve milestones to earn badges
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-energy" />
              Badges
              <Badge variant="secondary" className="ml-2">
                {totalBadges}
              </Badge>
            </CardTitle>
            {totalBadges > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllBadges(true)}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Featured Badges */}
          {featuredBadges.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {featuredBadges.slice(0, 6).map((badge) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          )}

          {/* If no featured badges but has badges, show recent ones */}
          {featuredBadges.length === 0 && badges.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {badges.slice(0, 6).map((badge) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          )}

          {badges.length > 6 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => setShowAllBadges(true)}
            >
              See all {totalBadges} badges
            </Button>
          )}
        </CardContent>
      </Card>

      {/* All Badges Dialog */}
      <Dialog open={showAllBadges} onOpenChange={setShowAllBadges}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>All Badges ({totalBadges})</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {Object.keys(CATEGORY_LABELS).map((category) => {
                const categoryBadges = badges.filter(
                  (b) => b.badge.category === category
                );
                if (categoryBadges.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {categoryBadges.map((badge) => (
                        <BadgeItem
                          key={badge.id}
                          badge={badge}
                          onClick={() => {
                            setSelectedBadge(badge);
                            setShowAllBadges(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Badge Detail Dialog */}
      <Dialog
        open={!!selectedBadge}
        onOpenChange={(open) => !open && setSelectedBadge(null)}
      >
        <DialogContent className="max-w-sm">
          {selectedBadge && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  {selectedBadge.badge.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <BadgeIcon badge={selectedBadge} size="lg" />
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-3 capitalize",
                    TIER_COLORS[selectedBadge.badge.tier as keyof typeof TIER_COLORS]
                  )}
                >
                  {selectedBadge.badge.tier}
                </Badge>
                {selectedBadge.badge.description && (
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    {selectedBadge.badge.description}
                  </p>
                )}
                {selectedBadge.badge.criteriaDescription && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {selectedBadge.badge.criteriaDescription}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  Earned {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                </p>
                {onToggleFeatured && (
                  <Button
                    variant={selectedBadge.isFeatured ? "outline" : "default"}
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      onToggleFeatured(selectedBadge.id, !selectedBadge.isFeatured);
                      setSelectedBadge({
                        ...selectedBadge,
                        isFeatured: !selectedBadge.isFeatured,
                      });
                    }}
                  >
                    {selectedBadge.isFeatured
                      ? "Remove from Profile"
                      : "Feature on Profile"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BadgeItem({
  badge,
  onClick,
}: {
  badge: BadgeData;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <BadgeIcon badge={badge} size="sm" />
      <span className="text-xs font-medium mt-1 text-center line-clamp-2">
        {badge.badge.name}
      </span>
    </button>
  );
}

function BadgeIcon({
  badge,
  size = "sm",
}: {
  badge: BadgeData;
  size?: "sm" | "lg";
}) {
  const tier = badge.badge.tier as keyof typeof TIER_ICONS;
  const TierIcon = TIER_ICONS[tier] || Medal;
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze;

  const sizeClasses = size === "lg" ? "h-20 w-20" : "h-12 w-12";
  const iconSize = size === "lg" ? "h-10 w-10" : "h-6 w-6";

  // If badge has an icon emoji, use it
  if (badge.badge.icon && badge.badge.icon.length <= 2) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center border-2",
          tierColor,
          sizeClasses
        )}
      >
        <span className={size === "lg" ? "text-3xl" : "text-xl"}>
          {badge.badge.icon}
        </span>
      </div>
    );
  }

  // Otherwise use tier icon
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center border-2",
        tierColor,
        sizeClasses
      )}
    >
      <TierIcon className={iconSize} />
    </div>
  );
}
