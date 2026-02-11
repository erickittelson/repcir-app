"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingActions } from "./onboarding-actions";
import type { SectionProps } from "./types";

const LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to fitness or returning after a long break",
    emoji: "🌱",
    color: "text-green-500",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Work out regularly, know the basics",
    emoji: "🌿",
    color: "text-brand",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Consistent training for 2+ years",
    emoji: "🌳",
    color: "text-purple-500",
  },
  {
    id: "elite",
    label: "Elite",
    description: "Competitive athlete or serious lifter",
    emoji: "🏆",
    color: "text-amber-500",
  },
];

export function FitnessLevelSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [selected, setSelected] = useState(data.fitnessLevel || "");

  const handleSelect = (level: string) => {
    setSelected(level);
  };

  const handleContinue = () => {
    onUpdate({ fitnessLevel: selected as "beginner" | "intermediate" | "advanced" | "elite" });
    onNext();
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto w-full text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          What&apos;s your fitness level?
        </h2>
        <p className="text-muted-foreground mb-8">
          Be honest — we&apos;ll build from where you are
        </p>

        <div className="space-y-3 mb-8">
          {LEVELS.map(({ id, label, description, emoji, color }, index) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(id)}
              className={cn(
                "relative w-full px-5 py-4 rounded-xl border-2 transition-all",
                "flex items-center gap-4 text-left",
                "hover:border-brand hover:bg-brand/5",
                selected === id
                  ? "border-brand bg-brand/10"
                  : "border-border bg-card"
              )}
            >
              <div className="text-3xl">{emoji}</div>
              <div className="flex-1">
                <span className={cn("font-semibold block", selected === id && color)}>
                  {label}
                </span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </div>
              {selected === id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-brand flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        <OnboardingActions
          onNext={handleContinue}
          onBack={onBack}
          nextDisabled={!selected}
        />
      </motion.div>
    </div>
  );
}
