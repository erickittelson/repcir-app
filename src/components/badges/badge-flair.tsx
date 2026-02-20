"use client";

import { cn } from "@/lib/utils";
import { Medal, Star, Trophy, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FlairBadge {
  id: string;
  icon: string | null;
  name: string;
  tier: string;
}

interface BadgeFlairProps {
  badges: FlairBadge[];
  maxDisplay?: number;
  className?: string;
}

const TIER_RING_COLORS: Record<string, string> = {
  bronze: "border-amber-700/60 bg-amber-700/15",
  silver: "border-slate-400/60 bg-slate-400/15",
  gold: "border-yellow-500/60 bg-yellow-500/15",
  platinum: "border-cyan-400/60 bg-cyan-400/15",
};

const TIER_ICONS: Record<string, typeof Medal> = {
  bronze: Medal,
  silver: Star,
  gold: Trophy,
  platinum: Zap,
};

export function BadgeFlair({
  badges,
  maxDisplay = 3,
  className,
}: BadgeFlairProps) {
  if (!badges || badges.length === 0) return null;

  const displayed = badges.slice(0, maxDisplay);

  return (
    <TooltipProvider delayDuration={300}>
      <span className={cn("inline-flex items-center gap-0.5", className)}>
        {displayed.map((badge) => (
          <FlairIcon key={badge.id} badge={badge} />
        ))}
      </span>
    </TooltipProvider>
  );
}

function FlairIcon({ badge }: { badge: FlairBadge }) {
  const tierColor = TIER_RING_COLORS[badge.tier] || TIER_RING_COLORS.bronze;
  const TierIcon = TIER_ICONS[badge.tier] || Medal;
  const hasEmoji = badge.icon && badge.icon.length <= 2;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center h-4 w-4 rounded-full border shrink-0 cursor-default",
            tierColor
          )}
        >
          {hasEmoji ? (
            <span className="text-[8px] leading-none">{badge.icon}</span>
          ) : (
            <TierIcon className="h-2.5 w-2.5" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <span className="capitalize">{badge.tier}</span>: {badge.name}
      </TooltipContent>
    </Tooltip>
  );
}
