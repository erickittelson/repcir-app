"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AchievementModal } from "@/components/badges/achievement-modal";

// Section components
import { WelcomeSection } from "./sections/welcome";
import { ProfilePhotoSection } from "./sections/profile-photo";
import { BasicsSection } from "./sections/basics";
import { GoalsSection } from "./sections/goals";
import { FitnessLevelSection } from "./sections/fitness-level";
import { ActivitySection } from "./sections/activity";
import { SportsSection } from "./sections/sports";
import { MaxesSection } from "./sections/maxes";
import { LimitationsSection } from "./sections/limitations";
import { EquipmentSection } from "./sections/equipment";
import { PreferencesSection } from "./sections/preferences";
import { CompleteSection } from "./sections/complete";

// Types
export interface OnboardingData {
  // Welcome
  name?: string;
  // Profile
  profilePicture?: string;
  profilePhotoAcknowledged?: boolean; // true = uploaded or skipped
  // Basics
  birthMonth?: number;
  birthYear?: number;
  gender?: "male" | "female" | "other";
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  bodyFatPercentage?: number;
  // Motivation
  primaryMotivation?: string[];
  // Goals
  primaryGoal?: string;
  secondaryGoals?: string[];
  targetWeight?: number;
  specificGoals?: Array<{
    type: string;
    exercise?: string;
    targetValue?: number;
    targetUnit?: string;
    description?: string;
  }>;
  // Fitness
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  // Activity
  trainingFrequency?: number;
  activityLevel?: {
    jobType: string;
    dailySteps?: number;
    description?: string;
  };
  // Sports
  sports?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  sportsAcknowledged?: boolean;
  // Maxes
  currentMaxes?: Array<{
    exercise: string;
    value: number;
    unit: string;
  }>;
  maxesAcknowledged?: boolean; // true = added PRs or skipped
  // Limitations
  limitations?: Array<{
    bodyPart: string;
    condition?: string;
    severity?: string;
    movementsToAvoid?: string[];
  }>;
  limitationsAcknowledged?: boolean; // true = added limitations or said "no limitations"
  // Equipment & Gym Locations
  gymLocations?: string[]; // home, commercial, crossfit, school, outdoor
  equipmentAccess?: string[];
  equipmentDetails?: {
    dumbbells?: {
      available: boolean;
      type?: "fixed" | "adjustable" | "both";
      maxWeight?: number;
      weights?: number[];
    };
    barbell?: {
      available: boolean;
      type?: "standard" | "olympic";
      barWeight?: number;
      plates?: number[];
      totalPlateWeight?: number;
    };
    machines?: string[];
    cardio?: string[];
    notes?: string;
  };
  // Preferences
  workoutDuration?: number;
  workoutDays?: string[];
  city?: string;
  // Privacy
  profileVisibility?: "public" | "private";
}

const SECTIONS = [
  { id: "welcome", required: ["name"] },
  { id: "profile-photo", required: ["profilePhotoAcknowledged"] },
  { id: "basics", required: ["birthYear", "gender", "heightFeet", "weight"] },
  { id: "goals", required: ["primaryGoal"] },
  { id: "fitness-level", required: ["fitnessLevel"] },
  { id: "activity", required: ["trainingFrequency"] },
  { id: "sports", required: ["sportsAcknowledged"] },
  { id: "maxes", required: ["maxesAcknowledged"] },
  { id: "limitations", required: ["limitationsAcknowledged"] },
  { id: "equipment", required: ["gymLocations"] },
  { id: "preferences", required: ["workoutDuration", "workoutDays"] },
  { id: "complete", required: [] },
] as const;

const STORAGE_KEY = "onboarding_progress";

interface EarnedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlockMessage?: string;
  category?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved progress from database first, then localStorage as fallback
  useEffect(() => {
    const loadProgress = async () => {
      let loadedSection = 0;
      
      try {
        // First try to load from database
        const response = await fetch("/api/onboarding/progress");
        if (response.ok) {
          const { progress, completed } = await response.json();
          
          // If already completed, redirect
          if (completed) {
            router.push("/you");
            return;
          }
          
          if (progress) {
            setData((progress.extractedData as OnboardingData) || {});
            loadedSection = progress.phaseIndex || 0;
            setCurrentSection(loadedSection);
            setIsLoading(false);
            
            // Scroll to saved section after a short delay to let DOM render
            setTimeout(() => {
              const section = sectionRefs.current[loadedSection];
              if (section) {
                section.scrollIntoView({ behavior: "instant", block: "start" });
              }
            }, 100);
            return;
          }
        }
      } catch {
        // Database fetch failed, fall back to localStorage
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed.data || {});
          loadedSection = Math.min(parsed.currentSection || 0, SECTIONS.length - 1);
          setCurrentSection(loadedSection);
          
          // Scroll to saved section after a short delay
          setTimeout(() => {
            const section = sectionRefs.current[loadedSection];
            if (section) {
              section.scrollIntoView({ behavior: "instant", block: "start" });
            }
          }, 100);
        } catch {
          // Invalid data, start fresh
        }
      }
      setIsLoading(false);
    };

    loadProgress();
  }, [router]);

  // Save progress to localStorage immediately, and debounce save to database
  useEffect(() => {
    if (isLoading || Object.keys(data).length === 0) return;

    // Save to localStorage immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, currentSection }));

    // Debounce save to database (500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/onboarding/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentSection, data }),
        });
      } catch {
        // Silent fail - localStorage is the backup
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, currentSection, isLoading]);

  // Calculate progress percentage
  const calculateProgress = useCallback(() => {
    const requiredFields = SECTIONS.flatMap((s) => s.required);
    const completedFields = requiredFields.filter((field) => {
      const value = data[field as keyof OnboardingData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    });
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }, [data]);

  // Scroll to section
  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index];
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentSection(index);
    }
  }, []);

  // Handle section completion
  const handleNext = useCallback(() => {
    if (currentSection < SECTIONS.length - 1) {
      scrollToSection(currentSection + 1);
    }
  }, [currentSection, scrollToSection]);

  // Handle data update
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle final submission
  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to complete onboarding");
      }

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      setIsComplete(true);

      // Check for newly earned badges
      try {
        const badgeResponse = await fetch("/api/badges/check", { method: "POST" });
        if (badgeResponse.ok) {
          const { newBadges } = await badgeResponse.json();
          if (newBadges && newBadges.length > 0) {
            setEarnedBadges(newBadges);
            setShowBadgeModal(true);
            return; // Don't redirect yet, wait for modal completion
          }
        }
      } catch {
        // Badge check failed, continue with redirect
      }

      // Redirect after celebration (if no badges)
      setTimeout(() => {
        window.scrollTo(0, 0);
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle badge modal completion
  const handleBadgeModalComplete = () => {
    setShowBadgeModal(false);
    window.scrollTo(0, 0);
    router.push("/dashboard");
    router.refresh();
  };

  // Handle scroll snap to update current section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sectionHeight = window.innerHeight;
      const newSection = Math.round(scrollTop / sectionHeight);
      if (newSection !== currentSection && newSection >= 0 && newSection < SECTIONS.length) {
        setCurrentSection(newSection);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentSection]);

  const progressPercent = calculateProgress();

  // Show loading state while fetching progress
  if (isLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center mesh-gradient">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background overflow-hidden relative pt-safe-area pb-safe-area mesh-gradient">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <motion.div
          className="h-full bg-energy-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Progress Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-card/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50 shadow-lg">
          <span className="text-sm font-medium tabular-nums">{progressPercent}%</span>
        </div>
      </div>

      {/* Section Dots */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-2">
        {SECTIONS.map((section, index) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentSection
                ? "bg-brand scale-125"
                : index < currentSection
                ? "bg-success"
                : "bg-muted-foreground/30"
            )}
            aria-label={`Go to ${section.id} section`}
          />
        ))}
      </div>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* Welcome Section */}
        <section
          ref={(el) => { sectionRefs.current[0] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <WelcomeSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Profile Photo Section */}
        <section
          ref={(el) => { sectionRefs.current[1] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <ProfilePhotoSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Basics Section */}
        <section
          ref={(el) => { sectionRefs.current[2] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <BasicsSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Goals Section */}
        <section
          ref={(el) => { sectionRefs.current[3] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <GoalsSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Fitness Level Section */}
        <section
          ref={(el) => { sectionRefs.current[4] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <FitnessLevelSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Activity Section */}
        <section
          ref={(el) => { sectionRefs.current[5] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <ActivitySection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Sports Section */}
        <section
          ref={(el) => { sectionRefs.current[6] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <SportsSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Maxes Section */}
        <section
          ref={(el) => { sectionRefs.current[7] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <MaxesSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Limitations Section */}
        <section
          ref={(el) => { sectionRefs.current[8] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <LimitationsSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Equipment Section */}
        <section
          ref={(el) => { sectionRefs.current[9] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <EquipmentSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Preferences Section */}
        <section
          ref={(el) => { sectionRefs.current[10] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <PreferencesSection
            data={data}
            onUpdate={updateData}
            onNext={handleNext}
          />
        </section>

        {/* Complete Section */}
        <section
          ref={(el) => { sectionRefs.current[11] = el; }}
          className="h-[100dvh] snap-start snap-always"
        >
          <CompleteSection
            data={data}
            onComplete={handleComplete}
            onScrollToSection={scrollToSection}
            isSubmitting={isSubmitting}
            isComplete={isComplete}
          />
        </section>
      </div>

      {/* Scroll Hint (only on first section) */}
      <AnimatePresence>
        {currentSection === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 safe-area-inset-bottom"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1 text-muted-foreground"
            >
              <span className="text-xs">Scroll or tap Continue</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Celebration Modal */}
      {showBadgeModal && earnedBadges.length > 0 && (
        <AchievementModal
          badges={earnedBadges}
          onComplete={handleBadgeModalComplete}
        />
      )}
    </div>
  );
}
