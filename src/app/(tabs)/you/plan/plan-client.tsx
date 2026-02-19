"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/billing/plan-card";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog/client";
import type { PlanTier, BillingInterval } from "@/lib/billing/types";

interface PlanSelectionClientProps {
  currentTier: PlanTier;
}

const PLANS: Array<{
  tier: PlanTier;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  trialDays: number;
  isPopular?: boolean;
}> = [
  {
    tier: "free",
    name: "Free",
    description: "Basic features for getting started",
    features: [
      "Track workouts",
      "Join 1 circle",
      "3 AI workouts/month",
      "20 AI coach messages/month",
    ],
    monthlyPrice: null,
    yearlyPrice: null,
    trialDays: 0,
  },
  {
    tier: "plus",
    name: "Plus",
    description: "For the person who trains 3-4x/week",
    features: [
      "15 AI workouts/month",
      "Unlimited AI coach messages",
      "Join up to 3 circles",
      "Save community workouts",
      "Workout calendar scheduling",
    ],
    monthlyPrice: 6.99,
    yearlyPrice: 59.99,
    trialDays: 7,
    isPopular: true,
  },
  {
    tier: "pro",
    name: "Pro",
    description: "Your AI personal trainer that knows you",
    features: [
      "Unlimited AI workouts",
      "AI coaching memory",
      "Unlimited circles",
      "Advanced analytics",
      "Custom workout builder",
      "Priority AI model",
    ],
    monthlyPrice: 12.99,
    yearlyPrice: 109.99,
    trialDays: 7,
  },
  {
    tier: "leader",
    name: "Circle Leader",
    description: "For coaches and group fitness leaders",
    features: [
      "Everything in Pro",
      "Create unlimited circles",
      "AI group workout generation",
      "Circle analytics dashboard",
      "Challenges & leaderboards",
      "Up to 50 members per circle",
    ],
    monthlyPrice: 19.99,
    yearlyPrice: 169.99,
    trialDays: 14,
  },
];

export function PlanSelectionClient({ currentTier }: PlanSelectionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  // Show canceled toast
  if (searchParams.get("canceled") === "true") {
    toast("No worries! You can upgrade anytime.", { id: "checkout-canceled" });
  }

  const handleSelectPlan = async (tier: PlanTier) => {
    trackEvent("plan_selected", {
      current_tier: currentTier,
      selected_tier: tier,
      interval,
    });
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">Choose Your Plan</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Interval toggle */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center rounded-lg bg-muted p-1">
            <button
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                interval === "monthly"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </button>
            <button
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors relative",
                interval === "yearly"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => setInterval("yearly")}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                Save
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.tier}
              tier={plan.tier}
              name={plan.name}
              description={plan.description}
              features={plan.features}
              monthlyPrice={plan.monthlyPrice}
              yearlyPrice={plan.yearlyPrice}
              interval={interval}
              trialDays={plan.trialDays}
              isCurrent={currentTier === plan.tier}
              isPopular={plan.isPopular}
              onSelect={handleSelectPlan}
              loading={loadingTier === plan.tier}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground px-4">
          Cancel anytime. No questions asked. All plans include a money-back
          guarantee.
        </p>
      </div>
    </div>
  );
}
