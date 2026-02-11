"use client";

import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingActionsProps {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  className?: string;
}

export function OnboardingActions({
  onNext,
  onBack,
  nextLabel = "Continue",
  nextDisabled = false,
  className = "",
}: OnboardingActionsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="h-12 w-12 shrink-0 rounded-xl border-2 border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
      >
        {nextLabel}
        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
}
