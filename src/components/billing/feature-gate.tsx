"use client";

import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/billing/types";

interface FeatureGateProps {
  /** Whether the user has access to this feature */
  hasAccess: boolean;
  /** The minimum tier required */
  requiredTier: PlanTier;
  /** What to display when the user has access */
  children: React.ReactNode;
  /** Callback when user taps to upgrade */
  onUpgrade: () => void;
  /** Optional label for the locked feature */
  featureLabel?: string;
  className?: string;
}

const TIER_NAMES: Record<string, string> = {
  plus: "Plus",
  pro: "Pro",
  leader: "Circle Leader",
  team: "Team",
};

/**
 * Wraps content that requires a specific plan tier.
 * Shows a blur overlay with upgrade CTA when the user doesn't have access.
 */
export function FeatureGate({
  hasAccess,
  requiredTier,
  children,
  onUpgrade,
  featureLabel,
  className,
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  const tierName = TIER_NAMES[requiredTier] || requiredTier;

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {featureLabel || "This feature"} requires {tierName}
          </p>
          <Button
            size="sm"
            className="bg-brand hover:bg-brand/90 text-brand-foreground"
            onClick={onUpgrade}
          >
            Upgrade to {tierName}
          </Button>
        </div>
      </div>
    </div>
  );
}
