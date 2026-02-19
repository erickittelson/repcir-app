"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PlanTier, BillingInterval } from "@/lib/billing/types";

interface PlanCardProps {
  tier: PlanTier;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  interval: BillingInterval;
  trialDays: number;
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect: (tier: PlanTier) => void;
  loading?: boolean;
}

export function PlanCard({
  tier,
  name,
  description,
  features,
  monthlyPrice,
  yearlyPrice,
  interval,
  trialDays,
  isCurrent,
  isPopular,
  onSelect,
  loading,
}: PlanCardProps) {
  const price = interval === "yearly" ? yearlyPrice : monthlyPrice;
  const monthlyEquivalent =
    interval === "yearly" && yearlyPrice
      ? (yearlyPrice / 12).toFixed(2)
      : null;
  const isFree = price === null;
  const savings =
    interval === "yearly" && monthlyPrice && yearlyPrice
      ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
      : 0;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        isCurrent && "border-brand bg-brand/5",
        isPopular && !isCurrent && "border-brand/50",
        !isCurrent && !isPopular && "border-border"
      )}
    >
      {isPopular && !isCurrent && (
        <Badge className="absolute -top-2.5 left-4 bg-brand text-brand-foreground text-[10px] px-2">
          Most Popular
        </Badge>
      )}

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{name}</h3>
              {isCurrent && (
                <Badge variant="secondary" className="text-[10px]">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-1">
          {isFree ? (
            <span className="text-2xl font-bold">Free</span>
          ) : (
            <>
              <span className="text-2xl font-bold">
                ${interval === "yearly" ? monthlyEquivalent : price?.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
              {interval === "yearly" && (
                <span className="text-xs text-muted-foreground ml-1">
                  (${yearlyPrice?.toFixed(2)}/yr)
                </span>
              )}
            </>
          )}
          {savings > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px] text-green-600 bg-green-50">
              Save {savings}%
            </Badge>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-1.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isCurrent ? (
          <Button variant="outline" size="sm" className="w-full" disabled>
            Current Plan
          </Button>
        ) : isFree ? (
          <Button variant="outline" size="sm" className="w-full" disabled>
            Free Forever
          </Button>
        ) : (
          <Button
            size="sm"
            className={cn(
              "w-full",
              isPopular && "bg-brand hover:bg-brand/90 text-brand-foreground"
            )}
            onClick={() => onSelect(tier)}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : trialDays > 0
                ? `Start ${trialDays}-Day Free Trial`
                : `Upgrade to ${name}`}
          </Button>
        )}
      </div>
    </div>
  );
}
