"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Heart,
  Flame,
  Trophy,
  Sparkles,
  Leaf,
  Globe,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface RallyCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (rallyId: string) => void;
}

interface FormData {
  name: string;
  description: string;
  focusAreas: string[];
  joinType: "open" | "request" | "invite_only";
  visibility: "public" | "private";
}

const FOCUS_OPTIONS = [
  { value: "strength", label: "Strength", icon: Dumbbell, color: "text-orange-400" },
  { value: "cardio", label: "Cardio", icon: Flame, color: "text-red-400" },
  { value: "wellness", label: "Wellness", icon: Heart, color: "text-pink-400" },
  { value: "sports", label: "Sports", icon: Trophy, color: "text-yellow-400" },
  { value: "flexibility", label: "Flexibility", icon: Sparkles, color: "text-purple-400" },
  { value: "outdoor", label: "Outdoor", icon: Leaf, color: "text-green-400" },
];

const JOIN_OPTIONS = [
  {
    value: "open" as const,
    label: "Open",
    description: "Anyone can join instantly",
    icon: Globe,
  },
  {
    value: "request" as const,
    label: "Request",
    description: "Approval required to join",
    icon: UserPlus,
  },
  {
    value: "invite_only" as const,
    label: "Invite Only",
    description: "By invitation only",
    icon: Lock,
  },
];

const TOTAL_STEPS = 5;

// ============================================================================
// PROGRESS CIRCLE COMPONENT
// ============================================================================

function ProgressCircle({
  currentStep,
  totalSteps,
  isSubmitting,
}: {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
}) {
  const radius = 60;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Calculate progress (0 to 1)
  const progress = currentStep / totalSteps;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow when complete */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: progress === 1
            ? "0 0 40px 8px oklch(0.73 0.155 85 / 0.4)"
            : "0 0 0px 0px oklch(0.73 0.155 85 / 0)",
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Background circle */}
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="oklch(0.25 0.012 275)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        {/* Progress segments */}
        <motion.circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            strokeDasharray: circumference,
          }}
          animate={{
            strokeDashoffset: isSubmitting ? 0 : strokeDashoffset,
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.76 0.155 85)" />
            <stop offset="50%" stopColor="oklch(0.73 0.155 85)" />
            <stop offset="100%" stopColor="oklch(0.53 0.10 70)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isSubmitting ? (
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
        ) : (
          <>
            <motion.span
              className="text-2xl font-bold text-brand"
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep}
            </motion.span>
            <span className="text-xs text-muted-foreground">of {totalSteps}</span>
          </>
        )}
      </div>

      {/* Energy particles when step completes */}
      <AnimatePresence>
        {progress > 0 && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`particle-${currentStep}-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-brand"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: Math.cos((i / 6) * Math.PI * 2) * 80,
                  y: Math.sin((i / 6) * Math.PI * 2) * 80,
                  opacity: 0,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

// Step 1: Name
function StepName({ formData, updateField }: StepProps) {
  const maxLength = 50;
  const charCount = formData.name.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Name your rally</h2>
        <p className="text-muted-foreground">
          Give your rally a memorable name
        </p>
      </div>

      <div className="space-y-2">
        <Input
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g., Morning Runners Club"
          maxLength={maxLength}
          className="text-lg h-14 text-center"
          autoFocus
        />
        <div className="flex justify-end">
          <span className={cn(
            "text-xs transition-colors",
            charCount > maxLength * 0.8
              ? charCount >= maxLength ? "text-destructive" : "text-yellow-500"
              : "text-muted-foreground"
          )}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 2: Description
function StepDescription({ formData, updateField }: StepProps) {
  const maxLength = 300;
  const charCount = formData.description.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Describe what it&apos;s about</h2>
        <p className="text-muted-foreground">
          Optional - help others understand your rally
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="What's this rally about? What can members expect?"
          maxLength={maxLength}
          rows={4}
          className="text-base resize-none"
        />
        <div className="flex justify-end">
          <span className={cn(
            "text-xs transition-colors",
            charCount > maxLength * 0.8
              ? charCount >= maxLength ? "text-destructive" : "text-yellow-500"
              : "text-muted-foreground"
          )}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}

// Step 3: Focus Areas (Multi-select)
function StepFocus({ formData, updateField }: StepProps) {
  const toggleFocus = (value: string) => {
    const current = formData.focusAreas;
    if (current.includes(value)) {
      updateField("focusAreas", current.filter(v => v !== value));
    } else {
      updateField("focusAreas", [...current, value]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose your focus</h2>
        <p className="text-muted-foreground">
          Select all that apply
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FOCUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = formData.focusAreas.includes(option.value);

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => toggleFocus(option.value)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-200",
                "flex flex-col items-center gap-2",
                isSelected
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/50 bg-card"
              )}
              whileTap={{ scale: 0.97 }}
            >
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: "linear-gradient(135deg, oklch(0.73 0.155 85 / 0.1) 0%, transparent 100%)",
                  }}
                />
              )}
              <Icon className={cn(
                "h-8 w-8 transition-colors",
                isSelected ? option.color : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-medium transition-colors",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
              {isSelected && (
                <motion.div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

    </div>
  );
}

// Step 4: Join Type
function StepJoinType({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Who can join?</h2>
        <p className="text-muted-foreground">
          Control how members join your rally
        </p>
      </div>

      <div className="space-y-3">
        {JOIN_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = formData.joinType === option.value;

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => updateField("joinType", option.value)}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all duration-200",
                "flex items-center gap-4 text-left",
                isSelected
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/50 bg-card"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                isSelected ? "bg-brand/20" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-colors",
                  isSelected ? "text-brand" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-medium transition-colors",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {option.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-brand"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Step 5: Visibility
function StepVisibility({ formData, updateField }: StepProps) {
  const isPublic = formData.visibility === "public";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Public or Private?</h2>
        <p className="text-muted-foreground">
          Choose who can discover your rally
        </p>
      </div>

      <div className="flex gap-3">
        {/* Public Option */}
        <motion.button
          type="button"
          onClick={() => updateField("visibility", "public")}
          className={cn(
            "flex-1 p-6 rounded-xl border-2 transition-all duration-200",
            "flex flex-col items-center gap-3",
            isPublic
              ? "border-brand bg-brand/10"
              : "border-border hover:border-brand/50 bg-card"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <div className={cn(
            "p-4 rounded-full transition-colors",
            isPublic ? "bg-brand/20" : "bg-muted"
          )}>
            <Eye className={cn(
              "h-6 w-6 transition-colors",
              isPublic ? "text-brand" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-center">
            <p className={cn(
              "font-semibold transition-colors",
              isPublic ? "text-foreground" : "text-muted-foreground"
            )}>
              Public
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Appears in discovery
            </p>
          </div>
        </motion.button>

        {/* Private Option */}
        <motion.button
          type="button"
          onClick={() => updateField("visibility", "private")}
          className={cn(
            "flex-1 p-6 rounded-xl border-2 transition-all duration-200",
            "flex flex-col items-center gap-3",
            !isPublic
              ? "border-brand bg-brand/10"
              : "border-border hover:border-brand/50 bg-card"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <div className={cn(
            "p-4 rounded-full transition-colors",
            !isPublic ? "bg-brand/20" : "bg-muted"
          )}>
            <EyeOff className={cn(
              "h-6 w-6 transition-colors",
              !isPublic ? "text-brand" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-center">
            <p className={cn(
              "font-semibold transition-colors",
              !isPublic ? "text-foreground" : "text-muted-foreground"
            )}>
              Private
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hidden from discovery
            </p>
          </div>
        </motion.button>
      </div>

      {/* Explanation */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          {isPublic
            ? "Anyone can find and view your rally. Perfect for growing your community."
            : "Only members can see your rally. Share the link to invite people."}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export function RallyCreationWizard({
  open,
  onOpenChange,
  onComplete,
}: RallyCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    focusAreas: [],
    joinType: "request",
    visibility: "public",
  });

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setDirection("forward");
    setFormData({
      name: "",
      description: "",
      focusAreas: [],
      joinType: "request",
      visibility: "public",
    });
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset after animation completes
    setTimeout(resetWizard, 300);
  }, [onOpenChange, resetWizard]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length >= 2;
      case 2:
        return true; // Description is optional
      case 3:
        return formData.focusAreas.length > 0;
      case 4:
        return true; // Always has a default
      case 5:
        return true; // Always has a default
      default:
        return false;
    }
  }, [currentStep, formData]);

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setDirection("forward");
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, canProceed]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection("backward");
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a rally name");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          focusArea: formData.focusAreas.length > 0 ? formData.focusAreas[0] : null,
          tags: formData.focusAreas, // Store all selected focus areas as tags
          joinType: formData.joinType,
          visibility: formData.visibility,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create rally");
      }

      const circle = await response.json();

      // Call onComplete - the orchestrator will handle the celebration and member phases
      // Do NOT close the wizard or navigate - let the orchestrator take over
      onComplete(circle.id);

      // Reset wizard state for next time
      setTimeout(resetWizard, 300);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create rally");
      setIsSubmitting(false);
    }
  };

  // Step animation variants
  const stepVariants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? -100 : 100,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    const props = { formData, updateField };

    switch (currentStep) {
      case 1:
        return <StepName {...props} />;
      case 2:
        return <StepDescription {...props} />;
      case 3:
        return <StepFocus {...props} />;
      case 4:
        return <StepJoinType {...props} />;
      case 5:
        return <StepVisibility {...props} />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => {
      if (!value) handleClose();
      else onOpenChange(value);
    }}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-[85vh] p-0 rounded-t-3xl"
      >
        <div className="flex flex-col h-full">
          {/* Header with Progress Circle */}
          <div className="flex flex-col items-center pt-8 pb-4 px-6">
            <SheetHeader className="sr-only">
              <SheetTitle>Create a Rally</SheetTitle>
              <SheetDescription>
                Step {currentStep} of {TOTAL_STEPS}
              </SheetDescription>
            </SheetHeader>

            <ProgressCircle
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Step Content */}
          <div className="flex-1 px-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="h-full"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="px-6 pb-8 pt-4 space-y-4 bg-gradient-to-t from-background via-background to-transparent">
            {/* Selection count for focus step */}
            {currentStep === 3 && formData.focusAreas.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {formData.focusAreas.length} selected
              </p>
            )}

            {/* Progress Dots */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-colors",
                    index + 1 === currentStep
                      ? "w-6 bg-brand"
                      : index + 1 < currentStep
                        ? "w-2 bg-brand/50"
                        : "w-2 bg-muted"
                  )}
                  layout
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={goBack}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}

              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={goNext}
                  disabled={!canProceed() || isSubmitting}
                  className="flex-1 bg-brand hover:bg-brand/90"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-brand hover:bg-brand/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Rally"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
