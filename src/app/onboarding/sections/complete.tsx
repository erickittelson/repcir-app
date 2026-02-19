"use client";

import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  AlertCircle,
  ChevronUp,
  Pencil,
  User,
  Target,
  Dumbbell,
  Heart,
  Calendar,
  AlertTriangle,
  Trophy,
  MapPin,
  Activity,
  MessageSquareText,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnboardingData } from "../page";

// Must match SECTIONS in page.tsx (same indexes, same required fields)
const SECTION_REQUIREMENTS = [
  { id: 0, name: "Name", fields: ["name"] },
  { id: 1, name: "Profile Photo", fields: ["profilePhotoAcknowledged"] },
  { id: 2, name: "Basics", fields: ["birthYear", "gender", "heightFeet", "weight"] },
  { id: 3, name: "Goals", fields: ["primaryGoal"] },
  { id: 4, name: "Fitness Level", fields: ["fitnessLevel"] },
  { id: 5, name: "Activity", fields: ["trainingFrequency"] },
  { id: 6, name: "Sports", fields: ["sportsAcknowledged"] },
  { id: 7, name: "PRs & Skills", fields: ["maxesAcknowledged"] },
  { id: 8, name: "Limitations", fields: ["limitationsAcknowledged"] },
  { id: 9, name: "Equipment", fields: ["gymLocations"] },
  { id: 10, name: "Preferences", fields: ["workoutDuration", "workoutDays"] },
  { id: 11, name: "Your Story", fields: ["personalContextAcknowledged"] },
];

// Helper to calculate age from birth year
const calculateAge = (birthYear?: number) => {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
};

// Helper to format height
const formatHeight = (feet?: number, inches?: number) => {
  if (!feet) return null;
  return `${feet}'${inches || 0}"`;
};

// Goal labels (must match goals.tsx GOALS array)
const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Lose weight",
  muscle_gain: "Build muscle",
  strength: "Get stronger",
  endurance: "Build endurance",
  athletic: "Athletic performance",
  flexibility: "Improve mobility",
  body_recomp: "Body recomp",
  health: "Overall health",
  energy: "More energy",
  stress: "Stress relief",
};

// Activity level labels (must match activity.tsx ACTIVITY_LEVELS)
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  active: "Very Active",
  very_active: "Extremely Active",
};

// Location labels (must match equipment.tsx LOCATION_TYPES)
const LOCATION_LABELS: Record<string, string> = {
  home: "Home Gym",
  commercial: "Commercial Gym",
  crossfit: "CrossFit Box",
  school: "School/University",
  outdoor: "Outdoor/Park",
};

// Helper to format goal
const formatGoal = (goal?: string) => {
  if (!goal) return null;
  return GOAL_LABELS[goal] || goal.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

// Helper to format training frequency
const formatFrequency = (freq: number) => {
  const map: Record<number, string> = {
    3: "2–3x per week",
    4: "3–4x per week",
    5: "4–5x per week",
    6: "6x per week",
  };
  return map[freq] || `${freq}x per week`;
};

// Helper to format workout duration from stored avgDuration
const formatDuration = (mins: number) => {
  if (mins <= 30) return "15–30 min";
  if (mins <= 60) return "45–60 min";
  if (mins <= 90) return "75–90 min";
  return "Varies";
};

// Helper to format PR values (stored as numbers, need to convert back)
const formatPRValue = (value: number, unit: string): string => {
  if (unit === "mm:ss") {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  if (unit === "hh:mm:ss") {
    const hrs = Math.floor(value / 3600);
    const mins = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  if (unit === "ss.ms") {
    return `${value}s`;
  }
  if (unit === "lbs") return `${value} lbs`;
  if (unit === "reps") return `${value} reps`;
  if (unit === "rounds") return `${value} rounds`;
  return `${value}`;
};

// Helper to format days
const formatDays = (days?: string[]) => {
  if (!days || days.length === 0) return null;
  const dayMap: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
    friday: "Fri", saturday: "Sat", sunday: "Sun"
  };
  return days.map(d => dayMap[d] || d).join(", ");
};

interface CompleteSectionProps {
  data: OnboardingData;
  onComplete: () => void;
  onScrollToSection: (index: number) => void;
  isSubmitting: boolean;
  isComplete: boolean;
}

export function CompleteSection({
  data,
  onComplete,
  onScrollToSection,
  isSubmitting,
  isComplete,
}: CompleteSectionProps) {
  // Check which sections are incomplete
  const getIncompleteSections = () => {
    return SECTION_REQUIREMENTS.filter((section) => {
      return section.fields.some((field) => {
        const value = data[field as keyof OnboardingData];
        if (Array.isArray(value)) return value.length === 0;
        return value === undefined || value === null || value === "";
      });
    });
  };

  const incompleteSections = getIncompleteSections();
  const isAllComplete = incompleteSections.length === 0;
  const firstIncomplete = incompleteSections[0];

  const handleGoToIncomplete = () => {
    if (firstIncomplete) {
      onScrollToSection(firstIncomplete.id);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-success-gradient flex items-center justify-center glow-success"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-display tracking-wider mb-2">DONE</h2>
            <p className="text-muted-foreground text-lg">
              Taking you to your dashboard...
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Not all sections complete - show what's missing
  if (!isAllComplete) {
    return (
      <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/20 flex items-center justify-center"
          >
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-display tracking-wider mb-2">
            INCOMPLETE
          </h2>
          <p className="text-muted-foreground mb-6">
            Finish these sections to proceed
          </p>

          {/* Missing sections */}
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <div className="space-y-2">
              {incompleteSections.map((section, index) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  onClick={() => onScrollToSection(section.id)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-amber-500/50 flex items-center justify-center">
                      <span className="text-xs text-amber-500">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium">{section.name}</span>
                  </div>
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGoToIncomplete}
            className="w-full h-12 text-lg bg-amber-500 hover:bg-amber-600 rounded-xl group"
          >
            <ChevronUp className="w-5 h-5 mr-2" />
            Go to {firstIncomplete?.name}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            {incompleteSections.length} section{incompleteSections.length > 1 ? "s" : ""} remaining
          </p>
        </motion.div>
      </div>
    );
  }

  // All complete - show comprehensive summary with edit options
  // Collect all selected goals for display
  const allGoals = [
    ...(data.primaryMotivation || []),
    ...(data.primaryGoal ? [data.primaryGoal] : []),
    ...(data.secondaryGoals || []),
  ].filter((g, i, arr) => arr.indexOf(g) === i);

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto w-full"
      >
        {/* Header with optional profile photo */}
        <div className="text-center mb-6">
          {data.profilePicture ? (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              src={data.profilePicture}
              alt=""
              className="w-20 h-20 mx-auto mb-4 rounded-full object-cover border-2 border-brand/20 shadow-xl"
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-card border border-brand/20 flex items-center justify-center shadow-xl glow-earned"
            >
              <Check className="w-8 h-8 text-brand" />
            </motion.div>
          )}

          <h2 className="text-2xl font-display tracking-wider mb-1">
            READY, {data.name?.toUpperCase()}
          </h2>
          <p className="text-muted-foreground text-sm">
            Review your profile before we begin
          </p>
        </div>

        {/* Profile Sections — every onboarding step is represented */}
        <div className="space-y-3 mb-6">
          {/* 0: Name */}
          <ReviewSection
            icon={<User className="w-4 h-4" />}
            title="Name"
            onEdit={() => onScrollToSection(0)}
            delay={0.05}
          >
            <span className="text-sm font-medium">{data.name || "—"}</span>
          </ReviewSection>

          {/* 1: Profile Photo */}
          <ReviewSection
            icon={<Camera className="w-4 h-4" />}
            title="Profile Photo"
            onEdit={() => onScrollToSection(1)}
            delay={0.08}
          >
            {data.profilePicture ? (
              <div className="flex items-center gap-2">
                <img src={data.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                <span className="text-xs text-muted-foreground">Photo uploaded</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Skipped — you can add one later</span>
            )}
          </ReviewSection>

          {/* 2: Basics (Age, Height, Weight) */}
          <ReviewSection
            icon={<User className="w-4 h-4" />}
            title="Age, Height & Weight"
            onEdit={() => onScrollToSection(2)}
            delay={0.11}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {data.gender && <ReviewItem label="Gender" value={data.gender} />}
              {data.birthYear && <ReviewItem label="Age" value={`${calculateAge(data.birthYear)} years`} />}
              {data.heightFeet && <ReviewItem label="Height" value={formatHeight(data.heightFeet, data.heightInches)} />}
              {data.weight && <ReviewItem label="Weight" value={`${data.weight} lbs`} />}
              {data.bodyFatPercentage && <ReviewItem label="Body Fat" value={`${data.bodyFatPercentage}%`} />}
            </div>
          </ReviewSection>

          {/* 3: Goals */}
          <ReviewSection
            icon={<Target className="w-4 h-4" />}
            title="Goals"
            onEdit={() => onScrollToSection(3)}
            delay={0.14}
          >
            {allGoals.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allGoals.map((goal) => (
                  <span key={goal} className="px-2 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium">
                    {formatGoal(goal)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No goals set</span>
            )}
          </ReviewSection>

          {/* 4: Fitness Level */}
          <ReviewSection
            icon={<Activity className="w-4 h-4" />}
            title="Fitness Level"
            onEdit={() => onScrollToSection(4)}
            delay={0.17}
          >
            <span className="text-sm font-medium capitalize">{data.fitnessLevel || "—"}</span>
          </ReviewSection>

          {/* 5: Frequency & Activity */}
          <ReviewSection
            icon={<Activity className="w-4 h-4" />}
            title="Frequency & Activity"
            onEdit={() => onScrollToSection(5)}
            delay={0.2}
          >
            <div className="space-y-1 text-sm">
              {data.trainingFrequency && (
                <ReviewItem label="Training" value={formatFrequency(data.trainingFrequency)} fullWidth />
              )}
              {data.activityLevel?.jobType && (
                <ReviewItem
                  label="Daily Activity"
                  value={ACTIVITY_LABELS[data.activityLevel.jobType] || data.activityLevel.jobType}
                  fullWidth
                />
              )}
            </div>
          </ReviewSection>

          {/* 6: Sports */}
          <ReviewSection
            icon={<Heart className="w-4 h-4" />}
            title="Sports & Activities"
            onEdit={() => onScrollToSection(6)}
            delay={0.23}
          >
            {data.sports && data.sports.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.sports.map((sport) => (
                  <span key={sport.id} className="px-2 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium">
                    {sport.icon} {sport.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">None added — you can add later</span>
            )}
          </ReviewSection>

          {/* 7: PRs & Skills */}
          <ReviewSection
            icon={<Trophy className="w-4 h-4" />}
            title="PRs & Skills"
            onEdit={() => onScrollToSection(7)}
            delay={0.26}
          >
            {data.currentMaxes && data.currentMaxes.length > 0 ? (() => {
              const lifts = data.currentMaxes!.filter((pr) => pr.unit !== "skill");
              const skills = data.currentMaxes!.filter((pr) => pr.unit === "skill");
              return (
                <div className="space-y-2">
                  {lifts.length > 0 && (
                    <div className="space-y-1 text-sm">
                      {lifts.map((pr, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-muted-foreground">{pr.exercise}</span>
                          <span className="font-medium">{formatPRValue(pr.value, pr.unit)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((pr, i) => (
                        <span key={i} className="px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                          {pr.exercise}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
              <span className="text-xs text-muted-foreground">None added — you can add later</span>
            )}
          </ReviewSection>

          {/* 8: Limitations */}
          <ReviewSection
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            title="Limitations"
            onEdit={() => onScrollToSection(8)}
            delay={0.29}
          >
            {data.limitations && data.limitations.length > 0 ? (
              <div className="space-y-1 text-sm">
                {data.limitations.map((lim, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-amber-500">&bull;</span>
                    <span className="capitalize">{lim.bodyPart.replace(/_/g, " ")}</span>
                    {lim.severity && (
                      <span className="text-xs text-muted-foreground">({lim.severity})</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">None — great!</span>
            )}
          </ReviewSection>

          {/* 9: Equipment & Gym Locations */}
          <ReviewSection
            icon={<Dumbbell className="w-4 h-4" />}
            title="Equipment & Gym"
            onEdit={() => onScrollToSection(9)}
            delay={0.32}
          >
            <div className="space-y-2">
              {data.gymLocations && data.gymLocations.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.gymLocations.map((loc) => (
                    <span key={loc} className="px-2 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium">
                      {LOCATION_LABELS[loc] || loc.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No locations set</span>
              )}
              {data.commercialGymDetails && data.commercialGymDetails.length > 0 && (
                <div className="space-y-1 text-sm">
                  {data.commercialGymDetails.map((gym, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">{gym.name}{gym.address ? ` — ${gym.address}` : ""}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.equipmentAccess && data.equipmentAccess.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.equipmentAccess.filter((eq) => eq !== "full_gym").slice(0, 8).map((eq) => (
                    <span key={eq} className="px-2 py-1 bg-muted rounded-full text-xs capitalize">
                      {eq.replace(/_/g, " ")}
                    </span>
                  ))}
                  {data.equipmentAccess.includes("full_gym") && (
                    <span className="px-2 py-1 bg-muted rounded-full text-xs">Full gym access</span>
                  )}
                </div>
              )}
            </div>
          </ReviewSection>

          {/* 10: Preferences (Schedule + City) */}
          <ReviewSection
            icon={<Calendar className="w-4 h-4" />}
            title="Schedule & Preferences"
            onEdit={() => onScrollToSection(10)}
            delay={0.35}
          >
            <div className="space-y-1 text-sm">
              {data.workoutDuration && (
                <ReviewItem label="Duration" value={formatDuration(data.workoutDuration)} fullWidth />
              )}
              {data.workoutDays && data.workoutDays.length > 0 && (
                <ReviewItem label="Days" value={formatDays(data.workoutDays)} fullWidth />
              )}
              {data.city && (
                <ReviewItem label="Location" value={[data.city, data.state].filter(Boolean).join(", ")} fullWidth />
              )}
            </div>
          </ReviewSection>

          {/* 11: Personal Context (Your Story) */}
          <ReviewSection
            icon={<MessageSquareText className="w-4 h-4" />}
            title="Your Story"
            onEdit={() => onScrollToSection(11)}
            delay={0.38}
          >
            {data.personalContext ? (
              <p className="text-sm text-muted-foreground line-clamp-3">{data.personalContext}</p>
            ) : (
              <span className="text-xs text-muted-foreground">Skipped — you can add context later</span>
            )}
          </ReviewSection>
        </div>

        {/* Start Button */}
        <div className="pt-4 pb-2">
          <Button
            onClick={onComplete}
            disabled={isSubmitting}
            className="w-full h-14 text-lg bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Building your profile...
              </>
            ) : (
              "Enter"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            You can always update these in settings
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Review Section Component
function ReviewSection({ 
  icon, 
  title, 
  children, 
  onEdit,
  delay = 0 
}: { 
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card rounded-xl border border-border p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <span className="font-medium text-sm">{title}</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      </div>
      {children}
    </motion.div>
  );
}

// Review Item Component
function ReviewItem({ 
  label, 
  value, 
  fullWidth = false 
}: { 
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  if (!value) return null;
  
  if (fullWidth) {
    return (
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium capitalize">{value}</span>
      </div>
    );
  }
  
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
