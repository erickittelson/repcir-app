"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RallyCreationWizard } from "./rally-creation-wizard";
import { RallyCelebration } from "./rally-celebration";
import { RallyMemberHub } from "./rally-member-hub";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateRallyExperienceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (rallyId: string) => void;
  /** User data for celebration animation */
  userData?: {
    name: string;
    avatar?: string;
  };
}

export type Phase = "wizard" | "celebration" | "members" | "complete";

export interface RallyData {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "private";
  focusArea: string | null;
  targetDemographic: string | null;
  activityType: string | null;
  scheduleType: string | null;
  maxMembers: number | null;
  joinType: "open" | "request" | "invite_only";
  rules: string[];
  tags: string[];
  imageUrl: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateRallyExperience({
  open,
  onOpenChange,
  onComplete,
  userData,
}: CreateRallyExperienceProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [rallyData, setRallyData] = useState<RallyData | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset state when closing
      setPhase("wizard");
      setRallyData(null);
    }
  }, [open]);

  // Handle wizard completion - fetch the rally data
  const handleWizardComplete = useCallback(async (rallyId: string) => {
    try {
      // Fetch the rally data to get all the details
      const response = await fetch(`/api/circles/${rallyId}`);
      if (response.ok) {
        const data = await response.json();
        setRallyData({
          id: rallyId,
          name: data.name || "My Rally",
          description: data.description,
          category: data.category,
          visibility: data.visibility || "private",
          focusArea: data.focusArea,
          targetDemographic: data.targetDemographic,
          activityType: data.activityType,
          scheduleType: data.scheduleType,
          maxMembers: data.maxMembers,
          joinType: data.joinType || "request",
          rules: data.rules || [],
          tags: data.tags || [],
          imageUrl: data.imageUrl,
        });
      } else {
        // Fallback if fetch fails
        setRallyData({
          id: rallyId,
          name: "My Rally",
          description: null,
          category: null,
          visibility: "private",
          focusArea: null,
          targetDemographic: null,
          activityType: null,
          scheduleType: null,
          maxMembers: null,
          joinType: "request",
          rules: [],
          tags: [],
          imageUrl: null,
        });
      }
      setPhase("celebration");
    } catch (error) {
      console.error("Failed to fetch rally data:", error);
      // Continue with basic data
      setRallyData({
        id: rallyId,
        name: "My Rally",
        description: null,
        category: null,
        visibility: "private",
        focusArea: null,
        targetDemographic: null,
        activityType: null,
        scheduleType: null,
        maxMembers: null,
        joinType: "request",
        rules: [],
        tags: [],
        imageUrl: null,
      });
      setPhase("celebration");
    }
  }, []);

  // Handle celebration animation complete
  const handleCelebrationComplete = useCallback(() => {
    setPhase("members");
  }, []);

  // Handle member hub completion
  const handleMemberHubComplete = useCallback(() => {
    if (rallyData) {
      setPhase("complete");
      onComplete?.(rallyData.id);
      onOpenChange(false);
      router.push(`/circle/${rallyData.id}`);
    }
  }, [rallyData, onComplete, onOpenChange, router]);

  // Handle member hub skip
  const handleMemberHubSkip = useCallback(() => {
    if (rallyData) {
      setPhase("complete");
      onComplete?.(rallyData.id);
      onOpenChange(false);
      router.push(`/circle/${rallyData.id}`);
    }
  }, [rallyData, onComplete, onOpenChange, router]);

  // Render based on phase
  // The wizard uses its own Sheet, so we render it outside the Dialog
  if (phase === "wizard") {
    return (
      <RallyCreationWizard
        open={open}
        onOpenChange={onOpenChange}
        onComplete={handleWizardComplete}
      />
    );
  }

  // For celebration and members phases, use our Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden transition-all duration-300",
          phase === "celebration" && "sm:max-w-md",
          phase === "members" && "sm:max-w-xl"
        )}
        showCloseButton={phase === "members"}
      >
        {/* Phase indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          <PhaseIndicator
            label="Create"
            isActive={false}
            isComplete={true}
          />
          <PhaseConnector isComplete={true} />
          <PhaseIndicator
            label="Celebrate"
            isActive={phase === "celebration"}
            isComplete={phase === "members"}
          />
          <PhaseConnector isComplete={phase === "members"} />
          <PhaseIndicator
            label="Invite"
            isActive={phase === "members"}
            isComplete={false}
          />
        </div>

        {/* Phase content */}
        <div className="min-h-[300px] px-6 pb-6">
          {phase === "celebration" && rallyData && (
            <RallyCelebration
              rallyName={rallyData.name}
              rallyId={rallyData.id}
              userAvatar={userData?.avatar}
              userName={userData?.name || "You"}
              onAnimationComplete={handleCelebrationComplete}
            />
          )}

          {phase === "members" && rallyData && (
            <RallyMemberHub
              rallyId={rallyData.id}
              rallyName={rallyData.name}
              rallyImage={rallyData.imageUrl || undefined}
              onComplete={handleMemberHubComplete}
              onSkip={handleMemberHubSkip}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface PhaseIndicatorProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function PhaseIndicator({ label, isActive, isComplete }: PhaseIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full transition-all duration-300",
          isComplete
            ? "bg-success"
            : isActive
              ? "bg-brand scale-125"
              : "bg-muted-foreground/30"
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          isActive ? "text-brand" : isComplete ? "text-success" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

interface PhaseConnectorProps {
  isComplete: boolean;
}

function PhaseConnector({ isComplete }: PhaseConnectorProps) {
  return (
    <div
      className={cn(
        "h-0.5 w-8 rounded-full transition-colors duration-300",
        isComplete ? "bg-success" : "bg-muted-foreground/30"
      )}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CreateRallyExperience;
