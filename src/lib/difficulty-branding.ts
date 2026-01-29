/**
 * Fun difficulty branding for challenges and workouts
 * 
 * Instead of boring labels like "beginner" and "advanced",
 * we use fun, engaging labels that motivate users.
 */

export interface DifficultyBrand {
  label: string;
  emoji: string;
  color: string; // Tailwind color class
  bgColor: string;
  borderColor: string;
  theme: "playful" | "fire" | "zen" | "military";
}

export const DIFFICULTY_BRANDS: Record<string, DifficultyBrand> = {
  beginner: {
    label: "Getting Started",
    emoji: "🌱",
    color: "text-green-600",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
    theme: "playful",
  },
  easy: {
    label: "Easy Does It",
    emoji: "🌿",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/30",
    theme: "zen",
  },
  intermediate: {
    label: "Leveling Up",
    emoji: "💪",
    color: "text-blue-600",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    theme: "fire",
  },
  moderate: {
    label: "Getting Serious",
    emoji: "⚡",
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/30",
    theme: "fire",
  },
  advanced: {
    label: "Beast Mode",
    emoji: "🔥",
    color: "text-orange-600",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
    theme: "fire",
  },
  hard: {
    label: "No Pain No Gain",
    emoji: "💥",
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/30",
    theme: "military",
  },
  extreme: {
    label: "Insane",
    emoji: "☠️",
    color: "text-red-600",
    bgColor: "bg-red-600/20",
    borderColor: "border-red-600/30",
    theme: "military",
  },
  elite: {
    label: "Elite",
    emoji: "👑",
    color: "text-purple-600",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
    theme: "military",
  },
};

/**
 * Get the fun difficulty branding for a given difficulty level
 */
export function getDifficultyBrand(difficulty: string | null | undefined): DifficultyBrand {
  if (!difficulty) {
    return DIFFICULTY_BRANDS.intermediate;
  }
  
  const normalized = difficulty.toLowerCase().trim();
  return DIFFICULTY_BRANDS[normalized] || DIFFICULTY_BRANDS.intermediate;
}

/**
 * Get the full branded label with emoji
 */
export function getDifficultyLabel(difficulty: string | null | undefined): string {
  const brand = getDifficultyBrand(difficulty);
  return `${brand.emoji} ${brand.label}`;
}

/**
 * Get the fun label for a custom difficulty_label field (from database)
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
 */
export function getThemeStyles(theme: DifficultyBrand["theme"]) {
  switch (theme) {
    case "playful":
      return {
        gradient: "from-green-400 to-emerald-500",
        accent: "text-green-500",
      };
    case "fire":
      return {
        gradient: "from-orange-400 to-red-500",
        accent: "text-orange-500",
      };
    case "zen":
      return {
        gradient: "from-teal-400 to-cyan-500",
        accent: "text-teal-500",
      };
    case "military":
      return {
        gradient: "from-red-500 to-red-700",
        accent: "text-red-600",
      };
  }
}
