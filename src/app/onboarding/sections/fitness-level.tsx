"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export function FitnessLevelSection({ data, onUpdate, onNext }: SectionProps) {
  const [selected, setSelected] = useState(data.fitnessLevel || "");

  const handleSelect = (level: string) => {
    setSelected(level);
  };

  const handleContinue = () => {
    onUpdate({ fitnessLevel: selected as "beginner" | "intermediate" | "advanced" | "elite" });
    onNext();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
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

        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
}
