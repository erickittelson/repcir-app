/**
 * Seed Challenge Milestones
 * 
 * Adds milestones to existing challenges with:
 * - Structured progression
 * - Fun difficulty labels
 * - Linked workouts where applicable
 * 
 * Run with: npx tsx scripts/seed-challenge-milestones.ts
 */

// Fun difficulty branding
const DIFFICULTY_BRANDS = {
  beginner: { label: "Getting Started 🌱", theme: "playful" },
  intermediate: { label: "Leveling Up 💪", theme: "fire" },
  advanced: { label: "Beast Mode 🔥", theme: "fire" },
  extreme: { label: "Insane ☠️", theme: "military" },
};

// Milestone definitions for each challenge
interface MilestoneDefinition {
  order: number;
  name: string;
  description: string;
  durationDays?: number;
  completionType: "workout" | "days" | "goal" | "manual";
  requiredCompletions: number;
  goalTargetValue?: number;
  goalTargetUnit?: string;
  unlockMessage: string;
}

const CHALLENGE_MILESTONES: Record<string, { difficultyLabel: string; brandingTheme: string; milestones: MilestoneDefinition[] }> = {
  // Couch to 5K
  "Couch to 5K": {
    difficultyLabel: "Getting Started 🌱",
    brandingTheme: "playful",
    milestones: [
      {
        order: 1,
        name: "Baby Steps",
        description: "Week 1-2: Walk/run intervals - 60 seconds running, 90 seconds walking",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "You're off the couch! 🛋️➡️🏃 Keep going!",
      },
      {
        order: 2,
        name: "Finding Your Rhythm",
        description: "Week 3-4: Increase run intervals to 90 seconds",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "You're building momentum! Your body is adapting 💪",
      },
      {
        order: 3,
        name: "Building Endurance",
        description: "Week 5-6: 5-minute continuous runs",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "5 minutes non-stop! You're becoming a runner! 🏃‍♂️",
      },
      {
        order: 4,
        name: "The Final Push",
        description: "Week 7-8: 20-25 minute continuous runs",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "Almost there! One more phase to glory! 🌟",
      },
      {
        order: 5,
        name: "5K Victory!",
        description: "Run your first 5K without stopping",
        durationDays: 7,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 5,
        goalTargetUnit: "km",
        unlockMessage: "🎉 YOU DID IT! You're officially a 5K runner! 🏅",
      },
    ],
  },

  // 30-Day Push-Up Challenge
  "30-Day Push-Up Challenge": {
    difficultyLabel: "Getting Started 🌱",
    brandingTheme: "playful",
    milestones: [
      {
        order: 1,
        name: "Foundation Week",
        description: "Days 1-7: Start with 10-20 push-ups daily, focus on form",
        durationDays: 7,
        completionType: "days",
        requiredCompletions: 7,
        unlockMessage: "Week 1 complete! Your form is solid 💪",
      },
      {
        order: 2,
        name: "Building Volume",
        description: "Days 8-15: Increase to 30-50 push-ups daily",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "Volume is building! You're getting stronger! 🔥",
      },
      {
        order: 3,
        name: "Push Your Limits",
        description: "Days 16-23: Hit 60-80 push-ups daily",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "Over 60 push-ups daily! You're a machine! 🤖",
      },
      {
        order: 4,
        name: "The Century Club",
        description: "Days 24-30: Achieve 100 push-ups in a day",
        durationDays: 7,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 100,
        goalTargetUnit: "push-ups",
        unlockMessage: "🎯 100 PUSH-UPS! Welcome to the Century Club! 🏆",
      },
    ],
  },

  // Pull-Up Progress
  "Pull-Up Progress": {
    difficultyLabel: "Leveling Up 💪",
    brandingTheme: "fire",
    milestones: [
      {
        order: 1,
        name: "Hang Time",
        description: "Week 1-2: Dead hangs and negative pull-ups",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "Grip strength activated! You're building the foundation 🧱",
      },
      {
        order: 2,
        name: "First Rep",
        description: "Week 3-4: Achieve your first full pull-up",
        durationDays: 14,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 1,
        goalTargetUnit: "pull-up",
        unlockMessage: "YOUR FIRST PULL-UP! This is a huge milestone! 🎉",
      },
      {
        order: 3,
        name: "Triple Threat",
        description: "Week 5-6: Hit 3 consecutive pull-ups",
        durationDays: 14,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 3,
        goalTargetUnit: "pull-ups",
        unlockMessage: "3 in a row! You're officially doing pull-ups! 💪",
      },
      {
        order: 4,
        name: "Building Sets",
        description: "Week 7-8: Complete 3 sets of 3+ pull-ups",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "Multiple sets! Your back is getting strong 🦍",
      },
      {
        order: 5,
        name: "The Double Digits",
        description: "Week 9+: Achieve 10 pull-ups in a single set",
        durationDays: 14,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 10,
        goalTargetUnit: "pull-ups",
        unlockMessage: "🔟 TEN PULL-UPS! You've mastered the pull-up! 🏆",
      },
    ],
  },

  // Muscle Up Mission
  "Muscle Up Mission": {
    difficultyLabel: "Beast Mode 🔥",
    brandingTheme: "fire",
    milestones: [
      {
        order: 1,
        name: "Pull-Up Mastery",
        description: "Week 1-3: Achieve 15+ strict pull-ups",
        durationDays: 21,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 15,
        goalTargetUnit: "pull-ups",
        unlockMessage: "15 pull-ups! You've got the pulling power 💪",
      },
      {
        order: 2,
        name: "Dip Strength",
        description: "Week 4-6: 20+ strict dips with full ROM",
        durationDays: 21,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 20,
        goalTargetUnit: "dips",
        unlockMessage: "Dip game strong! The pressing power is there 🔥",
      },
      {
        order: 3,
        name: "Explosive Pull",
        description: "Week 7-9: High pull-ups (chest to bar)",
        durationDays: 21,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "Chest to bar! You're getting explosive! 💥",
      },
      {
        order: 4,
        name: "The Transition",
        description: "Week 10-12: Practice the transition with bands or negatives",
        durationDays: 21,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "The transition is clicking! Almost there! ⚡",
      },
      {
        order: 5,
        name: "MUSCLE UP!",
        description: "Achieve your first muscle up",
        durationDays: 7,
        completionType: "manual",
        requiredCompletions: 1,
        unlockMessage: "🎯 MUSCLE UP ACHIEVED! You're a certified beast! 🦾",
      },
    ],
  },

  // 100 Burpees a Day
  "100 Burpees a Day": {
    difficultyLabel: "Insane ☠️",
    brandingTheme: "military",
    milestones: [
      {
        order: 1,
        name: "Survive Day 1",
        description: "Just get through day 1 with 100 burpees",
        durationDays: 1,
        completionType: "days",
        requiredCompletions: 1,
        unlockMessage: "Day 1 DONE! You're tougher than you thought 💀",
      },
      {
        order: 2,
        name: "Week of Pain",
        description: "Days 2-7: Complete your first week",
        durationDays: 6,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "One week of 100 daily burpees! You're insane! 🔥",
      },
      {
        order: 3,
        name: "The Grind",
        description: "Days 8-15: Push through the middle",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "Halfway there! You're forged in fire now 🔥🔥",
      },
      {
        order: 4,
        name: "Final Push",
        description: "Days 16-30: Finish strong",
        durationDays: 15,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "3,000 BURPEES COMPLETED! You are a LEGEND! 👑",
      },
    ],
  },

  // Squat Challenge
  "Squat Challenge": {
    difficultyLabel: "Leveling Up 💪",
    brandingTheme: "fire",
    milestones: [
      {
        order: 1,
        name: "Foundation Phase",
        description: "Days 1-10: 50-100 daily squats, perfecting form",
        durationDays: 10,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "Form is dialed in! Your legs are waking up 🦵",
      },
      {
        order: 2,
        name: "Volume Building",
        description: "Days 11-20: 150-200 daily squats",
        durationDays: 10,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "200 squats a day! Your legs are on fire! 🔥",
      },
      {
        order: 3,
        name: "Peak Performance",
        description: "Days 21-30: Hit 250 squats in a single day",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 250,
        goalTargetUnit: "squats",
        unlockMessage: "250 SQUATS! Your legs are legendary now! 🦵👑",
      },
    ],
  },

  // Plank Challenge
  "Plank Challenge": {
    difficultyLabel: "Getting Started 🌱",
    brandingTheme: "zen",
    milestones: [
      {
        order: 1,
        name: "The First Minute",
        description: "Days 1-10: Hold a plank for 60 seconds",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 60,
        goalTargetUnit: "seconds",
        unlockMessage: "1 minute plank! Your core is engaged 🧘",
      },
      {
        order: 2,
        name: "Two Minutes of Steel",
        description: "Days 11-20: Reach a 2-minute plank",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 120,
        goalTargetUnit: "seconds",
        unlockMessage: "2 minutes! Your core is solid steel! 🔩",
      },
      {
        order: 3,
        name: "The 5-Minute Club",
        description: "Days 21-30: Achieve a 5-minute plank",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 300,
        goalTargetUnit: "seconds",
        unlockMessage: "5 MINUTE PLANK! You have an unbreakable core! 💪",
      },
    ],
  },

  // HIIT Warrior
  "HIIT Warrior": {
    difficultyLabel: "Beast Mode 🔥",
    brandingTheme: "military",
    milestones: [
      {
        order: 1,
        name: "Initiation",
        description: "Days 1-4: Complete 4 consecutive HIIT sessions",
        durationDays: 4,
        completionType: "days",
        requiredCompletions: 4,
        unlockMessage: "Initiation complete! You're a warrior now ⚔️",
      },
      {
        order: 2,
        name: "Battle Tested",
        description: "Days 5-10: Push through the fire",
        durationDays: 6,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "Battle tested! You thrive in the intensity 🔥",
      },
      {
        order: 3,
        name: "HIIT Legend",
        description: "Days 11-14: Complete the warrior gauntlet",
        durationDays: 4,
        completionType: "days",
        requiredCompletions: 4,
        unlockMessage: "14 days of HIIT! You are a true WARRIOR! ⚔️👑",
      },
    ],
  },

  // 10K Steps Daily
  "10K Steps Daily": {
    difficultyLabel: "Getting Started 🌱",
    brandingTheme: "playful",
    milestones: [
      {
        order: 1,
        name: "First Steps",
        description: "Days 1-7: Hit 10K steps for a full week",
        durationDays: 7,
        completionType: "days",
        requiredCompletions: 7,
        goalTargetValue: 10000,
        goalTargetUnit: "steps",
        unlockMessage: "One week of walking! You're on the move! 🚶",
      },
      {
        order: 2,
        name: "Building the Habit",
        description: "Days 8-15: Keep the streak alive",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "2 weeks! This is becoming a habit! 🏃",
      },
      {
        order: 3,
        name: "Walking Champion",
        description: "Days 16-30: Complete the full month",
        durationDays: 15,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "30 DAYS of 10K steps! That's 300,000 steps! 🏆",
      },
    ],
  },
};

// Generate SQL statements
function generateChallengeUpdateSQL(challengeName: string, config: typeof CHALLENGE_MILESTONES[string]): string {
  return `UPDATE challenges 
SET difficulty_label = '${config.difficultyLabel}', branding_theme = '${config.brandingTheme}'
WHERE name = '${challengeName.replace(/'/g, "''")}';`;
}

function generateMilestoneSQL(challengeName: string, milestone: MilestoneDefinition): string {
  const id = crypto.randomUUID();
  
  return `INSERT INTO challenge_milestones (id, challenge_id, "order", name, description, duration_days, completion_type, required_completions, goal_target_value, goal_target_unit, unlock_message, created_at)
SELECT '${id}', c.id, ${milestone.order}, '${milestone.name.replace(/'/g, "''")}', '${milestone.description.replace(/'/g, "''")}', ${milestone.durationDays || "NULL"}, '${milestone.completionType}', ${milestone.requiredCompletions}, ${milestone.goalTargetValue || "NULL"}, ${milestone.goalTargetUnit ? `'${milestone.goalTargetUnit}'` : "NULL"}, '${milestone.unlockMessage.replace(/'/g, "''")}', NOW()
FROM challenges c
WHERE c.name = '${challengeName.replace(/'/g, "''")}'
ON CONFLICT DO NOTHING;`;
}

// Print all SQL statements
console.log("-- Seed Challenge Milestones and Fun Branding");
console.log("-- Run these statements in your database\n");

console.log("-- =====================");
console.log("-- UPDATE CHALLENGE BRANDING");
console.log("-- =====================\n");

Object.entries(CHALLENGE_MILESTONES).forEach(([name, config]) => {
  console.log(generateChallengeUpdateSQL(name, config));
  console.log();
});

console.log("\n-- =====================");
console.log("-- ADD MILESTONES");
console.log("-- =====================\n");

Object.entries(CHALLENGE_MILESTONES).forEach(([challengeName, config]) => {
  console.log(`-- ${challengeName}`);
  config.milestones.forEach((milestone) => {
    console.log(generateMilestoneSQL(challengeName, milestone));
    console.log();
  });
});

console.log("\n-- Done! Copy and run these SQL statements in your database.");
