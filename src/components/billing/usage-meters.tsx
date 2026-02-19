"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircle } from "lucide-react";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  icon?: React.ReactNode;
  className?: string;
}

const UNLIMITED = 999_999;

function UsageMeter({ label, used, limit, icon, className }: UsageMeterProps) {
  const isUnlimited = limit >= UNLIMITED;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && used >= limit;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            isAtLimit && "text-destructive",
            isNearLimit && !isAtLimit && "text-amber-500"
          )}
        >
          {isUnlimited ? "Unlimited" : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={cn(
            "h-1.5",
            isAtLimit && "[&>[data-slot=progress-indicator]]:bg-destructive",
            isNearLimit && !isAtLimit && "[&>[data-slot=progress-indicator]]:bg-amber-500"
          )}
        />
      )}
    </div>
  );
}

interface UsageMetersProps {
  aiWorkouts: { used: number; limit: number };
  aiChats: { used: number; limit: number };
  className?: string;
  compact?: boolean;
}

export function UsageMeters({ aiWorkouts, aiChats, className, compact }: UsageMetersProps) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2", className)}>
      <UsageMeter
        label="AI Workouts"
        used={aiWorkouts.used}
        limit={aiWorkouts.limit}
        icon={<Sparkles className="h-3 w-3 text-muted-foreground" />}
      />
      <UsageMeter
        label="AI Coach Messages"
        used={aiChats.used}
        limit={aiChats.limit}
        icon={<MessageCircle className="h-3 w-3 text-muted-foreground" />}
      />
    </div>
  );
}
