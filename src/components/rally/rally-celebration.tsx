"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface RallyCelebrationProps {
  rallyName: string;
  rallyId: string;
  userAvatar?: string;
  userName: string;
  onAnimationComplete: () => void;
}

// Animation phases
type Phase = "burst" | "message" | "avatar-appear" | "avatar-merge" | "complete";

// Confetti particle configuration
interface Particle {
  id: number;
  x: number;
  xOffset: number; // Pre-computed x offset for animation
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

// Brand colors for confetti
const CONFETTI_COLORS = [
  "oklch(0.73 0.155 85)", // Earned Gold
  "oklch(0.76 0.155 85)", // Triumph Gold
  "oklch(0.53 0.10 70)", // Bronze
  "oklch(0.42 0.10 160)", // Victory Green
  "oklch(0.97 0.008 90)", // Legion White
];

// Generate particles outside component to avoid recreating on each render
function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    xOffset: (Math.random() - 0.5) * 100, // Pre-compute x offset
    delay: Math.random() * 0.3,
    duration: 1.5 + Math.random() * 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 720 - 360,
  }));
}

// Get user initials for avatar fallback
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function RallyCelebration({
  rallyName,
  rallyId: _rallyId, // Available for future use (e.g., analytics, navigation)
  userAvatar,
  userName,
  onAnimationComplete,
}: RallyCelebrationProps) {
  // rallyId is available via _rallyId if needed for tracking or navigation
  void _rallyId;
  const [phase, setPhase] = useState<Phase>("burst");
  const [showConfetti, setShowConfetti] = useState(true);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Memoize particles to prevent regeneration on re-renders
  const particles = useMemo(() => generateParticles(40), []);

  // Phase timings (in ms) - shorter for reduced motion
  const timings = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        burst: 200,
        message: 400,
        avatarAppear: 300,
        avatarMerge: 300,
        complete: 200,
      };
    }
    return {
      burst: 600,
      message: 800,
      avatarAppear: 500,
      avatarMerge: 600,
      complete: 400,
    };
  }, [prefersReducedMotion]);

  // Animation sequence controller
  const runAnimationSequence = useCallback(() => {
    const phases: { phase: Phase; delay: number }[] = [
      { phase: "burst", delay: 0 },
      { phase: "message", delay: timings.burst },
      { phase: "avatar-appear", delay: timings.burst + timings.message },
      {
        phase: "avatar-merge",
        delay: timings.burst + timings.message + timings.avatarAppear,
      },
      {
        phase: "complete",
        delay:
          timings.burst +
          timings.message +
          timings.avatarAppear +
          timings.avatarMerge,
      },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    phases.forEach(({ phase, delay }) => {
      const timeout = setTimeout(() => setPhase(phase), delay);
      timeouts.push(timeout);
    });

    // Hide confetti after burst
    const confettiTimeout = setTimeout(() => {
      setShowConfetti(false);
    }, timings.burst + 1500);
    timeouts.push(confettiTimeout);

    // Call completion callback
    const completeTimeout = setTimeout(() => {
      onAnimationComplete();
    }, timings.burst + timings.message + timings.avatarAppear + timings.avatarMerge + timings.complete);
    timeouts.push(completeTimeout);

    return () => timeouts.forEach(clearTimeout);
  }, [timings, onAnimationComplete]);

  useEffect(() => {
    return runAnimationSequence();
  }, [runAnimationSequence]);

  // Reduced motion: show simplified version
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="text-center space-y-6 px-6">
          {/* Rally Circle */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 rounded-full bg-brand-gradient glow-brand" />
            <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
              <Users className="w-12 h-12 text-brand" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-brand" />
              <span className="text-sm font-semibold text-brand uppercase tracking-wider">
                Rally Created
              </span>
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Your rally is ready!
            </h2>
            <p className="text-muted-foreground">{rallyName}</p>
          </div>

          {/* User joined indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6 ring-2 ring-brand">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="bg-brand text-brand-foreground text-xs">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <span>You&apos;ve joined the rally</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-hidden">
      {/* Confetti particles */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-sm"
                style={{
                  left: `${particle.x}%`,
                  backgroundColor: particle.color,
                  width: particle.size,
                  height: particle.size,
                }}
                initial={{
                  y: "50%",
                  x: 0,
                  opacity: 0,
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  y: ["50%", "-20%", "120%"],
                  x: [0, particle.xOffset],
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.5],
                  rotate: [0, particle.rotation],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main content container */}
      <div className="relative text-center space-y-6 px-6">
        {/* Rally Circle with pulse/burst effect */}
        <div className="relative mx-auto w-32 h-32">
          {/* Glow pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-brand/30"
            initial={{ scale: 1, opacity: 0 }}
            animate={
              phase === "burst"
                ? {
                    scale: [1, 1.8, 2.2],
                    opacity: [0.6, 0.3, 0],
                  }
                : { scale: 1, opacity: 0 }
            }
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* Second pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand"
            initial={{ scale: 1, opacity: 0 }}
            animate={
              phase === "burst"
                ? {
                    scale: [1, 1.5, 1.8],
                    opacity: [0.8, 0.4, 0],
                  }
                : { scale: 1, opacity: 0 }
            }
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          />

          {/* Main rally circle */}
          <motion.div
            className="absolute inset-0 rounded-full bg-brand-gradient"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: phase === "burst" ? [0.8, 1.1, 1] : 1,
              opacity: 1,
            }}
            transition={{
              scale: { duration: 0.4, ease: "easeOut" },
              opacity: { duration: 0.2 },
            }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full glow-brand"
              animate={{
                boxShadow:
                  phase === "burst" || phase === "avatar-merge"
                    ? [
                        "0 0 40px -10px oklch(0.73 0.155 85 / 0.5)",
                        "0 0 80px -10px oklch(0.73 0.155 85 / 0.8)",
                        "0 0 40px -10px oklch(0.73 0.155 85 / 0.5)",
                      ]
                    : "0 0 40px -10px oklch(0.73 0.155 85 / 0.5)",
              }}
              transition={{ duration: 0.6, repeat: phase === "burst" ? 1 : 0 }}
            />
          </motion.div>

          {/* Inner circle with icon */}
          <motion.div
            className="absolute inset-2 rounded-full bg-card flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            <Users className="w-12 h-12 text-brand" />
          </motion.div>

          {/* User avatar that appears and merges */}
          <AnimatePresence>
            {(phase === "avatar-appear" || phase === "avatar-merge") && (
              <motion.div
                className="absolute"
                initial={{
                  x: -80,
                  y: 0,
                  scale: 0,
                  opacity: 0,
                }}
                animate={
                  phase === "avatar-appear"
                    ? {
                        x: -60,
                        y: 0,
                        scale: 1,
                        opacity: 1,
                      }
                    : {
                        x: 0,
                        y: 0,
                        scale: [1, 1.2, 0],
                        opacity: [1, 1, 0],
                      }
                }
                transition={{
                  type: phase === "avatar-appear" ? "spring" : "tween",
                  duration: phase === "avatar-merge" ? 0.5 : undefined,
                  stiffness: 200,
                  damping: 15,
                }}
                style={{
                  top: "50%",
                  left: "50%",
                  translateY: "-50%",
                }}
              >
                <Avatar className="h-12 w-12 ring-2 ring-brand shadow-lg">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-brand text-brand-foreground font-semibold">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Merge "pop" effect */}
          <AnimatePresence>
            {phase === "avatar-merge" && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-energy"
                initial={{ scale: 1, opacity: 0 }}
                animate={{
                  scale: [1, 1.4],
                  opacity: [0.8, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Success Message */}
        <AnimatePresence>
          {(phase === "message" ||
            phase === "avatar-appear" ||
            phase === "avatar-merge" ||
            phase === "complete") && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Sparkles header */}
              <motion.div
                className="flex items-center justify-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              >
                <Sparkles className="w-5 h-5 text-brand" />
                <span className="text-sm font-semibold text-brand uppercase tracking-wider">
                  Rally Created
                </span>
                <Sparkles className="w-5 h-5 text-brand" />
              </motion.div>

              {/* Main message */}
              <motion.h2
                className="text-2xl font-bold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Your rally is ready!
              </motion.h2>

              {/* Rally name */}
              <motion.p
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                {rallyName}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "You've joined" indicator after merge */}
        <AnimatePresence>
          {phase === "complete" && (
            <motion.div
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Avatar className="h-6 w-6 ring-2 ring-brand">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-brand text-brand-foreground text-xs">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span>You&apos;ve joined the rally</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default RallyCelebration;
