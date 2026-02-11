"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, MessageCircle, Dumbbell, Clock } from "lucide-react";

interface UsageData {
  plan: "free" | "pro";
  workouts: { used: number; limit: number; remaining: number };
  chats: { used: number; limit: number; remaining: number };
  tokensUsed: number;
  periodEnd: string;
}

export function AIUsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((res) => res.json())
      .then((data) => setUsage(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(usage.periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const workoutPercent =
    usage.plan === "pro" ? 0 : (usage.workouts.used / usage.workouts.limit) * 100;
  const chatPercent =
    usage.plan === "pro" ? 0 : (usage.chats.used / usage.chats.limit) * 100;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          AI Usage
          <span className="ml-auto text-xs font-normal text-muted-foreground capitalize">
            {usage.plan} plan
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage.plan === "pro" ? (
          <p className="text-sm text-muted-foreground">
            Unlimited AI access with Pro plan
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="h-3.5 w-3.5" />
                  AI Workouts
                </span>
                <span className="text-muted-foreground">
                  {usage.workouts.used}/{usage.workouts.limit}
                </span>
              </div>
              <Progress value={workoutPercent} className="h-2" />
              {usage.workouts.remaining <= 1 && (
                <p className="text-xs text-amber-600">
                  {usage.workouts.remaining === 0
                    ? "Limit reached — upgrade for unlimited"
                    : "1 workout remaining"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Coach Messages
                </span>
                <span className="text-muted-foreground">
                  {usage.chats.used}/{usage.chats.limit}
                </span>
              </div>
              <Progress value={chatPercent} className="h-2" />
            </div>
          </>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Resets in {daysRemaining} days
          </span>
          <span>{formatTokens(usage.tokensUsed)} tokens used</span>
        </div>
      </CardContent>
    </Card>
  );
}
