"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlockMessage?: string;
  category?: string;
}

interface AchievementModalProps {
  badges: Badge[];
  onComplete: () => void;
}

const TIER_COLORS = {
  bronze: "from-amber-700 to-amber-500",
  silver: "from-gray-400 to-gray-200",
  gold: "from-yellow-500 to-amber-300",
  platinum: "from-cyan-400 to-blue-300",
};

const TIER_GLOW = {
  bronze: "shadow-amber-500/50",
  silver: "shadow-gray-300/50",
  gold: "shadow-yellow-400/50",
  platinum: "shadow-cyan-400/50",
};

const RARITY_LABELS = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function AchievementModal({ badges, onComplete }: AchievementModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(badges.length > 0);

  const currentBadge = badges[currentIndex];
  const hasMore = currentIndex < badges.length - 1;

  // Fire confetti on mount and when badge changes
  useEffect(() => {
    if (isVisible && currentBadge) {
      // Delay confetti slightly for dramatic effect
      const timer = setTimeout(() => {
        const tier = currentBadge.tier;
        const colors = {
          bronze: ["#b45309", "#d97706", "#f59e0b"],
          silver: ["#6b7280", "#9ca3af", "#d1d5db"],
          gold: ["#eab308", "#facc15", "#fde047"],
          platinum: ["#22d3ee", "#06b6d4", "#0891b2"],
        };

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors[tier],
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isVisible, currentIndex, currentBadge]);

  const handleNext = () => {
    if (hasMore) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsVisible(false);
      onComplete();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onComplete();
  };

  if (!currentBadge) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl border border-border overflow-hidden"
          >
            {/* Header decoration - fades in smoothly */}
            <motion.div 
              key={currentBadge.id}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
              className={`h-2 bg-gradient-to-r ${TIER_COLORS[currentBadge.tier]}`} 
            />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="p-6 text-center">
              {/* Achievement unlocked header */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2 mb-4"
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                  Achievement Unlocked
                </span>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </motion.div>

              {/* Badge icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                className={`w-28 h-28 mx-auto mb-4 rounded-full bg-gradient-to-br ${TIER_COLORS[currentBadge.tier]} flex items-center justify-center shadow-2xl ${TIER_GLOW[currentBadge.tier]}`}
              >
                <span className="text-5xl">{currentBadge.icon}</span>
              </motion.div>

              {/* Badge name */}
              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-2"
              >
                {currentBadge.name}
              </motion.h2>

              {/* Tier and rarity */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-center gap-3 mb-3"
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${TIER_COLORS[currentBadge.tier]} text-white capitalize`}>
                  {currentBadge.tier}
                </span>
                <span className="text-xs text-muted-foreground">
                  {RARITY_LABELS[currentBadge.rarity]}
                </span>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-4"
              >
                {currentBadge.unlockMessage || currentBadge.description}
              </motion.p>

              {/* Counter for multiple badges */}
              {badges.length > 1 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-muted-foreground mb-4"
                >
                  {currentIndex + 1} of {badges.length} achievements
                </motion.p>
              )}

              {/* Action button */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={handleNext}
                  className={`w-full h-12 text-lg rounded-xl bg-gradient-to-r ${TIER_COLORS[currentBadge.tier]} hover:opacity-90 text-white font-semibold`}
                >
                  {hasMore ? (
                    <>
                      Next Achievement
                      <Trophy className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      Awesome!
                      <Star className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Export a hook to manage achievement queue
export function useAchievementQueue() {
  const [queue, setQueue] = useState<Badge[]>([]);
  const [isShowing, setIsShowing] = useState(false);

  const addToQueue = (badges: Badge[]) => {
    setQueue((prev) => [...prev, ...badges]);
    if (!isShowing && badges.length > 0) {
      setIsShowing(true);
    }
  };

  const handleComplete = () => {
    setIsShowing(false);
    setQueue([]);
  };

  return {
    queue,
    isShowing,
    addToQueue,
    handleComplete,
    AchievementModalComponent: isShowing && queue.length > 0 ? (
      <AchievementModal badges={queue} onComplete={handleComplete} />
    ) : null,
  };
}
