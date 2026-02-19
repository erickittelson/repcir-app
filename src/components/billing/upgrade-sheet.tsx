"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/posthog/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/billing/types";

interface UpgradeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: PlanTier;
  trigger?: string;
  suggestedTier?: PlanTier;
}

const UPGRADE_OPTIONS: Record<
  string,
  {
    tier: PlanTier;
    name: string;
    price: string;
    headline: string;
    features: string[];
    icon: React.ReactNode;
  }
> = {
  plus: {
    tier: "plus",
    name: "Plus",
    price: "$6.99/mo",
    headline: "Unlock more AI workouts and circles",
    features: [
      "15 AI workouts per month",
      "Unlimited AI coach messages",
      "Join up to 3 circles",
      "Save community workouts",
      "Workout calendar scheduling",
    ],
    icon: <Sparkles className="h-5 w-5" />,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    price: "$12.99/mo",
    headline: "Your AI personal trainer that knows you",
    features: [
      "Unlimited AI workouts",
      "AI coaching memory",
      "Unlimited circles",
      "Advanced analytics",
      "Custom workout builder",
      "Priority AI model",
    ],
    icon: <Zap className="h-5 w-5" />,
  },
  leader: {
    tier: "leader",
    name: "Circle Leader",
    price: "$19.99/mo",
    headline: "Lead your community with AI-powered tools",
    features: [
      "Everything in Pro",
      "Create unlimited circles",
      "AI group workout generation",
      "Circle analytics dashboard",
      "Challenges & leaderboards",
      "Up to 50 members per circle",
    ],
    icon: <Zap className="h-5 w-5" />,
  },
};

function getSuggestedTier(currentTier: PlanTier): PlanTier {
  switch (currentTier) {
    case "free":
      return "plus";
    case "plus":
      return "pro";
    case "pro":
      return "leader";
    default:
      return "pro";
  }
}

export function UpgradeSheet({
  open,
  onOpenChange,
  currentTier,
  suggestedTier,
}: UpgradeSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const trackedRef = useRef(false);

  const targetTier = suggestedTier || getSuggestedTier(currentTier);
  const option = UPGRADE_OPTIONS[targetTier];

  // Track paywall shown
  useEffect(() => {
    if (open && option && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("paywall_shown", {
        current_tier: currentTier,
        suggested_tier: targetTier,
      });
    }
    if (!open) trackedRef.current = false;
  }, [open, option, currentTier, targetTier]);

  if (!option) return null;

  const handleUpgrade = async () => {
    trackEvent("upgrade_cta_clicked", {
      current_tier: currentTier,
      target_tier: option.tier,
    });
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: option.tier, interval: "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Fall back to plan page
      router.push("/you/plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        <SheetHeader className="text-left pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              {option.icon}
            </div>
            <div>
              <SheetTitle className="text-base">
                Upgrade to {option.name}
              </SheetTitle>
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                {option.price}
              </Badge>
            </div>
          </div>
          <SheetDescription className="text-sm pt-1">
            {option.headline}
          </SheetDescription>
        </SheetHeader>

        <div className="py-3">
          <ul className="space-y-2.5">
            {option.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <SheetFooter className="flex-col gap-2 pt-2 pb-safe">
          <Button
            className={cn(
              "w-full bg-brand hover:bg-brand/90 text-brand-foreground"
            )}
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? "Loading..." : "Start 7-Day Free Trial"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              trackEvent("paywall_dismissed", {
                current_tier: currentTier,
                action: "compare_plans",
              });
              onOpenChange(false);
              router.push("/you/plan");
            }}
          >
            Compare all plans
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
