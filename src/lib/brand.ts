/**
 * RALLYPROOF Brand Constants
 *
 * "Earn Your Circle. Effort is the standard."
 *
 * Premium, earned, meritocratic fitness aesthetic.
 * This file contains all brand constants for the Rallyproof app.
 */

export const BRAND = {
  name: "Rallyproof",
  tagline: "Earn Your Circle",
  philosophy: "Effort is the standard.",
  description: "Earn your circle. Built by those who show up.",

  // Brand colors (hex values)
  colors: {
    // Primary
    rallyproofBlack: "#1A1A2E",
    earnedGold: "#C9A227",
    legionWhite: "#F5F5F0",

    // Secondary
    bronzeEffort: "#8B7355",
    forgeGray: "#2D3436",
    bloodOath: "#6B0F1A",
    victoryGreen: "#1B4332",

    // Accents
    triumph: "#D4AF37",
    stone: "#E8E4E1",
  },

  // Voice characteristics
  voice: {
    traits: [
      "Commanding - We speak with authority earned through standards",
      "Direct - No fluff, no coddling, no participation trophies",
      "Warm (earned) - Respect and camaraderie for those who show up",
      "Aspirational - We believe you can be more—and we'll hold you to it",
      "Anti-fragile - Discomfort is the point; struggle is the feature",
    ],
    weAre: [
      "A drill sergeant who genuinely wants you to succeed",
      "The friend who tells you what you need to hear",
      "A Roman centurion addressing their rallyproof before battle",
    ],
    weAreNot: [
      "A cheerleader with empty enthusiasm",
      "A disappointed parent guilt-tripping you",
      'A bro-culture gym screaming "LET\'S GOOOO"',
    ],
  },

  // Messaging
  messages: {
    // Achievement
    workoutComplete: "Done. Not easy. Not supposed to be.",
    streakAchieved: (days: number) =>
      `${days} days. Most quit by day 7. You're still here.`,
    prAchieved: "New standard. The bar moves when you do.",
    rallyproofComplete: "Every member. Every rep. Today. This is what a unit looks like.",

    // Accountability
    othersFinished: (count: number, total: number) =>
      `${count} of ${total} finished today. The gap is showing.`,
    youAreLast: "You closed the gap. Rallyproof complete.",
    youAreFirst: "First in. Your rallyproof is watching.",
    streakAtRisk: "The streak survives or dies today. Your call.",
    streakBroken: "Broken. Rebuild starts now.",

    // Motivation (use sparingly)
    morningPrompt: "The day waits for no one.",
    weekend: "Weekends aren't rest days. They're unscheduled days.",
    afterAbsence: "The rallyproof kept moving. Time to close the distance.",

    // Onboarding
    welcome: "You showed up. That's step one.",
    philosophy:
      "This isn't a fitness app that celebrates showing up. This is a fitness app that expects it.",
    notForEveryone: "This isn't for everyone. That's the point.",
  },

  // Words to use
  vocabulary: {
    use: [
      "earn",
      "hunt",
      "work",
      "train",
      "build",
      "forge",
      "rallyproof",
      "unit",
      "circle",
      "pack",
      "formation",
      "standard",
      "expectation",
      "line",
      "bar",
      "level",
      "discipline",
      "consistency",
      "accountability",
      "commitment",
      "earned",
      "proven",
      "built",
      "forged",
      "achieved",
    ],
    avoid: [
      "journey",
      "wellness",
      "self-care",
      "balance",
      "crushing it",
      "killing it",
      "beast mode",
      "let's go",
      "good job",
      "great effort",
      "proud of you",
      "fun",
      "easy",
      "simple",
      "quick",
      "hopefully",
      "maybe",
      "try",
      "just",
    ],
  },
} as const;

/**
 * Get a random accountability message for when user hasn't worked out
 */
export function getAccountabilityMessage(
  othersCompleted: number,
  totalMembers: number
): string {
  if (othersCompleted === 0) {
    return "Your rallyproof is still. Who moves first?";
  }
  if (othersCompleted === totalMembers - 1) {
    return `${othersCompleted} of ${totalMembers} finished today. Don't be the gap.`;
  }
  return BRAND.messages.othersFinished(othersCompleted, totalMembers);
}

/**
 * Get a celebration message based on achievement type
 */
export function getCelebrationMessage(
  type: "workout" | "streak" | "pr" | "rallyproof",
  value?: number
): string {
  switch (type) {
    case "workout":
      return BRAND.messages.workoutComplete;
    case "streak":
      return value ? BRAND.messages.streakAchieved(value) : "The standard is set.";
    case "pr":
      return BRAND.messages.prAchieved;
    case "rallyproof":
      return BRAND.messages.rallyproofComplete;
  }
}
