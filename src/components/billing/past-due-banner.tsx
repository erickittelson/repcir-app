"use client";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PastDueBannerProps {
  isPastDue: boolean;
}

export function PastDueBanner({ isPastDue }: PastDueBannerProps) {
  if (!isPastDue) return null;

  const handleUpdatePayment = async () => {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to open billing portal");
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <button
        onClick={handleUpdatePayment}
        className="flex items-center gap-2 w-full text-left"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-xs text-amber-800 flex-1">
          Payment failed. Update your payment method to keep your plan.
        </span>
        <span className="text-xs font-medium text-amber-700 shrink-0">
          Fix
        </span>
      </button>
    </div>
  );
}
