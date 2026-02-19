"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, Dumbbell, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const TIER_NAMES: Record<string, string> = {
  plus: "Plus",
  pro: "Pro",
  leader: "Circle Leader",
  team: "Team",
};

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "plus";
  const tierName = TIER_NAMES[tier] || "Plus";
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Simple confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: [
                  "oklch(0.73 0.155 85)",
                  "oklch(0.65 0.15 150)",
                  "oklch(0.7 0.14 250)",
                  "oklch(0.75 0.12 50)",
                ][i % 4],
                left: `${10 + Math.random() * 80}%`,
                top: "-5%",
              }}
              animate={{
                y: ["0vh", "110vh"],
                x: [0, (Math.random() - 0.5) * 100],
                rotate: [0, Math.random() * 720],
                opacity: [1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="text-center space-y-6 max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </motion.div>

        {/* Headline */}
        <div>
          <h1 className="text-2xl font-bold">Welcome to {tierName}!</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your subscription is active. All premium features are now unlocked.
          </p>
        </div>

        {/* Plan badge */}
        <Badge className="bg-brand text-brand-foreground text-sm px-3 py-1">
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          {tierName} Plan Active
        </Badge>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Button
            className="w-full bg-brand hover:bg-brand/90 text-brand-foreground"
            onClick={() => router.push("/coach")}
          >
            <Dumbbell className="mr-2 h-4 w-4" />
            Generate a Workout
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/you")}
          >
            Go to Profile
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
