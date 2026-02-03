/**
 * RALLYPROOF Difficulty Branding
 *
 * Premium, earned, meritocratic difficulty labels.
 * No emojis. No fluff. Earned respect.
 *
 * "Earn Your Circle. Effort is the standard."
 */

export interface DifficultyBrand {
  label: string;
  shortLabel: string;
  color: string; // Tailwind color class
  bgColor: string;
  borderColor: string;
  theme: "foundation" | "standard" | "earned" | "elite";
}

export const DIFFICULTY_BRANDS: Record<string, DifficultyBrand> = {
  beginner: {
    label: "Foundation",
    shortLabel: "FND",
    color: "text-stone-400",
    bgColor: "bg-stone-500/15",
    borderColor: "border-stone-500/25",
    theme: "foundation",
  },
  easy: {
    label: "Entry Level",
    shortLabel: "ENT",
    color: "text-stone-300",
    bgColor: "bg-stone-400/15",
    borderColor: "border-stone-400/25",
    theme: "foundation",
  },
  intermediate: {
    label: "Standard",
    shortLabel: "STD",
    color: "text-amber-600",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/25",
    theme: "standard",
  },
  moderate: {
    label: "Proven",
    shortLabel: "PRV",
    color: "text-amber-500",
    bgColor: "bg-amber-400/15",
    borderColor: "border-amber-400/25",
    theme: "standard",
  },
  advanced: {
    label: "Earned",
    shortLabel: "ERN",
    color: "text-brand",
    bgColor: "bg-brand/15",
    borderColor: "border-brand/25",
    theme: "earned",
  },
  hard: {
    label: "Forged",
    shortLabel: "FRG",
    color: "text-red-500",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/25",
    theme: "earned",
  },
  extreme: {
    label: "Blood Oath",
    shortLabel: "BTH",
    color: "text-red-600",
    bgColor: "bg-red-600/15",
    borderColor: "border-red-600/25",
    theme: "elite",
  },
  elite: {
    label: "Elite",
    shortLabel: "ELT",
    color: "text-brand",
    bgColor: "bg-brand/20",
    borderColor: "border-brand/30",
    theme: "elite",
  },
};

/**
 * Get the Rallyproof difficulty branding for a given difficulty level
 */
export function getDifficultyBrand(
  difficulty: string | null | undefined
): DifficultyBrand {
  if (!difficulty) {
    return DIFFICULTY_BRANDS.intermediate;
  }

  const normalized = difficulty.toLowerCase().trim();
  return DIFFICULTY_BRANDS[normalized] || DIFFICULTY_BRANDS.intermediate;
}

/**
 * Get the branded label (no emoji - per Rallyproof brand guidelines)
 */
export function getDifficultyLabel(
  difficulty: string | null | undefined
): string {
  const brand = getDifficultyBrand(difficulty);
  return brand.label;
}

/**
 * Get the short military-style label
 */
export function getDifficultyShortLabel(
  difficulty: string | null | undefined
): string {
  const brand = getDifficultyBrand(difficulty);
  return brand.shortLabel;
}

/**
 * Get the label for a custom difficulty_label field (from database)
 * Falls back to computing from the base difficulty
 */
export function getCustomOrDefaultLabel(
  customLabel: string | null | undefined,
  baseDifficulty: string | null | undefined
): string {
  if (customLabel) {
    return customLabel;
  }
  return getDifficultyLabel(baseDifficulty);
}

/**
 * Theme-specific styling helpers
 * Rallyproof palette: Gold (earned), Stone (foundation), Red (accountability)
 */
export function getThemeStyles(theme: DifficultyBrand["theme"]) {
  switch (theme) {
    case "foundation":
      return {
        gradient: "from-stone-500 to-stone-600",
        accent: "text-stone-400",
        message: "Build the base.",
      };
    case "standard":
      return {
        gradient: "from-amber-500 to-amber-600",
        accent: "text-amber-500",
        message: "The work begins.",
      };
    case "earned":
      return {
        gradient: "from-brand to-amber-600",
        accent: "text-brand",
        message: "Earn it.",
      };
    case "elite":
      return {
        gradient: "from-brand to-red-600",
        accent: "text-brand",
        message: "For those who show up.",
      };
  }
}

/**
 * Get an accountability message based on difficulty
 */
export function getDifficultyMessage(
  difficulty: string | null | undefined
): string {
  const brand = getDifficultyBrand(difficulty);
  const styles = getThemeStyles(brand.theme);
  return styles.message;
}
