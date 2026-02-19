"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Plus, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OnboardingActions } from "./onboarding-actions";
import type { SectionProps } from "./types";

interface Limitation {
  bodyPart: string;
  condition?: string;
  severity?: "mild" | "moderate" | "severe";
  duration?: "acute" | "chronic" | "recurring";
  affectsMobility?: boolean;
  movementsToAvoid?: string[];
}

const BODY_PARTS = [
  { id: "shoulder", label: "Shoulder" },
  { id: "back_upper", label: "Upper Back" },
  { id: "back_lower", label: "Lower Back" },
  { id: "knee", label: "Knee" },
  { id: "hip", label: "Hip" },
  { id: "wrist", label: "Wrist/Hand" },
  { id: "ankle", label: "Ankle/Foot" },
  { id: "neck", label: "Neck" },
  { id: "elbow", label: "Elbow" },
  { id: "core", label: "Core/Abs" },
];

const SEVERITIES = [
  { id: "mild", label: "Mild", description: "Slight discomfort, can work around", color: "text-green-500" },
  { id: "moderate", label: "Moderate", description: "Noticeable pain, need modifications", color: "text-amber-500" },
  { id: "severe", label: "Severe", description: "Significant limitation, avoid area", color: "text-red-500" },
];

const DURATIONS = [
  { id: "acute", label: "Recent/Acute", description: "< 6 weeks, still healing" },
  { id: "chronic", label: "Chronic/Long-term", description: "Ongoing condition" },
  { id: "recurring", label: "Recurring", description: "Comes and goes" },
];

export function LimitationsSection({ data, onUpdate, onNext, onBack }: SectionProps) {
  const [hasLimitations, setHasLimitations] = useState<boolean | null>(
    data.limitations !== undefined ? (data.limitations?.length || 0) > 0 : null
  );
  const [limitations, setLimitations] = useState<Limitation[]>(
    (data.limitations as Limitation[]) || []
  );
  const [currentStep, setCurrentStep] = useState<"select" | "details">("select");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addBodyPart = (bodyPart: string) => {
    const newLimitation: Limitation = { bodyPart };
    setLimitations((prev) => [...prev, newLimitation]);
    setEditingIndex(limitations.length);
    setCurrentStep("details");
  };

  const updateLimitation = (index: number, updates: Partial<Limitation>) => {
    setLimitations((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l))
    );
  };

  const removeLimitation = (index: number) => {
    setLimitations((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentStep("select");
    }
  };

  const finishEditing = () => {
    setEditingIndex(null);
    setCurrentStep("select");
  };

  const handleNoLimitations = () => {
    setHasLimitations(false);
    onUpdate({ limitations: [], limitationsAcknowledged: true });
  };

  const handleNoLimitationsContinue = () => {
    onNext();
  };

  const handleHasLimitations = () => {
    setHasLimitations(true);
  };

  const handleContinue = () => {
    onUpdate({ limitations, limitationsAcknowledged: true });
    onNext();
  };

  const currentLimitation = editingIndex !== null ? limitations[editingIndex] : null;

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-6 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto w-full text-center"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          Any injuries or limitations?
        </h2>
        <p className="text-muted-foreground mb-6">
          We&apos;ll program around them to keep you safe
        </p>

        {/* Initial Choice */}
        {hasLimitations === null && (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleNoLimitations}
              className="w-full h-14 text-lg rounded-xl"
            >
              <Check className="w-5 h-5 mr-2 text-success" />
              No limitations — I&apos;m good!
            </Button>
            <Button
              variant="outline"
              onClick={handleHasLimitations}
              className="w-full h-14 text-lg rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yes, I have some to mention
            </Button>
          </div>
        )}

        {/* No Limitations Confirmation */}
        {hasLimitations === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
              <Check className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="font-medium text-success">Great! No limitations noted.</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can always add limitations later in your profile settings.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setHasLimitations(null)}
                className="flex-1 h-12 rounded-xl"
              >
                Go Back
              </Button>
              <OnboardingActions
                onNext={handleNoLimitationsContinue}
                onBack={onBack}
                className="flex-1"
              />
            </div>
          </motion.div>
        )}

        {/* Body Part Selection */}
        {hasLimitations === true && currentStep === "select" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Already Added - Compact 2-column grid */}
            {limitations.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Added ({limitations.length}):</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto overscroll-contain pr-1">
                  {limitations.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-card rounded-lg border border-border p-2"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="text-left min-w-0">
                          <span className="font-medium text-xs block truncate">
                            {BODY_PARTS.find((b) => b.id === l.bodyPart)?.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {l.severity && SEVERITIES.find((s) => s.id === l.severity)?.label}
                            {l.duration && ` • ${DURATIONS.find((d) => d.id === l.duration)?.label.split("/")[0]}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingIndex(i);
                            setCurrentStep("details");
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeLimitation(i)}
                          className="p-1 hover:bg-destructive/10 rounded"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add more areas - only show if there are remaining body parts */}
            {BODY_PARTS.filter((b) => !limitations.some((l) => l.bodyPart === b.id)).length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  {limitations.length > 0 ? "Add another:" : "Select affected area:"}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-[240px] overflow-y-auto overscroll-contain pr-1">
                  {BODY_PARTS.filter((b) => !limitations.some((l) => l.bodyPart === b.id)).map(
                    ({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => addBodyPart(id)}
                        className={cn(
                          "h-10 px-3 rounded-lg border-2 transition-all",
                          "flex items-center",
                          "hover:border-amber-500 hover:bg-amber-500/5",
                          "border-border bg-card"
                        )}
                      >
                        <span className="text-xs font-medium truncate">{label}</span>
                      </button>
                    )
                  )}
                </div>
              </>
            )}

            <OnboardingActions
              onNext={handleContinue}
              onBack={onBack}
              nextLabel={limitations.length > 0 ? "Continue" : "Skip"}
            />
          </motion.div>
        )}

        {/* Limitation Details - Compact Layout */}
        {hasLimitations === true && currentStep === "details" && currentLimitation && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-left"
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold">
                {BODY_PARTS.find((b) => b.id === currentLimitation.bodyPart)?.label}
              </h3>
            </div>

            {/* Severity - Horizontal Pills */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Severity</p>
              <div className="flex gap-2">
                {SEVERITIES.map(({ id, label, color }) => (
                  <button
                    key={id}
                    onClick={() => updateLimitation(editingIndex!, { severity: id as Limitation["severity"] })}
                    className={cn(
                      "flex-1 py-2.5 px-2 rounded-lg border-2 transition-all text-center",
                      "hover:border-amber-500",
                      currentLimitation.severity === id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border bg-card"
                    )}
                  >
                    <span className={cn("text-sm font-medium", color)}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration - Horizontal Pills */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Duration</p>
              <div className="flex gap-2">
                {DURATIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => updateLimitation(editingIndex!, { duration: id as Limitation["duration"] })}
                    className={cn(
                      "flex-1 py-2.5 px-2 rounded-lg border-2 transition-all text-center",
                      "hover:border-amber-500",
                      currentLimitation.duration === id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border bg-card"
                    )}
                  >
                    <span className="text-sm font-medium">{label.split("/")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobility - Inline */}
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">Affects mobility?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => updateLimitation(editingIndex!, { affectsMobility: true })}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg border-2 transition-all font-medium text-sm",
                    currentLimitation.affectsMobility === true
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border bg-card"
                  )}
                >
                  Yes
                </button>
                <button
                  onClick={() => updateLimitation(editingIndex!, { affectsMobility: false })}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg border-2 transition-all font-medium text-sm",
                    currentLimitation.affectsMobility === false
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border bg-card"
                  )}
                >
                  No
                </button>
              </div>
            </div>

            <OnboardingActions
              onNext={finishEditing}
              onBack={onBack}
              nextLabel="Done"
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
