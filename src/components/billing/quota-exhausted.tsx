"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/billing/types";

interface QuotaExhaustedProps {
  type: "workout" | "chat";
  limit: number;
  currentTier: PlanTier;
  onUpgrade: () => void;
  className?: string;
}

const TIER_UPGRADE: Record<string, { name: string; highlight: string }> = {
  free: { name: "Plus", highlight: "15 AI workouts/month + unlimited chat" },
  plus: { name: "Pro", highlight: "Unlimited AI workouts + coaching memory" },
  pro: { name: "Circle Leader", highlight: "Group workouts + circle analytics" },
};

export function QuotaExhausted({
  type,
  limit,
  currentTier,
  onUpgrade,
  className,
}: QuotaExhaustedProps) {
  const upgrade = TIER_UPGRADE[currentTier] || TIER_UPGRADE.free;
  const isChat = type === "chat";

  return (
    <Card className={cn("border-amber-200 bg-amber-50/50", className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 shrink-0">
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isChat ? "Chat limit reached" : "Workout limit reached"}
            </p>
            <p className="text-xs text-muted-foreground">
              You&apos;ve used all {limit}{" "}
              {isChat ? "AI coach messages" : "AI workout generations"} this
              month.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-background border p-2.5">
          <Crown className="h-4 w-4 text-brand shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Upgrade to {upgrade.name}</p>
            <p className="text-[10px] text-muted-foreground">{upgrade.highlight}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            <Sparkles className="mr-0.5 h-2.5 w-2.5" />
            7-day trial
          </Badge>
        </div>

        <Button
          size="sm"
          className="w-full bg-brand hover:bg-brand/90 text-brand-foreground"
          onClick={onUpgrade}
        >
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}
