"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Heart, Flame, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog/client";

interface CancelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
  currentInterval?: string | null;
}

const CANCEL_REASONS = [
  { id: "expensive", label: "Too expensive" },
  { id: "not_using", label: "Not using enough" },
  { id: "ai_quality", label: "AI quality not good enough" },
  { id: "break", label: "Taking a break" },
  { id: "other", label: "Other reason" },
] as const;

export function CancelSheet({
  open,
  onOpenChange,
  currentTier,
  currentInterval,
}: CancelSheetProps) {
  const router = useRouter();
  const [step, setStep] = useState<"confirm" | "reason" | "counter">("confirm");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToAnnual = async () => {
    if (currentInterval === "yearly") {
      // Already annual, go to portal
      handleCancel();
      return;
    }
    router.push("/you/plan");
    onOpenChange(false);
  };

  const resetAndClose = () => {
    trackEvent("cancel_retained", { step, tier: currentTier });
    setStep("confirm");
    setSelectedReason(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
        {step === "confirm" && (
          <>
            <SheetHeader className="text-left pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <SheetTitle className="text-base">Cancel your plan?</SheetTitle>
              </div>
              <SheetDescription className="text-sm pt-1">
                Here&apos;s what you&apos;ll lose if you cancel:
              </SheetDescription>
            </SheetHeader>

            <div className="py-3 space-y-2.5">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Heart className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-sm">Your AI coaching memory and preferences</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm">Unlimited AI workouts and chat</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Users className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-sm">Access to your circles beyond the free limit</span>
              </div>
            </div>

            <SheetFooter className="flex-col gap-2 pt-2 pb-safe">
              <Button
                variant="outline"
                className="w-full"
                onClick={resetAndClose}
              >
                Keep My Plan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setStep("reason")}
              >
                I still want to cancel
              </Button>
            </SheetFooter>
          </>
        )}

        {step === "reason" && (
          <>
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="text-base">Help us improve</SheetTitle>
              <SheetDescription className="text-sm">
                Why are you canceling? This helps us get better.
              </SheetDescription>
            </SheetHeader>

            <div className="py-3 space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => {
                    setSelectedReason(reason.id);
                    trackEvent("cancel_reason_selected", {
                      reason: reason.id,
                      tier: currentTier,
                    });
                    // Show counter-offer for certain reasons
                    if (reason.id === "expensive" || reason.id === "not_using") {
                      setStep("counter");
                    } else {
                      handleCancel();
                    }
                  }}
                  className="flex items-center justify-between w-full rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">{reason.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === "counter" && (
          <>
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="text-base">
                {selectedReason === "expensive"
                  ? "How about saving money?"
                  : "We have an idea"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {selectedReason === "expensive"
                  ? "Switch to annual billing and save up to 30%."
                  : "Try a different plan that better fits your usage."}
              </SheetDescription>
            </SheetHeader>

            <SheetFooter className="flex-col gap-2 pt-4 pb-safe">
              {selectedReason === "expensive" && currentInterval !== "yearly" && (
                <Button
                  className="w-full bg-brand hover:bg-brand/90 text-brand-foreground"
                  onClick={handleSwitchToAnnual}
                >
                  Switch to Annual & Save
                </Button>
              )}
              {selectedReason === "not_using" && (
                <Button
                  className="w-full bg-brand hover:bg-brand/90 text-brand-foreground"
                  onClick={() => {
                    router.push("/you/plan");
                    resetAndClose();
                  }}
                >
                  Switch to a Lower Plan
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Opening portal..." : "Continue with cancellation"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
