"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

const FREQUENCIES = [
  { value: 1, label: "1 day", description: "Just starting out" },
  { value: 2, label: "2 days", description: "Light training" },
  { value: 3, label: "3 days", description: "Moderate" },
  { value: 4, label: "4 days", description: "Active" },
  { value: 5, label: "5 days", description: "Dedicated" },
  { value: 6, label: "6+ days", description: "Intense" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", description: "Desk job, < 3,000 steps/day", emoji: "🪑", steps: 2500 },
  { id: "light", label: "Lightly Active", description: "Some walking, 3,000-6,000 steps/day", emoji: "🚶", steps: 4500 },
  { id: "moderate", label: "Moderately Active", description: "On your feet, 6,000-10,000 steps/day", emoji: "🏃", steps: 8000 },
  { id: "active", label: "Very Active", description: "Physical job, 10,000-15,000 steps/day", emoji: "💪", steps: 12000 },
  { id: "very_active", label: "Extremely Active", description: "Labor intensive, 15,000+ steps/day", emoji: "🔥", steps: 17000 },
];

export function ActivitySection({ data, onUpdate, onNext }: SectionProps) {
  const [step, setStep] = useState<"frequency" | "activity">("frequency");
  const [frequency, setFrequency] = useState(data.trainingFrequency || 0);
  const [activityLevel, setActivityLevel] = useState(data.activityLevel?.jobType || "");

  const handleFrequencySelect = (value: number) => {
    setFrequency(value);
    onUpdate({ trainingFrequency: value });
  };

  const handleFrequencyContinue = () => {
    if (frequency > 0) {
      setStep("activity");
    }
  };

  const handleActivitySelect = (id: string) => {
    setActivityLevel(id);
    const level = ACTIVITY_LEVELS.find((l) => l.id === id);
    onUpdate({ activityLevel: { jobType: id, dailySteps: level?.steps } });
  };

  const handleActivityContinue = () => {
    if (activityLevel) {
      onNext();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-md mx-auto w-full">
        {step === "frequency" && (
          <motion.div
            key="frequency"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              How often do you want to work out?
            </h2>
            <p className="text-muted-foreground mb-8">
              We&apos;ll create a plan that fits your schedule
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {FREQUENCIES.map(({ value, description }) => (
                <button
                  key={value}
                  onClick={() => handleFrequencySelect(value)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    "hover:border-brand hover:bg-brand/5",
                    frequency === value
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-2xl font-bold block">{value}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>

            <Button
              onClick={handleFrequencyContinue}
              disabled={frequency === 0}
              className="w-full h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {step === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              How active is your daily life?
            </h2>
            <p className="text-muted-foreground mb-8">
              Outside of workouts
            </p>

            <div className="space-y-2 mb-6">
              {ACTIVITY_LEVELS.map(({ id, label, description, emoji }) => (
                <button
                  key={id}
                  onClick={() => handleActivitySelect(id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border-2 transition-all",
                    "flex items-center gap-3 text-left",
                    "hover:border-brand hover:bg-brand/5",
                    activityLevel === id
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <span className="font-semibold text-sm block">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleActivityContinue}
              disabled={!activityLevel}
              className="w-full h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
