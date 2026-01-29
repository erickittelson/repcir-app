"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Calendar, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

const DURATION_STYLES = [
  { 
    id: "quick", 
    label: "Quick Sessions", 
    description: "15-30 min focused workouts",
    emoji: "⚡",
    avgDuration: 20,
  },
  { 
    id: "standard", 
    label: "Standard", 
    description: "45-60 min balanced sessions",
    emoji: "💪",
    avgDuration: 50,
  },
  { 
    id: "extended", 
    label: "Extended", 
    description: "75-90+ min deep training",
    emoji: "🔥",
    avgDuration: 80,
  },
  { 
    id: "varies", 
    label: "It Varies", 
    description: "Mix of short & long sessions, two-a-days",
    emoji: "🔄",
    avgDuration: 60,
  },
];

const DAYS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];

export function PreferencesSection({ data, onUpdate, onNext }: SectionProps) {
  const [step, setStep] = useState<"duration" | "days">("duration");
  const [durationStyle, setDurationStyle] = useState(
    data.workoutDuration 
      ? data.workoutDuration <= 30 ? "quick" 
        : data.workoutDuration <= 60 ? "standard" 
        : data.workoutDuration <= 90 ? "extended" 
        : "varies"
      : ""
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(data.workoutDays || []);

  const handleDurationSelect = (id: string) => {
    setDurationStyle(id);
    const style = DURATION_STYLES.find(s => s.id === id);
    if (style) {
      onUpdate({ workoutDuration: style.avgDuration });
    }
  };

  const handleDurationContinue = () => {
    if (durationStyle) {
      setStep("days");
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleContinue = () => {
    onUpdate({ workoutDays: selectedDays });
    onNext();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-md mx-auto w-full">
        {step === "duration" && (
          <motion.div
            key="duration"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              How long are your workouts?
            </h2>
            <p className="text-muted-foreground mb-6">
              Pick what fits your typical training style
            </p>

            <div className="space-y-2 mb-6">
              {DURATION_STYLES.map(({ id, label, description, emoji }) => (
                <button
                  key={id}
                  onClick={() => handleDurationSelect(id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border-2 transition-all",
                    "flex items-center gap-3 text-left",
                    "hover:border-brand hover:bg-brand/5",
                    durationStyle === id
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <span className="font-semibold block">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                  {durationStyle === id && (
                    <Check className="w-5 h-5 text-brand" />
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleDurationContinue}
              disabled={!durationStyle}
              className="w-full h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {step === "days" && (
          <motion.div
            key="days"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Which days work best?
            </h2>
            <p className="text-muted-foreground mb-6">
              We&apos;ll schedule your workouts on these days
            </p>

            <div className="flex justify-center gap-2 mb-6">
              {DAYS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleDay(id)}
                  className={cn(
                    "relative w-12 h-12 rounded-xl border-2 transition-all",
                    "flex items-center justify-center font-medium text-sm",
                    "hover:border-brand hover:bg-brand/5",
                    selectedDays.includes(id)
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-card"
                  )}
                >
                  {label}
                  {selectedDays.includes(id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleContinue}
              disabled={selectedDays.length === 0}
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
