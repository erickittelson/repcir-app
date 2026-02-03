"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Compass, 
  Plus, 
  Users, 
  User, 
  Trophy,
  Dumbbell,
  Target,
  MessageCircle,
  ChevronRight,
  Sparkles,
  Zap,
  X,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface UserData {
  name: string;
  goals?: string[];
  primaryGoal?: string | { type: string; description?: string };
  personalRecords?: Array<{
    exerciseName: string;
    value: number;
    unit: string;
  }>;
  skills?: Array<{
    name: string;
    status: string;
  }>;
  earnedBadges?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: "bronze" | "silver" | "gold" | "platinum";
  }>;
}

interface RecommendedBadge {
  name: string;
  description: string;
  icon: string;
  tier: string;
  howToUnlock: string;
}

interface PostLoginExperienceProps {
  userData: UserData;
  onComplete: () => void;
}

// Badge progression tiers for smart recommendations
const BENCH_TIERS = [
  { value: 135, name: "135 Bench Club", tier: "bronze" },
  { value: 225, name: "225 Bench Club", tier: "silver" },
  { value: 315, name: "315 Bench Club", tier: "gold" },
  { value: 405, name: "405 Bench Club", tier: "platinum" },
];

const SQUAT_TIERS = [
  { value: 225, name: "225 Squat Club", tier: "bronze" },
  { value: 315, name: "315 Squat Club", tier: "silver" },
  { value: 405, name: "405 Squat Club", tier: "gold" },
  { value: 495, name: "495 Squat Club", tier: "platinum" },
];

const DEADLIFT_TIERS = [
  { value: 315, name: "315 Deadlift Club", tier: "bronze" },
  { value: 405, name: "405 Deadlift Club", tier: "silver" },
  { value: 495, name: "495 Deadlift Club", tier: "gold" },
  { value: 585, name: "585 Deadlift Club", tier: "platinum" },
];

const TOTAL_TIERS = [
  { value: 500, name: "500lb Club", tier: "bronze" },
  { value: 1000, name: "1000lb Club", tier: "silver" },
  { value: 1500, name: "1500lb Club", tier: "gold" },
  { value: 2000, name: "2000lb Club", tier: "platinum" },
];

// Helper to find next tier based on current PR
function getNextTier(
  currentValue: number | undefined,
  tiers: Array<{ value: number; name: string; tier: string }>
): { value: number; name: string; tier: string } | null {
  if (!currentValue) return tiers[0];
  
  for (const tier of tiers) {
    if (currentValue < tier.value) {
      return tier;
    }
  }
  return null; // Already at max tier
}

type Step = 
  | "celebration" 
  | "welcome" 
  | "home-feature" 
  | "discover-feature" 
  | "create-feature" 
  | "circles-feature" 
  | "you-feature"
  | "achievements-feature"
  | "ai-coach-feature"
  | "recommendations"
  | "complete";

const FEATURE_STEPS: Array<{
  id: Step;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tip: string;
  gradient: string;
}> = [
  {
    id: "home-feature",
    icon: Home,
    title: "Home",
    description: "Your personalized dashboard shows today's workout, your streak, and quick access to everything you need.",
    tip: "Check here daily for your recommended workout based on your schedule.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    id: "discover-feature",
    icon: Compass,
    title: "Discover",
    description: "Browse workouts, challenges, and programs tailored to your goals. Find inspiration from the community.",
    tip: "Programs are multi-week training plans designed for specific goals like yours.",
    gradient: "from-purple-500 to-pink-400",
  },
  {
    id: "create-feature",
    icon: Plus,
    title: "Quick Create",
    description: "Tap the + button anytime to start a workout, log a PR, or ask your AI coach a question.",
    tip: "Your AI coach can generate workouts on the fly based on how you're feeling.",
    gradient: "from-energy to-orange-400",
  },
  {
    id: "circles-feature",
    icon: Users,
    title: "Circles",
    description: "Create or join workout groups with friends, family, or training partners. Share progress and stay accountable.",
    tip: "Invite your workout buddy to a circle to see each other's workouts!",
    gradient: "from-green-500 to-emerald-400",
  },
  {
    id: "you-feature",
    icon: User,
    title: "You",
    description: "Your profile shows PRs, skills, badges, and progress. This is where you track your fitness journey.",
    tip: "Keep your profile updated to get better workout recommendations.",
    gradient: "from-amber-500 to-yellow-400",
  },
];

function getRecommendedBadges(userData: UserData): RecommendedBadge[] {
  const recommendations: RecommendedBadge[] = [];
  const goalValue = typeof userData.primaryGoal === "string"
    ? userData.primaryGoal
    : userData.primaryGoal?.type;
  const goal = goalValue?.toLowerCase() || "";
  const prs = userData.personalRecords || [];

  // Helper to get PR value by exercise name (case-insensitive partial match)
  const getPRValue = (exercisePattern: string): number | undefined => {
    const pr = prs.find(p => 
      p.exerciseName.toLowerCase().includes(exercisePattern.toLowerCase())
    );
    return pr?.value;
  };

  // Get current PR values
  const benchPR = getPRValue("bench");
  const squatPR = getPRValue("squat");
  const deadliftPR = getPRValue("deadlift");
  const currentTotal = (benchPR || 0) + (squatPR || 0) + (deadliftPR || 0);

  // Always recommend consistency badges
  recommendations.push({
    name: "Week Warrior",
    description: "7 day workout streak",
    icon: "🔥",
    tier: "bronze",
    howToUnlock: "Complete a workout every day for a week",
  });

  // Goal-based recommendations with smart tier selection
  if (goal.includes("strength") || goal.includes("muscle")) {
    // Recommend next bench tier based on current PR
    const nextBench = getNextTier(benchPR, BENCH_TIERS);
    if (nextBench) {
      recommendations.push({
        name: nextBench.name,
        description: `Bench press ${nextBench.value} lbs`,
        icon: "🏋️",
        tier: nextBench.tier,
        howToUnlock: `Log a ${nextBench.value} lb bench press PR`,
      });
    }

    // Recommend next total tier based on current combined total
    const nextTotal = getNextTier(currentTotal, TOTAL_TIERS);
    if (nextTotal) {
      const remaining = nextTotal.value - currentTotal;
      recommendations.push({
        name: nextTotal.name,
        description: `Combined squat + bench + deadlift total of ${nextTotal.value} lbs`,
        icon: "🏆",
        tier: nextTotal.tier,
        howToUnlock: currentTotal > 0 
          ? `You need ${remaining} more lbs (current: ${currentTotal} lbs)`
          : `Get your squat + bench + deadlift total to ${nextTotal.value} lbs`,
      });
    }

    // Also recommend next squat or deadlift tier if they're lifting
    const nextSquat = getNextTier(squatPR, SQUAT_TIERS);
    if (nextSquat && squatPR) {
      recommendations.push({
        name: nextSquat.name,
        description: `Squat ${nextSquat.value} lbs`,
        icon: "🦵",
        tier: nextSquat.tier,
        howToUnlock: `Log a ${nextSquat.value} lb squat PR`,
      });
    }
  }

  if (goal.includes("lose") || goal.includes("weight") || goal.includes("fat")) {
    recommendations.push({
      name: "Century Club",
      description: "Complete 100 workouts",
      icon: "✅",
      tier: "gold",
      howToUnlock: "Keep showing up! Log 100 total workouts",
    });
    recommendations.push({
      name: "Sub-8 Minute Mile",
      description: "Run a mile in under 8 minutes",
      icon: "🏃",
      tier: "bronze",
      howToUnlock: "Log your mile time as a PR",
    });
  }

  if (goal.includes("skill") || goal.includes("learn")) {
    recommendations.push({
      name: "Muscle Up Master",
      description: "Achieve a muscle up",
      icon: "💪",
      tier: "gold",
      howToUnlock: "Mark muscle up skill as achieved",
    });
    recommendations.push({
      name: "Handstand Hero",
      description: "Freestanding handstand",
      icon: "🙌",
      tier: "silver",
      howToUnlock: "Mark handstand skill as achieved",
    });
  }

  if (goal.includes("sport") || goal.includes("athletic")) {
    recommendations.push({
      name: "Sub-60 400m",
      description: "Run 400m in under 60 seconds",
      icon: "🏃",
      tier: "silver",
      howToUnlock: "Log your 400m time",
    });
  }

  // Limit to 4 recommendations
  return recommendations.slice(0, 4);
}

export function PostLoginExperience({ userData, onComplete }: PostLoginExperienceProps) {
  const [currentStep, setCurrentStep] = useState<Step>("celebration");
  const [celebrationComplete, setCelebrationComplete] = useState(false);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  const earnedBadges = userData.earnedBadges || [];
  const hasBadges = earnedBadges.length > 0;
  const hasPRs = (userData.personalRecords?.length || 0) > 0;
  const recommendedBadges = getRecommendedBadges(userData);

  // Fire confetti for celebration
  const fireConfetti = useCallback((tier?: string) => {
    const colors = {
      bronze: ["#b45309", "#d97706", "#f59e0b"],
      silver: ["#6b7280", "#9ca3af", "#d1d5db"],
      gold: ["#eab308", "#facc15", "#fde047"],
      platinum: ["#22d3ee", "#06b6d4", "#0891b2"],
      default: ["#f97316", "#06b6d4", "#8b5cf6", "#10b981"],
    };

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.7 },
      colors: colors[tier as keyof typeof colors] || colors.default,
    });
  }, []);

  // Fire confetti on celebration step
  useEffect(() => {
    if (currentStep === "celebration" && !celebrationComplete) {
      const timer = setTimeout(() => {
        fireConfetti(earnedBadges[0]?.tier);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, celebrationComplete, earnedBadges, fireConfetti]);

  // Fire confetti when showing a new badge
  useEffect(() => {
    if (currentStep === "celebration" && currentBadgeIndex > 0 && hasBadges) {
      const timer = setTimeout(() => {
        fireConfetti(earnedBadges[currentBadgeIndex]?.tier);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentBadgeIndex, currentStep, earnedBadges, hasBadges, fireConfetti]);

  const handleNext = () => {
    setHasInteracted(true);
    
    if (currentStep === "celebration") {
      // If showing badges, cycle through them
      if (hasBadges && currentBadgeIndex < earnedBadges.length - 1) {
        setCurrentBadgeIndex(prev => prev + 1);
        return;
      }
      setCelebrationComplete(true);
      setCurrentStep("welcome");
      return;
    }

    const steps: Step[] = [
      "celebration",
      "welcome",
      "home-feature",
      "discover-feature",
      "create-feature",
      "circles-feature",
      "you-feature",
      "achievements-feature",
      "ai-coach-feature",
      "recommendations",
      "complete",
    ];

    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentFeature = FEATURE_STEPS.find(f => f.id === currentStep);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="post-login-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1 z-10"
        >
          Skip <X className="w-4 h-4" />
        </button>

        <motion.div
          key={currentStep}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-md bg-card rounded-3xl border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CELEBRATION STEP */}
          {currentStep === "celebration" && (
            <div className="p-6 text-center">
              {hasBadges ? (
                <>
                  {/* Badge celebration */}
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-center gap-2 mb-4"
                  >
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                      Achievement Unlocked!
                    </span>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-2xl"
                  >
                    <span className="text-5xl">{earnedBadges[currentBadgeIndex]?.icon}</span>
                  </motion.div>

                  <h2 className="text-2xl font-bold mb-2">{earnedBadges[currentBadgeIndex]?.name}</h2>
                  <p className="text-muted-foreground mb-2">{earnedBadges[currentBadgeIndex]?.description}</p>
                  
                  {earnedBadges.length > 1 && (
                    <p className="text-xs text-muted-foreground mb-4">
                      {currentBadgeIndex + 1} of {earnedBadges.length} achievements
                    </p>
                  )}
                </>
              ) : hasPRs ? (
                <>
                  {/* PR celebration */}
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-center gap-2 mb-4"
                  >
                    <Trophy className="w-5 h-5 text-energy" />
                    <span className="text-sm font-semibold text-energy uppercase tracking-wider">
                      Great Start!
                    </span>
                    <Trophy className="w-5 h-5 text-energy" />
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-energy to-orange-400 flex items-center justify-center shadow-2xl"
                  >
                    <span className="text-5xl">💪</span>
                  </motion.div>

                  <h2 className="text-2xl font-bold mb-2">
                    {userData.personalRecords?.length} PR{(userData.personalRecords?.length || 0) > 1 ? "s" : ""} Logged!
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    You&apos;re already tracking your progress. Keep hitting those PRs!
                  </p>
                </>
              ) : (
                <>
                  {/* Generic welcome celebration */}
                  <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-center gap-2 mb-4"
                  >
                    <Sparkles className="w-5 h-5 text-brand" />
                    <span className="text-sm font-semibold text-brand uppercase tracking-wider">
                      You&apos;re In!
                    </span>
                    <Sparkles className="w-5 h-5 text-brand" />
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand to-purple-400 flex items-center justify-center shadow-2xl"
                  >
                    <span className="text-5xl">🎉</span>
                  </motion.div>

                  <h2 className="text-2xl font-bold mb-2">Welcome, {userData.name}!</h2>
                  <p className="text-muted-foreground mb-4">
                    Your personalized fitness journey starts now.
                  </p>
                </>
              )}

              <Button
                onClick={handleNext}
                className="w-full h-12 text-lg rounded-xl bg-energy-gradient hover:opacity-90 text-white font-semibold"
              >
                {hasBadges && currentBadgeIndex < earnedBadges.length - 1 ? "Next Achievement" : "Let's Go!"}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* WELCOME STEP */}
          {currentStep === "welcome" && (
            <div className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand to-purple-400 flex items-center justify-center"
              >
                <Zap className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">Quick App Tour</h2>
              <p className="text-muted-foreground mb-6">
                Let me show you around. This will only take a minute.
              </p>

              <div className="flex justify-center gap-2 mb-6">
                {[Home, Compass, Plus, Users, User].map((Icon, i) => (
                  <div key={i} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-12 text-lg rounded-xl bg-energy-gradient hover:opacity-90 text-white font-semibold"
              >
                Show Me
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* FEATURE STEPS */}
          {currentFeature && (
            <div className="p-6">
              <div className={`h-2 absolute top-0 left-0 right-0 bg-gradient-to-r ${currentFeature.gradient}`} />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${currentFeature.gradient} flex items-center justify-center shadow-lg`}
              >
                <currentFeature.icon className="w-8 h-8 text-white" />
              </motion.div>

              <h2 className="text-xl font-bold text-center mb-2">{currentFeature.title}</h2>
              <p className="text-muted-foreground text-center mb-4">{currentFeature.description}</p>

              <div className="bg-muted/50 rounded-xl p-3 mb-6">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-energy mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Tip:</strong> {currentFeature.tip}</span>
                </p>
              </div>

              <Button
                onClick={handleNext}
                className={`w-full h-12 rounded-xl bg-gradient-to-r ${currentFeature.gradient} hover:opacity-90 text-white font-semibold`}
              >
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* ACHIEVEMENTS FEATURE */}
          {currentStep === "achievements-feature" && (
            <div className="p-6">
              <div className="h-2 absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-yellow-400" />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg"
              >
                <Trophy className="w-8 h-8 text-white" />
              </motion.div>

              <h2 className="text-xl font-bold text-center mb-2">Achievements</h2>
              <p className="text-muted-foreground text-center mb-4">
                Earn badges for hitting milestones, PRs, skills, and staying consistent. They show up on your profile!
              </p>

              <div className="grid grid-cols-4 gap-2 mb-6">
                {["🏋️", "🔥", "💪", "🏆"].map((icon, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted flex items-center justify-center">
                    <span className="text-2xl">{icon}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:opacity-90 text-white font-semibold"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* AI COACH FEATURE */}
          {currentStep === "ai-coach-feature" && (
            <div className="p-6">
              <div className="h-2 absolute top-0 left-0 right-0 bg-gradient-to-r from-brand to-purple-400" />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand to-purple-400 flex items-center justify-center shadow-lg"
              >
                <MessageCircle className="w-8 h-8 text-white" />
              </motion.div>

              <h2 className="text-xl font-bold text-center mb-2">AI Coach</h2>
              <p className="text-muted-foreground text-center mb-4">
                Ask me anything about workouts, form, nutrition, or training. I know your goals and can create custom workouts on the spot.
              </p>

              <div className="bg-muted/50 rounded-xl p-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Try asking:</strong> &quot;Create a 30-minute workout I can do at home&quot;
                </p>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-brand to-purple-400 hover:opacity-90 text-white font-semibold"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* RECOMMENDATIONS STEP */}
          {currentStep === "recommendations" && (
            <div className="p-6">
              <div className="h-2 absolute top-0 left-0 right-0 bg-energy-gradient" />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-energy-gradient flex items-center justify-center shadow-lg"
              >
                <Target className="w-8 h-8 text-white" />
              </motion.div>

              <h2 className="text-xl font-bold text-center mb-2">Achievements For You</h2>
              <p className="text-muted-foreground text-center mb-4">
                Based on your goals, here are some badges to work toward:
              </p>

              <div className="space-y-2 mb-6 max-h-[280px] overflow-y-auto">
                {recommendedBadges.map((badge, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <span className="text-2xl flex-shrink-0 mt-0.5">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-medium text-sm">{badge.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize flex-shrink-0">{badge.tier}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{badge.howToUnlock}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-12 rounded-xl bg-energy-gradient hover:opacity-90 text-white font-semibold"
              >
                Got It!
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* COMPLETE STEP */}
          {currentStep === "complete" && (
            <div className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-success to-emerald-400 flex items-center justify-center shadow-2xl"
              >
                <Star className="w-12 h-12 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
              <p className="text-muted-foreground mb-6">
                Time to crush some workouts. I&apos;ll be here if you need anything.
              </p>

              <Button
                onClick={onComplete}
                className="w-full h-12 text-lg rounded-xl bg-success hover:bg-success/90 text-white font-semibold"
              >
                Start Training
                <Dumbbell className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
