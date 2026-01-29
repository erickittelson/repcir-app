"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Target, Dumbbell, LineChart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: Target,
    title: "Personalized Programming",
    description: "Sets, reps, and weights tailored to your current fitness level and goals",
  },
  {
    icon: Dumbbell,
    title: "Smart Exercise Selection",
    description: "Movements chosen based on your equipment, limitations, and experience",
  },
  {
    icon: LineChart,
    title: "Intelligent Progression",
    description: "Milestones and targets that adapt as you get stronger",
  },
];

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="relative bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button - positioned inside the modal */}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with gradient */}
              <div
                className="bg-energy-gradient text-white text-center"
                style={{ padding: "2rem 1.5rem" }}
              >
                <div
                  className="mx-auto bg-white/20 rounded-2xl flex items-center justify-center"
                  style={{ width: "4rem", height: "4rem", marginBottom: "1rem" }}
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold" style={{ marginBottom: "0.5rem" }}>
                  Welcome to Your AI Coach
                </h2>
                <p className="text-white/90 text-sm">
                  Let&apos;s get to know you so I can create the perfect workout plan
                </p>
              </div>

              {/* Content */}
              <div style={{ padding: "1.5rem" }}>
                {/* Why we ask */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 className="font-semibold text-foreground" style={{ marginBottom: "0.75rem" }}>
                    Why I&apos;m Asking These Questions
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The more I know about you, the better I can coach you. Your answers help me
                    understand your body, experience, and goals so every workout is built
                    specifically for <strong className="text-foreground">you</strong>.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3" style={{ marginBottom: "1.5rem" }}>
                  {FEATURES.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start"
                      style={{ gap: "0.75rem" }}
                    >
                      <div
                        className="bg-brand/10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ width: "2.25rem", height: "2.25rem" }}
                      >
                        <feature.icon className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {feature.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Privacy note */}
                <p className="text-xs text-muted-foreground text-center" style={{ marginBottom: "1rem" }}>
                  Your information is private and only used to personalize your experience.
                </p>

                {/* CTA */}
                <Button
                  onClick={onClose}
                  className="w-full bg-energy-gradient hover:opacity-90 text-white font-semibold rounded-xl shadow-md"
                  style={{ height: "3rem" }}
                >
                  Let&apos;s Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
