"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RallyproofLogo } from "@/components/ui/rallyproof-logo";
import type { SectionProps } from "./types";

export function WelcomeSection({ data, onUpdate, onNext }: SectionProps) {
  const [name, setName] = useState(data.name || "");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    // Delay showing input for dramatic effect
    const timer = setTimeout(() => setShowInput(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (name.trim()) {
      onUpdate({ name: name.trim() });
      onNext();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-md mx-auto"
      >
        {/* Logo */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-card flex items-center justify-center shadow-xl glow-earned border border-brand/20">
            <RallyproofLogo variant="icon" size="xl" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl md:text-4xl font-display tracking-wider mb-3"
        >
          <span className="text-brand-gradient">RALLYPROOF</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-muted-foreground text-lg mb-2"
        >
          You showed up. That&apos;s more than most.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-muted-foreground text-sm mb-10"
        >
          That&apos;s step one.
        </motion.p>

        {/* Name Input */}
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground block">
                What should we call you?
              </label>
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-14 text-lg text-center bg-card/50 border-border/50 rounded-xl touch-target"
                style={{ fontSize: "18px" }} // Prevents iOS zoom on focus
                autoFocus
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="w-full h-14 text-lg bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl group"
            >
              Enter
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
