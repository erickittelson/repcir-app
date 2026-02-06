import type { ConversationState } from "./structured-chat";
import type { getMemberContext } from "./index";

// Infer the MemberContext type from the return type of getMemberContext
type MemberContext = Awaited<ReturnType<typeof getMemberContext>>;

// Patterns that indicate a workout generation request
const WORKOUT_REQUEST_PATTERNS = [
  // Direct requests
  /\b(create|make|generate|give\s*me|design|build|plan)\b.*\b(workout|session|routine|exercise|training)\b/i,
  /\b(want|wanna|need|looking\s*for)\s+(a|to|some)?\s*(workout|training|exercise|session)/i,
  /\bworkout\b.*\b(for\s*today|for\s*me|right\s*now|quick|fast)\b/i,
  /\b(let's|lets)\s+(do|train|workout|exercise|work\s*out)\b/i,
  /\b(what|suggest)\s+(should|can)\s+i\s+(do|train|workout)\b/i,

  // Contextual workout requests
  /\b(leg|arm|chest|back|shoulder|core|upper|lower|full\s*body|push|pull)\s*(day|workout|session|training)?\b/i,
  /\b(hiit|cardio|strength|conditioning|mobility|flexibility)\s*(workout|session|training)?\b/i,
  /\b(\d+)\s*(min|minute)\s*(workout|session|training|hiit|cardio)?\b/i,

  // Quick action keywords from existing prompts
  /\bquick\s*workout\b/i,
  /\bfull\s*body\b/i,
  /\bupper\s*body\b/i,
  /\bcore\s*focus\b/i,
];

// Patterns that indicate NOT a workout request (informational)
const INFORMATIONAL_PATTERNS = [
  /\b(what\s+is|explain|tell\s+me\s+about|how\s+do\s+i|how\s+to)\b/i,
  /\b(why|when|where|which)\s+(should|is|are|do)\b/i,
  /\b(analyze|check|review)\s+(my|recent|last)\b/i,
  /\bprogress\b/i,
  /\bmotivat/i,
  /\bstrugg/i,
  /\badvice\b/i,
  /\btips?\b/i,
];

/**
 * Detect if the user message is requesting a workout to be generated
 */
export function detectWorkoutIntent(message: string): boolean {
  if (!message || message.trim().length < 3) return false;

  const normalizedMessage = message.toLowerCase().trim();

  // Check for informational patterns first (these are NOT workout requests)
  for (const pattern of INFORMATIONAL_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      // Unless it also strongly indicates workout generation
      const hasStrongWorkoutSignal = /\b(generate|create|make|build|give\s*me)\b.*\bworkout\b/i.test(normalizedMessage);
      if (!hasStrongWorkoutSignal) {
        return false;
      }
    }
  }

  // Check for workout request patterns
  for (const pattern of WORKOUT_REQUEST_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      return true;
    }
  }

  return false;
}

/**
 * Context types that can be collected for workout generation
 */
export type ContextType = "location" | "duration" | "energy" | "limitations" | "focus" | "intensity";

/**
 * Determine what context is missing for workout generation
 * Returns array of context types that should be asked about
 */
export function getMissingContext(
  memberContext: MemberContext | null,
  conversationState: ConversationState
): ContextType[] {
  const missing: ContextType[] = [];
  const answered = conversationState.answeredQuestions || [];
  const currentContext = conversationState.context || {};

  // If no member context, just ask basic questions
  if (!memberContext) {
    if (!currentContext.duration && !answered.includes("duration")) missing.push("duration");
    if (!currentContext.energy && !answered.includes("energy")) missing.push("energy");
    return missing;
  }

  // Priority order for questions:
  // 1. Duration (most important for workout structure)
  // 2. Energy (affects intensity recommendations)
  // 3. Location/Equipment (affects exercise selection)
  // 4. Limitations (safety consideration)
  // 5. Focus (nice to have, can be inferred)

  // Duration - always ask if not answered
  if (!currentContext.duration && !answered.includes("duration")) {
    missing.push("duration");
  }

  // Energy level - important for intensity
  if (!currentContext.energy && !answered.includes("energy")) {
    missing.push("energy");
  }

  // Location - ask if they have varied equipment (gym vs home)
  if (!currentContext.location && !answered.includes("location")) {
    const hasGymEquipment = memberContext.equipment?.some((e: { name: string }) =>
      ["barbell", "cable machine", "smith machine", "leg press", "lat pulldown"].some(
        name => e.name.toLowerCase().includes(name)
      )
    );
    const hasHomeEquipment = memberContext.equipment?.some((e: { name: string }) =>
      ["dumbbell", "kettlebell", "resistance band", "pull-up bar"].some(
        name => e.name.toLowerCase().includes(name)
      )
    );

    // Only ask about location if they have both types of equipment
    if (hasGymEquipment && hasHomeEquipment) {
      missing.push("location");
    }
  }

  // Limitations - ask if they have active limitations
  if (!currentContext.limitations && !answered.includes("limitations")) {
    const hasActiveLimitations = (memberContext.limitations?.length || 0) > 0;
    if (hasActiveLimitations) {
      missing.push("limitations");
    }
  }

  // Focus - optional, only ask if we have recovery data to make smart suggestions
  // Skip for now to keep flow shorter - AI will infer from context

  return missing;
}

/**
 * Extract any context hints from the user's message
 * Returns partial context that was explicitly mentioned
 */
export function extractContextFromMessage(message: string): Partial<ConversationState["context"]> {
  const context: Partial<ConversationState["context"]> = {};
  const normalizedMessage = message.toLowerCase();

  // Extract duration mentions
  const durationMatch = normalizedMessage.match(/(\d+)\s*(min|minute)/);
  if (durationMatch) {
    context.duration = parseInt(durationMatch[1], 10);
  }

  // Extract location mentions
  if (/\b(at\s*(the\s*)?(gym|fitness\s*center))\b/i.test(normalizedMessage)) {
    context.location = "gym";
  } else if (/\b(at\s*home|home\s*workout|no\s*gym)\b/i.test(normalizedMessage)) {
    context.location = "home";
  } else if (/\b(no\s*equipment|bodyweight|body\s*weight)\b/i.test(normalizedMessage)) {
    context.location = "bodyweight";
  } else if (/\b(outdoor|outside|park)\b/i.test(normalizedMessage)) {
    context.location = "outdoor";
  }

  // Extract energy/intensity mentions
  if (/\b(low\s*energy|tired|exhausted|easy|light)\b/i.test(normalizedMessage)) {
    context.energy = "low";
  } else if (/\b(high\s*energy|energized|crush\s*it|hard|intense|max)\b/i.test(normalizedMessage)) {
    context.energy = "high";
  }

  // Extract focus mentions
  const focusPatterns: Record<string, RegExp> = {
    "legs": /\b(leg|legs|lower\s*body|squat|deadlift)\b/i,
    "upper": /\b(upper\s*body|push|pull|chest|back|shoulders?|arms?)\b/i,
    "chest": /\b(chest|bench|pec)\b/i,
    "back": /\b(back|row|lat|pull)\b/i,
    "shoulders": /\b(shoulder|delt|overhead|press)\b/i,
    "arms": /\b(arm|bicep|tricep|curl)\b/i,
    "core": /\b(core|ab|abs|abdominal)\b/i,
    "full_body": /\b(full\s*body|total\s*body|whole\s*body)\b/i,
    "cardio": /\b(cardio|conditioning|endurance|running|hiit)\b/i,
  };

  for (const [focus, pattern] of Object.entries(focusPatterns)) {
    if (pattern.test(normalizedMessage)) {
      context.focus = focus;
      break;
    }
  }

  // Extract intensity mentions
  if (/\b(light|easy|recovery|deload)\b/i.test(normalizedMessage)) {
    context.intensity = "light";
  } else if (/\b(moderate|medium|normal)\b/i.test(normalizedMessage)) {
    context.intensity = "moderate";
  } else if (/\b(hard|intense|challenging|tough)\b/i.test(normalizedMessage)) {
    context.intensity = "hard";
  } else if (/\b(max|maximum|all.out|pr|personal\s*record)\b/i.test(normalizedMessage)) {
    context.intensity = "max";
  }

  return context;
}
