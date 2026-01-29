"use client";

import { useState } from "react";
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
  Check,
  X,
  Pencil,
  Sparkles,
  ChevronDown,
  Loader2,
  MapPin,
  Lock,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExtractedProfileData } from "./profile-panel";

interface ProfileReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: (key: string, currentValue: unknown) => void;
  data: ExtractedProfileData;
  isSubmitting?: boolean;
}

// Section configuration
interface SectionConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: Array<{
    key: keyof ExtractedProfileData;
    label: string;
    format?: (value: unknown, data: ExtractedProfileData) => string;
  }>;
}

// Helper to calculate age from birth month/year
function calculateAge(birthMonth?: number, birthYear?: number): string {
  if (!birthMonth || !birthYear) return "";
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth) {
    age--;
  }
  return `${age} years old`;
}

const SECTIONS: SectionConfig[] = [
  {
    id: "personal",
    title: "Personal Information",
    icon: <User style={{ width: "1.25rem", height: "1.25rem" }} />,
    fields: [
      { key: "name", label: "Name" },
      {
        key: "birthYear",
        label: "Age",
        format: (v, d) => calculateAge(d.birthMonth, d.birthYear),
      },
      {
        key: "gender",
        label: "Gender",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "heightFeet",
        label: "Height",
        format: (v, d) =>
          d.heightInches !== undefined ? `${v}'${d.heightInches}"` : `${v} ft`,
      },
      { key: "weight", label: "Weight", format: (v) => `${v} lbs` },
      { key: "city", label: "City" },
      {
        key: "bodyFatPercentage",
        label: "Body Fat",
        format: (v) => `~${v}%`,
      },
    ],
  },
  {
    id: "motivation",
    title: "Motivation",
    icon: <Heart style={{ width: "1.25rem", height: "1.25rem" }} />,
    fields: [
      {
        key: "primaryMotivation",
        label: "Why You're Here",
        format: (v) => Array.isArray(v) ? v.join(", ") : String(v),
      },
    ],
  },
  {
    id: "fitness",
    title: "Fitness Background",
    icon: <Activity style={{ width: "1.25rem", height: "1.25rem" }} />,
    fields: [
      {
        key: "fitnessLevel",
        label: "Experience Level",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "trainingFrequency",
        label: "Training Frequency",
        format: (v) => `${v} days per week`,
      },
      {
        key: "activityLevel",
        label: "Daily Activity",
        format: (v) => {
          const activity = v as ExtractedProfileData["activityLevel"];
          if (!activity) return "";
          const jobLabels: Record<string, string> = {
            sedentary: "Sedentary",
            light: "Lightly active",
            moderate: "Moderately active",
            active: "Active",
            very_active: "Very active",
          };
          let result = jobLabels[activity.jobType] || activity.jobType;
          if (activity.dailySteps) {
            result += ` (~${activity.dailySteps.toLocaleString()} steps)`;
          }
          return result;
        },
      },
    ],
  },
  {
    id: "goals",
    title: "Goals",
    icon: <Target style={{ width: "1.25rem", height: "1.25rem" }} />,
    fields: [
      { key: "targetWeight", label: "Target Weight", format: (v) => `${v} lbs` },
    ],
  },
  {
    id: "preferences",
    title: "Training Preferences",
    icon: <Dumbbell style={{ width: "1.25rem", height: "1.25rem" }} />,
    fields: [
      {
        key: "workoutDuration",
        label: "Workout Duration",
        format: (v) => `${v} minutes`,
      },
      {
        key: "workoutDays",
        label: "Preferred Days",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v)),
      },
      {
        key: "equipmentAccess",
        label: "Equipment",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v)),
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Settings",
    icon: <Lock style={{ width: "1.25rem", height: "1.25rem" }} />,
    fields: [
      {
        key: "profileVisibility",
        label: "Profile Visibility",
        format: (v) => v === "public" ? "Public" : "Private",
      },
    ],
  },
];

export function ProfileReviewModal({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  data,
  isSubmitting = false,
}: ProfileReviewModalProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    SECTIONS.map((s) => s.id)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Count filled fields including special arrays
  const totalPossibleFields = SECTIONS.flatMap((s) => s.fields).length + 3; // +3 for limitations, currentMaxes, specificGoals
  const filledFields = SECTIONS.flatMap((s) => s.fields).filter(
    (f) => data[f.key] !== undefined
  ).length +
    (data.limitations !== undefined ? 1 : 0) +
    (data.currentMaxes !== undefined ? 1 : 0) +
    (data.specificGoals !== undefined ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ padding: "1rem" }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-2xl max-h-[85vh] overflow-hidden",
              "bg-card rounded-3xl shadow-2xl border border-border/50",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex-shrink-0 relative overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-brand-gradient opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />

              <div className="relative" style={{ padding: "1.5rem 1.5rem 1rem" }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center" style={{ gap: "1rem" }}>
                    <div
                      className="rounded-2xl bg-brand-gradient flex items-center justify-center glow-brand"
                      style={{ width: "3.5rem", height: "3.5rem" }}
                    >
                      <Sparkles style={{ width: "1.75rem", height: "1.75rem" }} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Review Your Profile
                      </h2>
                      <p className="text-sm text-muted-foreground" style={{ marginTop: "0.125rem" }}>
                        {filledFields} of {totalPossibleFields} fields completed
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full"
                  >
                    <X style={{ width: "1.25rem", height: "1.25rem" }} />
                  </Button>
                </div>

                {/* Progress indicator */}
                <div
                  className="bg-muted rounded-full overflow-hidden"
                  style={{ marginTop: "1rem", height: "0.375rem" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(filledFields / totalPossibleFields) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-energy-gradient rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: "1rem 1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {SECTIONS.map((section) => {
                  const isExpanded = expandedSections.includes(section.id);
                  const sectionFields = section.fields.filter(
                    (f) => data[f.key] !== undefined
                  );
                  const hasData = sectionFields.length > 0;

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded-2xl border transition-colors",
                        hasData
                          ? "border-border/50 bg-surface/50"
                          : "border-border/30 bg-muted/20 opacity-60"
                      )}
                    >
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between"
                        style={{ padding: "1rem" }}
                      >
                        <div className="flex items-center" style={{ gap: "0.75rem" }}>
                          <div
                            className={cn(
                              "rounded-xl flex items-center justify-center",
                              hasData
                                ? "bg-brand/15 text-brand"
                                : "bg-muted text-muted-foreground"
                            )}
                            style={{ width: "2.5rem", height: "2.5rem" }}
                          >
                            {section.icon}
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-foreground">
                              {section.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {sectionFields.length} of {section.fields.length} fields
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                          style={{ width: "1.25rem", height: "1.25rem" }}
                        />
                      </button>

                      {/* Section content */}
                      <AnimatePresence>
                        {isExpanded && hasData && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {sectionFields.map((field) => {
                                const value = data[field.key];
                                const displayValue = field.format
                                  ? field.format(value, data)
                                  : String(value);

                                return (
                                  <div
                                    key={field.key}
                                    className={cn(
                                      "group flex items-center justify-between",
                                      "rounded-xl",
                                      "bg-background/50 hover:bg-background/80",
                                      "transition-colors"
                                    )}
                                    style={{ padding: "0.75rem 1rem" }}
                                  >
                                    <span className="text-sm text-muted-foreground">
                                      {field.label}
                                    </span>
                                    <div className="flex items-center" style={{ gap: "0.5rem" }}>
                                      <span className="text-sm font-medium text-foreground">
                                        {displayValue}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(field.key, value)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ height: "1.75rem", width: "1.75rem" }}
                                      >
                                        <Pencil style={{ width: "0.875rem", height: "0.875rem" }} />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Current Maxes section */}
                {data.currentMaxes !== undefined && (
                  <div
                    className="rounded-2xl border border-brand/30 bg-brand/5"
                    style={{ padding: "1rem" }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: data.currentMaxes.length > 0 ? "0.75rem" : "0" }}>
                      <div className="flex items-center" style={{ gap: "0.75rem" }}>
                        <div
                          className="rounded-xl bg-brand/15 flex items-center justify-center"
                          style={{ width: "2.5rem", height: "2.5rem" }}
                        >
                          <Dumbbell style={{ width: "1.25rem", height: "1.25rem" }} className="text-brand" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Current Maxes</h3>
                          <p className="text-xs text-muted-foreground">
                            {data.currentMaxes.length > 0 ? "For workout programming" : "None added yet"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit("currentMaxes", data.currentMaxes)}
                        className="text-brand"
                        style={{ height: "1.75rem" }}
                      >
                        {data.currentMaxes.length > 0 ? (
                          <Pencil style={{ width: "0.875rem", height: "0.875rem" }} />
                        ) : (
                          <span className="text-xs">+ Add</span>
                        )}
                      </Button>
                    </div>
                    {data.currentMaxes.length > 0 && (
                      <div className="grid grid-cols-2" style={{ gap: "0.5rem" }}>
                        {data.currentMaxes.map((max, idx) => {
                          const isSkill = max.unit === "skill";
                          const skillLabel = isSkill
                            ? max.value === "mastered" ? "Mastered"
                              : max.value === "consistent" ? "Consistent"
                              : "Working On"
                            : null;

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-center justify-between rounded-lg",
                                isSkill
                                  ? max.value === "mastered" ? "bg-green-500/10"
                                    : max.value === "consistent" ? "bg-blue-500/10"
                                    : "bg-amber-500/10"
                                  : "bg-background/50"
                              )}
                              style={{ padding: "0.5rem 0.75rem" }}
                            >
                              <span className="text-sm text-muted-foreground">{max.exercise}</span>
                              {isSkill ? (
                                <span className={cn(
                                  "text-xs font-medium px-2 py-0.5 rounded-full",
                                  max.value === "mastered" ? "bg-green-500/20 text-green-600"
                                    : max.value === "consistent" ? "bg-blue-500/20 text-blue-600"
                                    : "bg-amber-500/20 text-amber-600"
                                )}>
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
                    )}
                  </div>
                )}

                {/* Specific Goals section */}
                {data.specificGoals !== undefined && (
                  <div
                    className="rounded-2xl border border-success/30 bg-success/5"
                    style={{ padding: "1rem" }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: data.specificGoals.length > 0 ? "0.75rem" : "0" }}>
                      <div className="flex items-center" style={{ gap: "0.75rem" }}>
                        <div
                          className="rounded-xl bg-success/15 flex items-center justify-center"
                          style={{ width: "2.5rem", height: "2.5rem" }}
                        >
                          <Target style={{ width: "1.25rem", height: "1.25rem" }} className="text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Specific Goals</h3>
                          <p className="text-xs text-muted-foreground">
                            {data.specificGoals.length > 0 ? "Performance targets" : "None added yet"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit("specificGoals", data.specificGoals)}
                        className="text-success"
                        style={{ height: "1.75rem" }}
                      >
                        {data.specificGoals.length > 0 ? (
                          <Pencil style={{ width: "0.875rem", height: "0.875rem" }} />
                        ) : (
                          <span className="text-xs">+ Add</span>
                        )}
                      </Button>
                    </div>
                    {data.specificGoals.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {data.specificGoals.map((goal, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg bg-background/50"
                            style={{ padding: "0.5rem 0.75rem" }}
                          >
                            <span className="text-sm text-muted-foreground">
                              {goal.exercise || goal.description}
                            </span>
                            {goal.targetValue && (
                              <span className="text-sm font-medium text-success">
                                → {goal.targetValue} {goal.targetUnit}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Limitations section */}
                {data.limitations !== undefined && (
                  <div
                    className="rounded-2xl border border-destructive/30 bg-destructive/5"
                    style={{ padding: "1rem" }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: data.limitations.length > 0 ? "0.75rem" : "0" }}>
                      <div className="flex items-center" style={{ gap: "0.75rem" }}>
                        <div
                          className="rounded-xl bg-destructive/15 flex items-center justify-center"
                          style={{ width: "2.5rem", height: "2.5rem" }}
                        >
                          <AlertTriangle style={{ width: "1.25rem", height: "1.25rem" }} className="text-destructive" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Physical Limitations</h3>
                          <p className="text-xs text-muted-foreground">
                            {data.limitations.length > 0 ? "We'll work around these" : "None added"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit("limitations", data.limitations)}
                        className="text-destructive"
                        style={{ height: "1.75rem" }}
                      >
                        {data.limitations.length > 0 ? (
                          <Pencil style={{ width: "0.875rem", height: "0.875rem" }} />
                        ) : (
                          <span className="text-xs">+ Add</span>
                        )}
                      </Button>
                    </div>
                    {data.limitations.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {data.limitations.map((lim, idx) => (
                          <div
                            key={idx}
                            className="flex items-start rounded-lg bg-background/50"
                            style={{ gap: "0.75rem", padding: "0.5rem 0.75rem" }}
                          >
                            <AlertTriangle
                              className="text-destructive flex-shrink-0"
                              style={{ width: "1rem", height: "1rem", marginTop: "0.125rem" }}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground">{lim.bodyPart}</p>
                              <p className="text-sm text-muted-foreground">
                                {lim.condition}
                                {lim.severity && ` (${lim.severity})`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex-shrink-0 border-t border-border/50"
              style={{ padding: "1.5rem" }}
            >
              <div className="flex items-center" style={{ gap: "1rem" }}>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl"
                  style={{ height: "3rem" }}
                >
                  Keep Chatting
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isSubmitting || filledFields < 5}
                  className={cn(
                    "flex-1 rounded-xl font-medium",
                    "bg-energy-gradient hover:opacity-90",
                    "text-white shadow-lg glow-brand",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  style={{ height: "3rem" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} className="animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <Check style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
                      Confirm & Start
                    </>
                  )}
                </Button>
              </div>
              <p
                className="text-xs text-center text-muted-foreground"
                style={{ marginTop: "0.75rem" }}
              >
                You can always update your profile later in settings
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
