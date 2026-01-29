"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Target, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

const GOALS = [
  { id: "weight_loss", label: "Lose weight", description: "Burn fat, get leaner", icon: "🔥" },
  { id: "muscle_gain", label: "Build muscle", description: "Gain size & mass", icon: "💪" },
  { id: "strength", label: "Get stronger", description: "Lift heavier weights", icon: "🏋️" },
  { id: "endurance", label: "Build endurance", description: "Run longer, last longer", icon: "🏃" },
  { id: "athletic", label: "Athletic performance", description: "Sport-specific training", icon: "⚡" },
  { id: "flexibility", label: "Improve mobility", description: "Flexibility & recovery", icon: "🧘" },
  { id: "body_recomp", label: "Body recomp", description: "Lose fat + gain muscle", icon: "🔄" },
  { id: "health", label: "Overall health", description: "Feel better daily", icon: "❤️" },
  { id: "energy", label: "More energy", description: "Better daily energy", icon: "☀️" },
  { id: "stress", label: "Stress relief", description: "Mental wellness", icon: "🧠" },
];

export function GoalsSection({ data, onUpdate, onNext }: SectionProps) {
  // Combine motivation and goals into one
  const initialGoals = [
    ...(data.primaryMotivation || []),
    ...(data.primaryGoal ? [data.primaryGoal] : []),
    ...(data.secondaryGoals || []),
  ].filter((g, i, arr) => arr.indexOf(g) === i); // Remove duplicates
  
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialGoals);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = () => {
    // Store in both fields for backward compatibility
    onUpdate({ 
      primaryMotivation: selectedGoals,
      primaryGoal: selectedGoals[0] || "",
      secondaryGoals: selectedGoals.slice(1),
    });
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
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
          <Target className="w-8 h-8 text-brand" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          What are your goals?
        </h2>
        <p className="text-muted-foreground mb-6">
          Select all that apply — first selected is your primary focus
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {GOALS.map(({ id, label, description, icon }, index) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => toggleGoal(id)}
              className={cn(
                "relative p-3 rounded-xl border-2 transition-all text-left",
                "hover:border-brand hover:bg-brand/5 active:scale-[0.98]",
                selectedGoals.includes(id)
                  ? "border-brand bg-brand/10"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm block leading-tight">{label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{description}</span>
                </div>
              </div>
              {selectedGoals.includes(id) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand flex items-center justify-center"
                >
                  <Check className="w-2.5 h-2.5 text-white" />
                </motion.div>
              )}
              {selectedGoals[0] === id && (
                <span className="absolute bottom-0.5 right-1.5 text-[9px] text-brand font-medium">
                  Primary
                </span>
              )}
            </motion.button>
          ))}
        </div>

        <Button
          onClick={handleContinue}
          disabled={selectedGoals.length === 0}
          className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
}
