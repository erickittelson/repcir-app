"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Menu, X, Check, Loader2 } from "lucide-react";
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
  profilePhotoAcknowledged?: boolean;
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
  maxesAcknowledged?: boolean;
  // Limitations
  limitations?: Array<{
    bodyPart: string;
    condition?: string;
    severity?: string;
    movementsToAvoid?: string[];
  }>;
  limitationsAcknowledged?: boolean;
  // Equipment & Gym Locations
  gymLocations?: string[];
  commercialGymDetails?: Array<{
    locationType: string;
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  }>;
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
  state?: string;
  country?: string;
  // Privacy
  profileVisibility?: "public" | "private";
}

// Section metadata for navigation drawer
const SECTIONS = [
  { id: "welcome", label: "Your Name", group: "Profile", required: ["name"] },
  { id: "profile-photo", label: "Photo", group: "Profile", required: ["profilePhotoAcknowledged"] },
  { id: "basics", label: "Age, Height & Weight", group: "Profile", required: ["birthYear", "gender", "heightFeet", "weight"] },
  { id: "goals", label: "Goals", group: "Training", required: ["primaryGoal"] },
  { id: "fitness-level", label: "Fitness Level", group: "Training", required: ["fitnessLevel"] },
  { id: "activity", label: "Frequency & Activity", group: "Training", required: ["trainingFrequency"] },
  { id: "sports", label: "Sports", group: "Training", required: ["sportsAcknowledged"] },
  { id: "maxes", label: "PRs & Skills", group: "Training", required: ["maxesAcknowledged"] },
  { id: "limitations", label: "Limitations", group: "Setup", required: ["limitationsAcknowledged"] },
  { id: "equipment", label: "Equipment", group: "Setup", required: ["gymLocations"] },
  { id: "preferences", label: "Preferences", group: "Setup", required: ["workoutDuration", "workoutDays"] },
  { id: "complete", label: "Review & Finish", group: "Setup", required: [] },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch("/api/onboarding/progress");
        if (response.ok) {
          const { progress, completed } = await response.json();
          if (completed) { router.push("/you"); return; }
          if (progress) {
            setData((progress.extractedData as OnboardingData) || {});
            setCurrentSection(progress.phaseIndex || 0);
            setIsLoading(false);
            return;
          }
        }
      } catch { /* fall back to localStorage */ }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed.data || {});
          setCurrentSection(Math.min(parsed.currentSection || 0, SECTIONS.length - 1));
        } catch { /* start fresh */ }
      }
      setIsLoading(false);
    };
    loadProgress();
  }, [router]);

  // Save progress
  useEffect(() => {
    if (isLoading || Object.keys(data).length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, currentSection }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/onboarding/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentSection, data }),
        });
      } catch { /* silent */ }
    }, 500);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [data, currentSection, isLoading]);

  const calculateProgress = useCallback(() => {
    const requiredFields = SECTIONS.flatMap((s) => s.required);
    const completedFields = requiredFields.filter((field) => {
      const value = data[field as keyof OnboardingData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    });
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }, [data]);

  const handleNext = useCallback(() => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection((prev) => prev + 1);
    }
  }, [currentSection]);

  const handleBack = useCallback(() => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  }, [currentSection]);

  const goToSection = useCallback((index: number) => {
    if (index >= 0 && index < SECTIONS.length) {
      setCurrentSection(index);
      setDrawerOpen(false);
    }
  }, []);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Check if a section is complete
  const isSectionComplete = useCallback((index: number) => {
    const section = SECTIONS[index];
    return section.required.every((field) => {
      const value = data[field as keyof OnboardingData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    });
  }, [data]);

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
      localStorage.removeItem(STORAGE_KEY);
      setIsComplete(true);

      try {
        const badgeResponse = await fetch("/api/badges/check", { method: "POST" });
        if (badgeResponse.ok) {
          const { newBadges } = await badgeResponse.json();
          if (newBadges && newBadges.length > 0) {
            setEarnedBadges(newBadges);
            setShowBadgeModal(true);
            return;
          }
        }
      } catch { /* continue */ }

      setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 2000);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBadgeModalComplete = () => {
    setShowBadgeModal(false);
    router.push("/dashboard");
    router.refresh();
  };

  const progressPercent = calculateProgress();

  function renderSection() {
    const props = { data, onUpdate: updateData, onNext: handleNext, onBack: handleBack };
    switch (SECTIONS[currentSection].id) {
      case "welcome": return <WelcomeSection {...props} />;
      case "profile-photo": return <ProfilePhotoSection {...props} />;
      case "basics": return <BasicsSection {...props} />;
      case "goals": return <GoalsSection {...props} />;
      case "fitness-level": return <FitnessLevelSection {...props} />;
      case "activity": return <ActivitySection {...props} />;
      case "sports": return <SportsSection {...props} />;
      case "maxes": return <MaxesSection {...props} />;
      case "limitations": return <LimitationsSection {...props} />;
      case "equipment": return <EquipmentSection {...props} />;
      case "preferences": return <PreferencesSection {...props} />;
      case "complete":
        return (
          <CompleteSection
            data={data}
            onComplete={handleComplete}
            onScrollToSection={goToSection}
            isSubmitting={isSubmitting}
            isComplete={isComplete}
          />
        );
      default: return null;
    }
  }

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

  // Group sections for the drawer
  const groups = ["Profile", "Training", "Setup"] as const;

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

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-3 pb-2">
        {/* Menu button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="bg-card/80 backdrop-blur-sm rounded-full p-2 border border-border/50 shadow-lg hover:bg-card transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Progress */}
        <div className="bg-card/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50 shadow-lg">
          <span className="text-sm font-medium tabular-nums">{progressPercent}%</span>
        </div>
      </div>

      {/* Navigation Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-[60]"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-card z-[70] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-sm">Onboarding</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {groups.map((group) => (
                  <div key={group} className="mb-1">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group}
                    </div>
                    {SECTIONS.map((section, index) => {
                      if (section.group !== group) return null;
                      const complete = isSectionComplete(index);
                      const isCurrent = index === currentSection;
                      // Allow navigating to completed sections or the next available one
                      const canNavigate = index <= currentSection || complete;

                      return (
                        <button
                          key={section.id}
                          onClick={() => canNavigate && goToSection(index)}
                          disabled={!canNavigate}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                            isCurrent && "bg-brand/10 text-brand",
                            !isCurrent && canNavigate && "hover:bg-muted",
                            !canNavigate && "opacity-40 cursor-default",
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px]",
                            complete ? "bg-brand border-brand" : isCurrent ? "border-brand" : "border-border",
                          )}>
                            {complete && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={cn(
                            isCurrent && "font-medium",
                          )}>
                            {section.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Current Section */}
      <AnimatePresence mode="wait">
        <motion.div
          key={SECTIONS[currentSection].id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="h-full overflow-y-auto pt-12 pb-safe-area"
        >
          {renderSection()}
        </motion.div>
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
