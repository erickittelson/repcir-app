"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Ruler,
  Scale,
  Activity,
  Target,
  AlertTriangle,
  Trophy,
  Calendar,
  Dumbbell,
  ChevronRight,
  Check,
  Pencil,
  X,
  Sparkles,
  Heart,
  Clock,
  MapPin,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ExtractedProfileData {
  name?: string;
  profilePicture?: string;
  birthMonth?: number;
  birthYear?: number;
  gender?: "male" | "female" | "other";
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  city?: string;
  bodyFatPercentage?: number;
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  primaryMotivation?: string[];
  primaryGoal?: {
    type: string;
    description: string;
    targetValue?: number;
    targetUnit?: string;
  };
  secondaryGoals?: string[];
  timeline?: string;
  targetWeight?: number;
  // Activity level - daily routine outside of workouts
  activityLevel?: {
    jobType: "sedentary" | "light" | "moderate" | "active" | "very_active";
    dailySteps?: number;
    description?: string;
  };
  limitations?: Array<{
    bodyPart: string;
    condition: string;
    severity?: "mild" | "moderate" | "severe";
    avoidMovements?: string[];
  }>;
  // Specific goals - PRs, sport skills, performance targets
  specificGoals?: Array<{
    type: "pr" | "skill" | "time" | "other";
    exercise?: string; // e.g., "Bench Press", "40 yard dash", "Mile run"
    targetValue?: number;
    targetUnit?: string; // e.g., "lbs", "seconds", "minutes"
    description?: string; // Free text for custom goals like "learn to backflip"
  }>;
  // Current assessed maxes - for AI workout programming
  currentMaxes?: Array<{
    exercise: string;
    value: number | "working_on" | "mastered" | "consistent"; // number for measurable, string for skills
    unit: "lbs" | "reps" | "seconds" | "min:sec" | "skill";
    isCustom?: boolean;
  }>;
  personalRecords?: Array<{
    exercise: string;
    value: number;
    unit: string;
    isEstimate?: boolean;
  }>;
  workoutDuration?: number;
  equipmentAccess?: string[];
  workoutDays?: string[];
  trainingFrequency?: number;
  currentActivity?: string;
  profileVisibility?: "public" | "private";
  // Internal flag - has user seen the welcome intro modal
  seenIntro?: boolean;
}

// Phase configuration - matches onboarding conversation flow
interface PhaseConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  fields: Array<{
    key: keyof ExtractedProfileData;
    label: string;
    format?: (value: unknown, data: ExtractedProfileData) => string;
  }>;
}

// Helper to calculate age from birth month/year
function calculateAge(birthMonth?: number, birthYear?: number): string {
  if (!birthMonth || !birthYear) return "—";
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth) {
    age--;
  }
  return `${age} years`;
}

const PHASES: PhaseConfig[] = [
  {
    id: "welcome",
    label: "Getting Started",
    icon: <Sparkles className="w-4 h-4" />,
    fields: [
      { key: "name", label: "Name" },
      {
        key: "profilePicture",
        label: "Photo",
        format: (v) => v ? "Uploaded" : "—",
      },
    ],
  },
  {
    id: "motivation",
    label: "Motivation",
    icon: <Heart className="w-4 h-4" />,
    fields: [
      {
        key: "primaryMotivation",
        label: "Why You're Here",
        format: (v) => Array.isArray(v) ? v.join(", ") : String(v),
      },
    ],
  },
  {
    id: "basics",
    label: "Basic Info",
    icon: <Calendar className="w-4 h-4" />,
    fields: [
      {
        key: "birthYear",
        label: "Age",
        format: (v, data) => calculateAge(data.birthMonth, data.birthYear),
      },
      {
        key: "gender",
        label: "Gender",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "heightFeet",
        label: "Height",
        format: (v, data) =>
          data.heightInches !== undefined
            ? `${v}'${data.heightInches}"`
            : `${v} ft`,
      },
      { key: "weight", label: "Weight", format: (v) => `${v} lbs` },
    ],
  },
  {
    id: "location",
    label: "Location",
    icon: <MapPin className="w-4 h-4" />,
    fields: [
      { key: "city", label: "City" },
    ],
  },
  {
    id: "body_composition",
    label: "Body Composition",
    icon: <Scale className="w-4 h-4" />,
    fields: [
      { key: "bodyFatPercentage", label: "Body Fat", format: (v) => `~${v}%` },
      { key: "targetWeight", label: "Target Weight", format: (v) => `${v} lbs` },
    ],
  },
  {
    id: "fitness_background",
    label: "Fitness Level",
    icon: <Activity className="w-4 h-4" />,
    fields: [
      {
        key: "fitnessLevel",
        label: "Experience",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "trainingFrequency",
        label: "Training Days",
        format: (v) => `${v}x per week`,
      },
      {
        key: "activityLevel",
        label: "Daily Activity",
        format: (v) => {
          const activity = v as ExtractedProfileData["activityLevel"];
          if (!activity) return "—";
          const jobLabels: Record<string, string> = {
            sedentary: "Sedentary (desk job)",
            light: "Lightly active",
            moderate: "Moderately active",
            active: "Active",
            very_active: "Very active",
          };
          let result = jobLabels[activity.jobType] || activity.jobType;
          if (activity.dailySteps) {
            result += ` • ~${activity.dailySteps.toLocaleString()} steps`;
          }
          return result;
        },
      },
    ],
  },
  {
    id: "limitations",
    label: "Limitations",
    icon: <AlertTriangle className="w-4 h-4" />,
    fields: [], // Special handling for limitations array
  },
  {
    id: "current_maxes",
    label: "Current Maxes",
    icon: <Dumbbell className="w-4 h-4" />,
    fields: [], // Special handling for currentMaxes array
  },
  {
    id: "goals",
    label: "Goals",
    icon: <Target className="w-4 h-4" />,
    fields: [], // Special handling for specificGoals array
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: <Dumbbell className="w-4 h-4" />,
    fields: [
      {
        key: "workoutDuration",
        label: "Workout Length",
        format: (v) => `${v} min`,
      },
      {
        key: "equipmentAccess",
        label: "Equipment",
        format: (v) => (Array.isArray(v) ? v.slice(0, 2).join(", ") + (v.length > 2 ? "..." : "") : String(v)),
      },
      {
        key: "workoutDays",
        label: "Preferred Days",
        format: (v) => (Array.isArray(v) ? v.slice(0, 3).join(", ") + (v.length > 3 ? "..." : "") : String(v)),
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: <Lock className="w-4 h-4" />,
    fields: [
      {
        key: "profileVisibility",
        label: "Profile Visibility",
        format: (v) => v === "public" ? "Public" : "Private",
      },
    ],
  },
];

interface ProfilePanelProps {
  data: ExtractedProfileData;
  currentPhase: string;
  onEdit?: (key: string, currentValue: unknown) => void;
  onReviewClick?: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Map API phase names to panel phase IDs
const PHASE_TO_PANEL_MAP: Record<string, string> = {
  welcome: "welcome",
  profile_setup: "welcome",
  motivation: "motivation",
  basics: "basics",
  location: "location",
  body_composition: "body_composition",
  fitness_background: "fitness_background",
  limitations: "limitations",
  current_maxes: "current_maxes",
  goals: "goals",
  preferences: "preferences",
  privacy: "privacy",
  wrap_up: "privacy",
};

export function ProfilePanel({
  data,
  currentPhase,
  onEdit,
  onReviewClick,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: ProfilePanelProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>("welcome");
  const [userOverride, setUserOverride] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const prevDataRef = useRef<ExtractedProfileData>({});
  const prevPhaseRef = useRef<string>(currentPhase);

  // Auto-expand the section matching the current chat phase
  useEffect(() => {
    const panelPhase = PHASE_TO_PANEL_MAP[currentPhase] || currentPhase;

    // If phase changed, reset user override and expand current phase section
    if (currentPhase !== prevPhaseRef.current) {
      setUserOverride(false);
      setExpandedPhase(panelPhase);
      prevPhaseRef.current = currentPhase;
    } else if (!userOverride) {
      // If no user override, keep expanding current phase
      setExpandedPhase(panelPhase);
    }
  }, [currentPhase, userOverride]);

  // Handle user manually clicking to expand/collapse a section
  const handleTogglePhase = (phaseId: string) => {
    const isCurrentlyExpanded = expandedPhase === phaseId;
    setUserOverride(true);
    setExpandedPhase(isCurrentlyExpanded ? null : phaseId);
  };

  // Track data changes for subtle highlight effect
  useEffect(() => {
    const newUpdates = new Set<string>();

    // Check each field for changes
    for (const phase of PHASES) {
      for (const field of phase.fields) {
        const prevValue = prevDataRef.current[field.key];
        const currValue = data[field.key];

        if (currValue !== undefined && currValue !== prevValue) {
          newUpdates.add(field.key);
        }
      }

      // Check special arrays
      if (phase.id === "limitations") {
        const prevLim = prevDataRef.current.limitations;
        const currLim = data.limitations;
        if (JSON.stringify(currLim) !== JSON.stringify(prevLim) && currLim?.length) {
          newUpdates.add("limitations");
        }
      }

      if (phase.id === "current_maxes") {
        const prevMaxes = prevDataRef.current.currentMaxes;
        const currMaxes = data.currentMaxes;
        if (JSON.stringify(currMaxes) !== JSON.stringify(prevMaxes) && currMaxes !== undefined) {
          newUpdates.add("currentMaxes");
        }
      }

      if (phase.id === "goals") {
        const prevGoals = prevDataRef.current.specificGoals;
        const currGoals = data.specificGoals;
        if (JSON.stringify(currGoals) !== JSON.stringify(prevGoals) && currGoals !== undefined) {
          newUpdates.add("specificGoals");
        }
      }
    }

    if (newUpdates.size > 0) {
      setRecentlyUpdated(newUpdates);

      // Clear highlights after animation
      const timeout = setTimeout(() => {
        setRecentlyUpdated(new Set());
      }, 2000);

      prevDataRef.current = { ...data };
      return () => clearTimeout(timeout);
    }

    prevDataRef.current = { ...data };
  }, [data]);

  // Get phase progress
  const getPhaseProgress = (phase: PhaseConfig) => {
    if (phase.id === "limitations") {
      // limitations is tracked as having data even if empty array (user explicitly said none)
      const hasData = data.limitations !== undefined;
      return {
        filled: hasData ? 1 : 0,
        total: 1,
        hasData,
      };
    }
    if (phase.id === "current_maxes") {
      // currentMaxes is tracked as having data even if empty array (user explicitly said none)
      const hasData = data.currentMaxes !== undefined;
      return {
        filled: hasData ? 1 : 0,
        total: 1,
        hasData,
      };
    }
    if (phase.id === "goals") {
      // specificGoals is tracked as having data even if empty array (user explicitly said none)
      const hasData = data.specificGoals !== undefined;
      return {
        filled: hasData ? 1 : 0,
        total: 1,
        hasData,
      };
    }

    const filledCount = phase.fields.filter(
      (f) => data[f.key] !== undefined
    ).length;
    return {
      filled: filledCount,
      total: phase.fields.length,
      hasData: filledCount > 0,
    };
  };

  // Get total progress
  const allFields = PHASES.flatMap((p) => p.fields);
  const filledFields = allFields.filter((f) => data[f.key] !== undefined).length;
  const totalFields = allFields.length;
  // Add special fields (limitations, currentMaxes, goals are handled as special arrays)
  const totalWithSpecial = totalFields + 3; // limitations + currentMaxes + goals
  const filledWithSpecial = filledFields +
    (data.limitations !== undefined ? 1 : 0) +
    (data.currentMaxes !== undefined ? 1 : 0) +
    (data.specificGoals !== undefined ? 1 : 0);
  const progressPercent = Math.round((filledWithSpecial / totalWithSpecial) * 100);

  // Collapsed view
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 320 }}
        animate={{ width: 56 }}
        className={cn(
          "h-full flex flex-col items-center py-4 border-r border-border/50",
          "bg-sidebar",
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Phase indicators */}
        <div className="flex flex-col gap-2">
          {PHASES.map((phase) => {
            const progress = getPhaseProgress(phase);
            const isComplete = progress.filled === progress.total && progress.total > 0;
            const isActive = currentPhase === phase.id;
            return (
              <div
                key={phase.id}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "transition-all duration-200",
                  isComplete
                    ? "bg-success/20 text-success"
                    : progress.hasData
                    ? "bg-brand/20 text-brand"
                    : isActive
                    ? "bg-muted text-foreground ring-1 ring-brand/50"
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : phase.icon}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 56 }}
      animate={{ width: 320 }}
      className={cn(
        "h-full flex flex-col border-r border-border/50",
        "bg-sidebar",
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Your Profile</h2>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Phases in sequential order */}
      <div className="flex-1 overflow-y-auto py-2">
        {PHASES.map((phase, phaseIdx) => {
          const progress = getPhaseProgress(phase);
          const isExpanded = expandedPhase === phase.id;
          const isCurrentPhase = currentPhase === phase.id;
          const hasUpdates = phase.fields.some((f) => recentlyUpdated.has(f.key)) ||
            (phase.id === "limitations" && recentlyUpdated.has("limitations")) ||
            (phase.id === "current_maxes" && recentlyUpdated.has("currentMaxes")) ||
            (phase.id === "goals" && recentlyUpdated.has("specificGoals"));

          return (
            <div key={phase.id} className="mb-1">
              {/* Phase header */}
              <button
                onClick={() => handleTogglePhase(phase.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3",
                  "hover:bg-accent/50 transition-all duration-200",
                  isExpanded && "bg-accent/30",
                  hasUpdates && "bg-brand/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      "transition-all duration-200",
                      progress.filled === progress.total && progress.total > 0
                        ? "bg-success/20 text-success"
                        : progress.hasData
                        ? "bg-brand/20 text-brand"
                        : isCurrentPhase
                        ? "bg-muted text-foreground ring-1 ring-brand/50"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {progress.filled === progress.total && progress.total > 0 ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      phase.icon
                    )}
                  </div>
                  <div className="text-left">
                    <p className={cn(
                      "text-sm font-medium",
                      progress.hasData ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {phase.label}
                    </p>
                    {progress.total > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {progress.filled} of {progress.total}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* Phase fields */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {/* Regular fields */}
                      {phase.fields.map((field) => {
                        const value = data[field.key];
                        const isFilled = value !== undefined;
                        const isRecentlyUpdated = recentlyUpdated.has(field.key);
                        const displayValue = isFilled
                          ? field.format
                            ? field.format(value, data)
                            : String(value)
                          : "—";

                        return (
                          <motion.div
                            key={field.key}
                            initial={isRecentlyUpdated ? { backgroundColor: "oklch(0.65 0.28 280 / 0.08)" } : false}
                            animate={{ backgroundColor: "transparent" }}
                            transition={{ duration: 0.8 }}
                            className={cn(
                              "group flex items-center justify-between py-2 px-3 rounded-lg",
                              "transition-colors duration-200",
                              isFilled && "hover:bg-accent/30",
                              !isFilled && "opacity-50"
                            )}
                          >
                            <span className="text-sm text-muted-foreground">
                              {field.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-medium truncate max-w-[120px]",
                                  isFilled ? "text-foreground" : "text-muted-foreground"
                                )}
                              >
                                {displayValue}
                              </span>
                              {isFilled && onEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(field.key, value)}
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Limitations special handling */}
                      {phase.id === "limitations" && (
                        <div className="group">
                          <div className="flex items-center justify-between" style={{ marginBottom: "0.5rem" }}>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Injuries/Limitations</span>
                            {data.limitations !== undefined && onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit("limitations", data.limitations)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {data.limitations && data.limitations.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {data.limitations.map((lim, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 py-2 px-3 rounded-lg bg-destructive/10"
                                >
                                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                  <div className="text-sm">
                                    <p className="font-medium text-foreground">
                                      {lim.bodyPart}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {lim.condition}
                                      {lim.severity && ` (${lim.severity})`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : data.limitations !== undefined ? (
                            <button
                              onClick={() => onEdit?.("limitations", data.limitations)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group/add"
                            >
                              <span className="text-sm text-muted-foreground">No limitations</span>
                              <span className="text-xs text-brand ml-2 opacity-0 group-hover/add:opacity-100 transition-opacity">
                                + Add
                              </span>
                            </button>
                          ) : (
                            <p className="text-sm text-muted-foreground px-3 py-2 opacity-50">
                              Not discussed yet
                            </p>
                          )}
                        </div>
                      )}

                      {/* Current maxes special handling */}
                      {phase.id === "current_maxes" && (
                        <div className="group">
                          <div className="flex items-center justify-between" style={{ marginBottom: "0.5rem" }}>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Your Maxes</span>
                            {data.currentMaxes !== undefined && onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit("currentMaxes", data.currentMaxes)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {data.currentMaxes && data.currentMaxes.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {data.currentMaxes.map((max, idx) => {
                                const isSkill = max.unit === "skill";
                                const skillLabel = isSkill
                                  ? max.value === "mastered" ? "Mastered"
                                    : max.value === "consistent" ? "Consistent"
                                    : "Working On"
                                  : null;
                                const skillColor = isSkill
                                  ? max.value === "mastered" ? "bg-green-500/20 text-green-600"
                                    : max.value === "consistent" ? "bg-blue-500/20 text-blue-600"
                                    : "bg-amber-500/20 text-amber-600"
                                  : "bg-brand/10";

                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "flex items-center justify-between py-2 px-3 rounded-lg",
                                      skillColor
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Dumbbell className="w-4 h-4 text-brand" />
                                      <span className="text-sm text-foreground">
                                        {max.exercise}
                                      </span>
                                    </div>
                                    {isSkill ? (
                                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-current/10">
                                        ✓ {skillLabel}
                                      </span>
                                    ) : (
                                      <span className="text-sm font-medium text-brand">
                                        {max.value} {max.unit}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : data.currentMaxes !== undefined ? (
                            <button
                              onClick={() => onEdit?.("currentMaxes", data.currentMaxes)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group/add"
                            >
                              <span className="text-sm text-muted-foreground">No maxes recorded</span>
                              <span className="text-xs text-brand ml-2 opacity-0 group-hover/add:opacity-100 transition-opacity">
                                + Add
                              </span>
                            </button>
                          ) : (
                            <p className="text-sm text-muted-foreground px-3 py-2 opacity-50">
                              Not discussed yet
                            </p>
                          )}
                        </div>
                      )}

                      {/* Goals special handling */}
                      {phase.id === "goals" && (
                        <div className="group">
                          <div className="flex items-center justify-between" style={{ marginBottom: "0.5rem" }}>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Performance Goals</span>
                            {data.specificGoals !== undefined && onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit("specificGoals", data.specificGoals)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {data.specificGoals && data.specificGoals.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {data.specificGoals.map((goal, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-brand" />
                                    <span className="text-sm text-foreground">
                                      {goal.exercise || goal.description}
                                    </span>
                                  </div>
                                  {goal.targetValue && (
                                    <span className="text-sm font-medium text-brand">
                                      → {goal.targetValue} {goal.targetUnit}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : data.specificGoals !== undefined ? (
                            <button
                              onClick={() => onEdit?.("specificGoals", data.specificGoals)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group/add"
                            >
                              <span className="text-sm text-muted-foreground">No specific targets set</span>
                              <span className="text-xs text-brand ml-2 opacity-0 group-hover/add:opacity-100 transition-opacity">
                                + Add
                              </span>
                            </button>
                          ) : (
                            <p className="text-sm text-muted-foreground px-3 py-2 opacity-50">
                              Not discussed yet
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Review button */}
      {filledWithSpecial >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 p-4 border-t border-border/50"
        >
          <Button
            onClick={onReviewClick}
            className="w-full h-11 bg-energy-gradient hover:opacity-90 text-white font-medium rounded-xl glow-brand"
          >
            <Check className="w-4 h-4 mr-2" />
            Review Profile
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
