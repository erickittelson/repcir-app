"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface PostLoginExperienceProps {
  userData: {
    name: string;
    primaryGoal?: string;
    goals?: string[];
    personalRecords?: Array<{
      exerciseName: string;
      value: number;
      unit: string;
    }>;
    skills?: Array<{ name: string; status: string }>;
    earnedBadges?: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      tier: string;
    }>;
  };
  onComplete: () => void;
}

const STEPS = [
  {
    label: "Home",
    desc: "Your dashboard — today's workout, streak, and activity feed.",
  },
  {
    label: "Discover",
    desc: "Find workout plans, challenges, and people to train with.",
  },
  {
    label: "Create",
    desc: "Log a workout, generate an AI training plan, chat with your coach, or share a post.",
  },
  {
    label: "Workouts",
    desc: "Browse, create, and share workout plans.",
  },
  {
    label: "You",
    desc: "Your profile — PRs, badges, skills, goals, and settings.",
  },
];

export function PostLoginExperience({ onComplete }: PostLoginExperienceProps) {
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const getTabRect = useCallback((index: number): DOMRect | null => {
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    if (!nav) return null;
    const container = nav.children[0];
    if (!container) return null;
    return container.children[index]?.getBoundingClientRect() ?? null;
  }, []);

  // Lock body scroll during tour
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Start after a brief delay so nav has painted
  useEffect(() => {
    const t = setTimeout(() => setStep(0), 150);
    return () => clearTimeout(t);
  }, []);

  // Measure highlighted tab on step change
  useEffect(() => {
    if (step >= 0 && step < STEPS.length) {
      setRect(getTabRect(step));
    }
  }, [step, getTabRect]);

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else onComplete();
  }, [step, onComplete]);

  // Keyboard: Enter/Space/Right to advance, Escape to skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
      if (["Enter", " ", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, onComplete]);

  if (step < 0 || !rect) return null;

  const pad = 8;
  const isLog = step === 2;
  const tooltipBottom = window.innerHeight - rect.top + 20;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] cursor-pointer"
      onClick={advance}
      role="dialog"
      aria-label="App tour"
      aria-modal="true"
      tabIndex={0}
    >
      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="absolute right-4 top-6 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/60 backdrop-blur-sm transition-colors hover:text-white"
      >
        Skip tour
      </button>

      {/* Spotlight cutout — box-shadow creates the dark overlay with a hole */}
      <motion.div
        animate={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="pointer-events-none fixed border-2 border-white/20"
        style={{
          borderRadius: isLog ? "50%" : 12,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.82)",
        }}
      />

      {/* Tooltip card */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed left-4 right-4 mx-auto max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
        style={{ bottom: tooltipBottom }}
      >
        {step === 0 && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
            Quick Tour
          </p>
        )}
        <p className="mb-1 text-base font-bold">{STEPS[step].label}</p>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {STEPS[step].desc}
        </p>

        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-5 bg-brand"
                    : i < step
                      ? "w-1.5 bg-brand/40"
                      : "w-1.5 bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground/60">
            {step < STEPS.length - 1 ? "Tap anywhere" : "Tap to finish"}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
