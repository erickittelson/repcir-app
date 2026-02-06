import type { ClarificationData, ClarificationOption } from "./structured-chat";
import type { getMemberContext } from "./index";
import type { ContextType } from "./intent-detection";

// Infer the MemberContext type from the return type of getMemberContext
type MemberContext = Awaited<ReturnType<typeof getMemberContext>>;

/**
 * Generate clarification options based on context type and user data
 */
export function generateClarificationOptions(
  contextType: ContextType,
  memberContext: MemberContext | null
): ClarificationData {
  switch (contextType) {
    case "duration":
      return generateDurationOptions();
    case "energy":
      return generateEnergyOptions(memberContext);
    case "location":
      return generateLocationOptions(memberContext);
    case "limitations":
      return generateLimitationOptions(memberContext);
    case "focus":
      return generateFocusOptions(memberContext);
    case "intensity":
      return generateIntensityOptions();
    default:
      return generateDurationOptions();
  }
}

/**
 * Duration options - standard time choices
 */
function generateDurationOptions(): ClarificationData {
  return {
    question: "How much time do you have?",
    options: [
      { id: "15", label: "15 min", value: "15", icon: "Clock" },
      { id: "30", label: "30 min", value: "30", icon: "Clock" },
      { id: "45", label: "45 min", value: "45", icon: "Clock" },
      { id: "60", label: "60 min", value: "60", icon: "Clock" },
    ],
    allowCustom: true,
    context: "duration",
  };
}

/**
 * Energy options - how the user is feeling today
 */
function generateEnergyOptions(memberContext: MemberContext | null): ClarificationData {
  // Check recent context notes for mood trends
  const recentMoods = memberContext?.contextNotes?.recentMoods || [];
  const avgEnergy = memberContext?.contextNotes?.avgEnergy || 3;

  // Add a subtle hint based on their recent patterns
  let questionSuffix = "";
  if (avgEnergy < 2.5) {
    questionSuffix = " (you've been running a bit low lately)";
  } else if (avgEnergy > 4) {
    questionSuffix = " (you've been on fire lately!)";
  }

  return {
    question: `How are you feeling today?${questionSuffix}`,
    options: [
      {
        id: "low",
        label: "Low energy",
        value: "low",
        icon: "Battery",
        description: "Keep it light today",
      },
      {
        id: "moderate",
        label: "Feeling okay",
        value: "moderate",
        icon: "BatteryMedium",
        description: "Standard workout",
      },
      {
        id: "high",
        label: "Ready to crush it",
        value: "high",
        icon: "BatteryFull",
        description: "Push harder today",
      },
    ],
    allowCustom: false,
    context: "energy",
  };
}

/**
 * Location options - inferred from user's equipment
 */
function generateLocationOptions(memberContext: MemberContext | null): ClarificationData {
  const options: ClarificationOption[] = [];
  const equipment = memberContext?.equipment || [];

  // Check for gym-specific equipment
  const hasGymEquipment = equipment.some((e: { name: string }) => {
    const name = e.name.toLowerCase();
    return (
      name.includes("barbell") ||
      name.includes("cable") ||
      name.includes("machine") ||
      name.includes("smith") ||
      name.includes("leg press") ||
      name.includes("lat pulldown") ||
      name.includes("rack")
    );
  });

  // Check for home-friendly equipment
  const hasHomeEquipment = equipment.some((e: { name: string }) => {
    const name = e.name.toLowerCase();
    return (
      name.includes("dumbbell") ||
      name.includes("kettlebell") ||
      name.includes("resistance band") ||
      name.includes("pull-up bar") ||
      name.includes("bench")
    );
  });

  if (hasGymEquipment) {
    options.push({
      id: "gym",
      label: "At the gym",
      value: "gym",
      icon: "Dumbbell",
      description: "Full equipment access",
    });
  }

  if (hasHomeEquipment) {
    options.push({
      id: "home",
      label: "Home workout",
      value: "home",
      icon: "Home",
      description: "Using home equipment",
    });
  }

  // Always include outdoor and bodyweight options
  options.push({
    id: "outdoor",
    label: "Outdoor",
    value: "outdoor",
    icon: "Sun",
    description: "Park or outdoor space",
  });

  options.push({
    id: "bodyweight",
    label: "No equipment",
    value: "bodyweight",
    icon: "User",
    description: "Bodyweight only",
  });

  return {
    question: "Where will you be working out?",
    options,
    allowCustom: true,
    context: "location",
  };
}

/**
 * Limitation options - based on user's active limitations
 */
function generateLimitationOptions(memberContext: MemberContext | null): ClarificationData {
  const options: ClarificationOption[] = [];
  const limitations = memberContext?.limitations || [];

  // Add each active limitation as an option
  for (const limitation of limitations) {
    const severityIcon = limitation.severity === "severe" ? "AlertTriangle" :
      limitation.severity === "moderate" ? "AlertCircle" : "Info";

    const affectedAreas = limitation.affectedAreas?.join(", ") || "general";

    options.push({
      id: limitation.id,
      label: `${limitation.type} - ${affectedAreas}`,
      value: limitation.id,
      icon: severityIcon,
      description: limitation.notes || `${limitation.severity} severity`,
    });
  }

  // Always add "No issues today" option
  options.push({
    id: "none",
    label: "No issues today",
    value: "none",
    icon: "CheckCircle",
    description: "Feeling good, no restrictions",
  });

  return {
    question: "Any limitations bothering you today?",
    options,
    allowCustom: true,
    context: "limitations",
  };
}

/**
 * Focus options - based on muscle recovery status
 */
function generateFocusOptions(memberContext: MemberContext | null): ClarificationData {
  const options: ClarificationOption[] = [];
  const recovery = memberContext?.trainingAnalysis?.muscleRecoveryStatus || {};

  // Group muscles by recovery status
  const readyMuscles: string[] = [];
  const recoveringMuscles: string[] = [];

  for (const [muscle, status] of Object.entries(recovery)) {
    const recoveryStatus = status as { readyToTrain?: boolean };
    if (recoveryStatus.readyToTrain) {
      readyMuscles.push(muscle);
    } else {
      recoveringMuscles.push(muscle);
    }
  }

  // Create smart focus options based on recovery
  if (readyMuscles.includes("chest") || readyMuscles.includes("shoulders") || readyMuscles.includes("triceps")) {
    options.push({
      id: "push",
      label: "Push day",
      value: "push",
      icon: "ArrowUp",
      description: "Chest, shoulders, triceps",
    });
  }

  if (readyMuscles.includes("back") || readyMuscles.includes("biceps")) {
    options.push({
      id: "pull",
      label: "Pull day",
      value: "pull",
      icon: "ArrowDown",
      description: "Back and biceps",
    });
  }

  if (readyMuscles.includes("quadriceps") || readyMuscles.includes("hamstrings") || readyMuscles.includes("glutes")) {
    options.push({
      id: "legs",
      label: "Leg day",
      value: "legs",
      icon: "Footprints",
      description: "Quads, hamstrings, glutes",
    });
  }

  if (readyMuscles.includes("core") || readyMuscles.includes("abs")) {
    options.push({
      id: "core",
      label: "Core focus",
      value: "core",
      icon: "Target",
      description: "Abs and stability",
    });
  }

  // Always include full body and cardio options
  options.push({
    id: "full_body",
    label: "Full body",
    value: "full_body",
    icon: "Dumbbell",
    description: "Hit everything",
  });

  options.push({
    id: "cardio",
    label: "Cardio/Conditioning",
    value: "cardio",
    icon: "Heart",
    description: "Endurance and heart rate",
  });

  // If they have muscles that are still recovering, mention it
  let question = "What would you like to focus on?";
  if (recoveringMuscles.length > 0 && recoveringMuscles.length <= 3) {
    question = `What would you like to focus on? (Note: ${recoveringMuscles.join(", ")} still recovering)`;
  }

  return {
    question,
    options: options.slice(0, 4), // Limit to 4 options
    allowCustom: true,
    context: "focus",
  };
}

/**
 * Intensity options
 */
function generateIntensityOptions(): ClarificationData {
  return {
    question: "How hard do you want to go?",
    options: [
      {
        id: "light",
        label: "Light",
        value: "light",
        icon: "Feather",
        description: "Recovery or deload day",
      },
      {
        id: "moderate",
        label: "Moderate",
        value: "moderate",
        icon: "Activity",
        description: "Standard training",
      },
      {
        id: "hard",
        label: "Hard",
        value: "hard",
        icon: "Flame",
        description: "Push your limits",
      },
      {
        id: "max",
        label: "All out",
        value: "max",
        icon: "Zap",
        description: "Maximum effort",
      },
    ],
    allowCustom: false,
    context: "intensity",
  };
}

/**
 * Get a friendly intro message for clarification
 */
export function getClarificationIntro(contextType: ContextType): string {
  const intros: Record<ContextType, string> = {
    duration: "Let me personalize this workout for you.",
    energy: "Got it!",
    location: "Perfect!",
    limitations: "Almost there!",
    focus: "One more thing!",
    intensity: "Last question!",
  };

  return intros[contextType] || "Let me ask you a quick question.";
}
