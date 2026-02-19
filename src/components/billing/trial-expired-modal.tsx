"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";

const TRIAL_EXPIRED_SEEN_KEY = "repcir:trial-expired-seen";

interface TrialExpiredModalProps {
  /** Whether the user's trial has ended and they're now on free */
  trialExpired: boolean;
}

export function TrialExpiredModal({ trialExpired }: TrialExpiredModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!trialExpired) return;

    // Only show once
    const seen = localStorage.getItem(TRIAL_EXPIRED_SEEN_KEY);
    if (!seen) {
      setOpen(true);
      localStorage.setItem(TRIAL_EXPIRED_SEEN_KEY, "true");
    }
  }, [trialExpired]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-2">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle>Your trial has ended</DialogTitle>
          <DialogDescription className="pt-1">
            You&apos;re now on the Free plan. You can still track workouts and
            use basic features, but AI workouts and chat are limited.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 pt-2">
          <Button
            className="w-full bg-brand hover:bg-brand/90 text-brand-foreground"
            onClick={() => {
              setOpen(false);
              router.push("/you/plan");
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            See Plans
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Continue on Free
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
