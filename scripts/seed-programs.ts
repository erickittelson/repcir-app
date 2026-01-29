/**
 * Seed script to create official multi-week training programs
 * 
 * Run with: npx tsx scripts/seed-programs.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import {
  communityPrograms,
  programWeeks,
  programWorkouts,
  workoutPlans,
} from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Workout plan IDs from our seeded workouts
const WORKOUT_IDS = {
  // Strength - 5/3/1
  "531_squat": "85959085-9e19-4b04-a16e-fcffb6f9193b",
  "531_bench": "69b543b5-e14d-4dc9-92b1-552a6bc5c2b9",
  "531_deadlift": "1e7997e7-e22a-4982-968e-14c981b3f53a",
  "531_ohp": "49d2d0ea-9f7a-495a-9086-c02496bda226",
  
  // StrongLifts
  "sl_a": "50937a94-12ab-4dce-b27c-1c49efca817d",
  "sl_b": "6234482c-671a-4168-96c2-4dfcacdf12a6",
  
  // Texas Method
  "texas_volume": "c43cdbe4-1ba6-49ae-800d-914af1be46e0",
  "texas_intensity": "ebab476b-180c-4d60-aaeb-9342e99f5a2d",
  
  // PPL
  "push": "6abf5cc6-2cd9-4ceb-a9fd-6b2dc3a4f5d7",
  "pull": "841b8dc9-0994-4a74-9883-2eba418c3fb5",
  "legs_ppl": "2973f904-9f8b-4f3c-b496-d788d327e961",
  
  // Hypertrophy
  "upper_hypertrophy": "6b0a9c0d-0848-47c3-b9da-36500d8ef9b0",
  "lower_hypertrophy": "ed20eeb9-d99e-432a-940b-f1455455b533",
  
  // Arnold
  "arnold_chest_back": "04df2de9-1d72-42c2-95ba-5a1d9008b8cc",
  
  // GVT
  "gvt_chest": "bc24661d-1dca-4462-9698-4bfa7e0ed2ac",
  
  // Specialization
  "deadlift_special": "c25e8afa-c770-4d7b-8eb8-2c329a063984",
  "chest_special": "cbd597e0-fa33-4816-b261-5fe828cf3f22",
  "shoulder_builder": "8c2a5f2a-d629-48ce-a8dc-53e86da9c4b6",
  "back_builder": "8d724c5c-41ce-41ea-89b3-1b9d7d06d0c0",
  "arm_blaster": "a4a23c12-6f7f-4a40-b4ca-9aa267b6fe47",
  "leg_destroyer": "7a6dd100-5074-4754-b14a-0cacfa2a1caa",
  "heavy_singles": "c45ef77f-01f1-49e5-acaf-6ba5777d44b0",
  "full_body_pump": "e4f278fb-2cea-4ef7-b248-e8a021b657a3",
  "bro_chest": "6fa0dd7f-ac42-4600-8c16-3b35362e1a91",
  "fst7_shoulders": "46187eb8-70b2-482a-a2f3-9994eb3e7226",
  
  // CrossFit/HIIT
  "fran": "4a140ea5-a4d3-4fe7-aa5b-aab255e09877",
  "murph": "665fed21-893f-403d-880d-b60b44f35f53",
  "helen": "ed720726-c649-4f80-87ba-ecd41cc5c65c",
  "grace": "978daa6b-115e-4b08-8589-0969d60519d9",
  "isabel": "4f09e20d-9a30-4273-b049-cf1e3237e8d2",
  "cindy": "8e6ebe7d-8cf2-49a8-b13a-5752ee41e471",
  "dt": "0d9078f3-860e-45d6-9eb2-3c419a0eb295",
  "filthy_fifty": "587b784e-9512-4f06-8a2a-0343d53b8fc3",
  "chipper": "187bb2bc-1e63-4b19-b4ec-9d4f957c549f",
  "fight_gone_bad": "e0246bad-6af7-4e42-8e40-b0dd77e81955",
  "death_burpees": "7c47a604-47b5-4700-b1e9-259ec2417c62",
  "tabata": "199f7394-64cf-4706-9bff-a27a9e944b45",
  "amrap_12": "10412a88-fe07-4612-9b3f-72a7500c526a",
  "emom_20": "248b386a-d6a6-4c34-b837-e80919b33df2",
  
  // Cardio
  "tempo_run": "06d6bbc4-eccd-4585-b7e7-ebedb382ddca",
  "sprint_intervals": "f2b64c29-afe6-4666-8b87-68aa7af89a4f",
  "hill_sprints": "f33218e7-3562-48eb-81d0-c8ff02987a7c",
  "fartlek": "bd642533-04b5-4f53-82af-173e90713dd3",
  "long_slow": "cd07afb2-7b9e-4a64-a435-9932e4bf1085",
  "rowing_intervals": "d08dc98b-14d4-44e5-821f-275736c9bbd2",
  "row_ladder": "ccb29a86-fc12-40d3-a540-4b22bbccaf3b",
  "bike_pyramid": "4e026765-5cfa-4772-b4f8-f7adf18d22d5",
  "assault_bike": "307b18c0-17ce-4dfa-8add-9a16870b452a",
  "jump_rope": "ce7f8922-3a0b-44b6-b307-8b537cae4e7c",
};

interface ProgramDefinition {
  name: string;
  description: string;
  category: string;
  difficulty: string;
  durationWeeks: number;
  daysPerWeek: number;
  avgWorkoutDuration: number;
  primaryGoal: string;
  targetMuscles: string[];
  equipmentRequired: string[];
  weeks: {
    weekNumber: number;
    name: string;
    focus: string;
    notes?: string;
    workouts: {
      dayNumber: number;
      name: string;
      focus: string;
      workoutPlanId?: string;
      estimatedDuration: number;
      notes?: string;
    }[];
  }[];
}

const PROGRAMS: ProgramDefinition[] = [
  // 1. StrongLifts 5x5
  {
    name: "StrongLifts 5x5",
    description: "The classic beginner strength program. Build a foundation of strength with compound lifts, adding weight every session. Perfect for new lifters looking to get strong fast.",
    category: "strength",
    difficulty: "beginner",
    durationWeeks: 12,
    daysPerWeek: 3,
    avgWorkoutDuration: 45,
    primaryGoal: "Build strength foundation",
    targetMuscles: ["chest", "back", "legs", "shoulders", "arms"],
    equipmentRequired: ["barbell", "squat rack", "bench"],
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 4 ? "Learning the lifts" : i < 8 ? "Building strength" : "Pushing limits",
      notes: i === 0 ? "Start light, focus on form" : undefined,
      workouts: [
        { dayNumber: 1, name: "Workout A", focus: "Squat, Bench, Row", workoutPlanId: WORKOUT_IDS.sl_a, estimatedDuration: 45 },
        { dayNumber: 3, name: "Workout B", focus: "Squat, OHP, Deadlift", workoutPlanId: WORKOUT_IDS.sl_b, estimatedDuration: 45 },
        { dayNumber: 5, name: "Workout A", focus: "Squat, Bench, Row", workoutPlanId: WORKOUT_IDS.sl_a, estimatedDuration: 45 },
      ],
    })),
  },
  
  // 2. 5/3/1 For Beginners
  {
    name: "5/3/1 Beginner",
    description: "Jim Wendler's proven strength program adapted for beginners. Four days per week focusing on the big four lifts with submaximal training for steady, sustainable progress.",
    category: "powerlifting",
    difficulty: "intermediate",
    durationWeeks: 16,
    daysPerWeek: 4,
    avgWorkoutDuration: 60,
    primaryGoal: "Long-term strength development",
    targetMuscles: ["chest", "back", "legs", "shoulders"],
    equipmentRequired: ["barbell", "squat rack", "bench", "pull-up bar"],
    weeks: Array.from({ length: 16 }, (_, i) => {
      const cycleWeek = (i % 4) + 1;
      return {
        weekNumber: i + 1,
        name: `Week ${i + 1} (Cycle ${Math.floor(i / 4) + 1}, Week ${cycleWeek})`,
        focus: cycleWeek === 1 ? "5s Week" : cycleWeek === 2 ? "3s Week" : cycleWeek === 3 ? "5/3/1 Week" : "Deload",
        workouts: [
          { dayNumber: 1, name: "Squat Day", focus: "Squat + assistance", workoutPlanId: WORKOUT_IDS["531_squat"], estimatedDuration: 60 },
          { dayNumber: 2, name: "Bench Day", focus: "Bench + assistance", workoutPlanId: WORKOUT_IDS["531_bench"], estimatedDuration: 60 },
          { dayNumber: 4, name: "Deadlift Day", focus: "Deadlift + assistance", workoutPlanId: WORKOUT_IDS["531_deadlift"], estimatedDuration: 60 },
          { dayNumber: 5, name: "OHP Day", focus: "Overhead Press + assistance", workoutPlanId: WORKOUT_IDS["531_ohp"], estimatedDuration: 60 },
        ],
      };
    }),
  },
  
  // 3. Texas Method
  {
    name: "Texas Method",
    description: "An intermediate program built around weekly periodization. Volume day builds work capacity, recovery day maintains, and intensity day sets PRs.",
    category: "powerlifting",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 3,
    avgWorkoutDuration: 75,
    primaryGoal: "Break through plateaus",
    targetMuscles: ["chest", "back", "legs"],
    equipmentRequired: ["barbell", "squat rack", "bench"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Adaptation" : i < 6 ? "Progressive overload" : "Peaking",
      workouts: [
        { dayNumber: 1, name: "Volume Day", focus: "5x5 @ 90% of 5RM", workoutPlanId: WORKOUT_IDS.texas_volume, estimatedDuration: 90 },
        { dayNumber: 3, name: "Recovery Day", focus: "Light technique work", workoutPlanId: WORKOUT_IDS.full_body_pump, estimatedDuration: 45 },
        { dayNumber: 5, name: "Intensity Day", focus: "Work up to new 5RM", workoutPlanId: WORKOUT_IDS.texas_intensity, estimatedDuration: 75 },
      ],
    })),
  },
  
  // 4. Push/Pull/Legs
  {
    name: "Push Pull Legs (PPL)",
    description: "The classic bodybuilding split run twice per week. Great balance of volume and frequency for building muscle. Perfect for intermediate lifters.",
    category: "hypertrophy",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 6,
    avgWorkoutDuration: 60,
    primaryGoal: "Build muscle mass",
    targetMuscles: ["chest", "back", "legs", "shoulders", "arms"],
    equipmentRequired: ["barbell", "dumbbells", "cable machine", "squat rack"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Building volume tolerance" : i < 6 ? "Progressive overload" : "Intensification",
      workouts: [
        { dayNumber: 1, name: "Push A", focus: "Chest, shoulders, triceps", workoutPlanId: WORKOUT_IDS.push, estimatedDuration: 60 },
        { dayNumber: 2, name: "Pull A", focus: "Back, biceps, rear delts", workoutPlanId: WORKOUT_IDS.pull, estimatedDuration: 60 },
        { dayNumber: 3, name: "Legs A", focus: "Quads, hamstrings, calves", workoutPlanId: WORKOUT_IDS.legs_ppl, estimatedDuration: 60 },
        { dayNumber: 4, name: "Push B", focus: "Chest, shoulders, triceps", workoutPlanId: WORKOUT_IDS.push, estimatedDuration: 60 },
        { dayNumber: 5, name: "Pull B", focus: "Back, biceps, rear delts", workoutPlanId: WORKOUT_IDS.pull, estimatedDuration: 60 },
        { dayNumber: 6, name: "Legs B", focus: "Quads, hamstrings, calves", workoutPlanId: WORKOUT_IDS.legs_ppl, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 5. Upper/Lower Split
  {
    name: "Upper Lower Hypertrophy",
    description: "A 4-day hypertrophy-focused split hitting each muscle group twice per week. Optimal frequency for muscle growth with manageable time commitment.",
    category: "hypertrophy",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 4,
    avgWorkoutDuration: 60,
    primaryGoal: "Maximize muscle growth",
    targetMuscles: ["chest", "back", "legs", "shoulders", "arms"],
    equipmentRequired: ["barbell", "dumbbells", "cable machine"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Volume accumulation" : i < 6 ? "Progressive overload" : "Deload/Intensify",
      workouts: [
        { dayNumber: 1, name: "Upper A", focus: "Horizontal push/pull emphasis", workoutPlanId: WORKOUT_IDS.upper_hypertrophy, estimatedDuration: 60 },
        { dayNumber: 2, name: "Lower A", focus: "Quad emphasis", workoutPlanId: WORKOUT_IDS.lower_hypertrophy, estimatedDuration: 60 },
        { dayNumber: 4, name: "Upper B", focus: "Vertical push/pull emphasis", workoutPlanId: WORKOUT_IDS.upper_hypertrophy, estimatedDuration: 60 },
        { dayNumber: 5, name: "Lower B", focus: "Posterior chain emphasis", workoutPlanId: WORKOUT_IDS.lower_hypertrophy, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 6. German Volume Training
  {
    name: "German Volume Training",
    description: "The legendary 10x10 program for extreme muscle growth. Not for the faint of heart - this high-volume program will challenge even experienced lifters.",
    category: "hypertrophy",
    difficulty: "advanced",
    durationWeeks: 6,
    daysPerWeek: 4,
    avgWorkoutDuration: 75,
    primaryGoal: "Extreme muscle hypertrophy",
    targetMuscles: ["chest", "back", "legs", "shoulders"],
    equipmentRequired: ["barbell", "dumbbells"],
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "10x10 Phase" : "Intensification Phase",
      notes: i === 0 ? "Start with 60% 1RM for 10x10" : undefined,
      workouts: [
        { dayNumber: 1, name: "Chest & Back", focus: "10x10 antagonist supersets", workoutPlanId: WORKOUT_IDS.gvt_chest, estimatedDuration: 75 },
        { dayNumber: 2, name: "Legs", focus: "10x10 squats + accessories", workoutPlanId: WORKOUT_IDS.leg_destroyer, estimatedDuration: 75 },
        { dayNumber: 4, name: "Arms", focus: "10x10 biceps/triceps supersets", workoutPlanId: WORKOUT_IDS.arm_blaster, estimatedDuration: 60 },
        { dayNumber: 5, name: "Shoulders", focus: "10x10 lateral raises + presses", workoutPlanId: WORKOUT_IDS.fst7_shoulders, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 7. CrossFit Benchmark Series
  {
    name: "CrossFit Benchmark Series",
    description: "Master the classic CrossFit benchmark workouts. From Fran to Murph, build work capacity and test yourself against the community standards.",
    category: "functional",
    difficulty: "advanced",
    durationWeeks: 4,
    daysPerWeek: 5,
    avgWorkoutDuration: 45,
    primaryGoal: "Improve work capacity",
    targetMuscles: ["full body"],
    equipmentRequired: ["barbell", "pull-up bar", "kettlebell", "box", "rower"],
    weeks: [
      {
        weekNumber: 1,
        name: "The Girls",
        focus: "Classic benchmark workouts",
        workouts: [
          { dayNumber: 1, name: "Fran", focus: "Thrusters + Pull-ups", workoutPlanId: WORKOUT_IDS.fran, estimatedDuration: 20 },
          { dayNumber: 2, name: "Grace", focus: "Clean & Jerks", workoutPlanId: WORKOUT_IDS.grace, estimatedDuration: 15 },
          { dayNumber: 3, name: "Helen", focus: "Run, Swings, Pull-ups", workoutPlanId: WORKOUT_IDS.helen, estimatedDuration: 25 },
          { dayNumber: 4, name: "Isabel", focus: "Snatches for time", workoutPlanId: WORKOUT_IDS.isabel, estimatedDuration: 15 },
          { dayNumber: 5, name: "Cindy", focus: "20min AMRAP", workoutPlanId: WORKOUT_IDS.cindy, estimatedDuration: 20 },
        ],
      },
      {
        weekNumber: 2,
        name: "Hero WODs",
        focus: "Honor workout series",
        workouts: [
          { dayNumber: 1, name: "Murph", focus: "The classic hero WOD", workoutPlanId: WORKOUT_IDS.murph, estimatedDuration: 60 },
          { dayNumber: 2, name: "DT", focus: "Deadlift, Hang Clean, Push Jerk", workoutPlanId: WORKOUT_IDS.dt, estimatedDuration: 20 },
          { dayNumber: 3, name: "Recovery", focus: "Active recovery", workoutPlanId: WORKOUT_IDS.long_slow, estimatedDuration: 30 },
          { dayNumber: 4, name: "Fight Gone Bad", focus: "3 rounds, 5 stations", workoutPlanId: WORKOUT_IDS.fight_gone_bad, estimatedDuration: 25 },
          { dayNumber: 5, name: "Filthy Fifty", focus: "50 reps of 10 movements", workoutPlanId: WORKOUT_IDS.filthy_fifty, estimatedDuration: 45 },
        ],
      },
      {
        weekNumber: 3,
        name: "Conditioning",
        focus: "Build work capacity",
        workouts: [
          { dayNumber: 1, name: "Chipper", focus: "Long format work", workoutPlanId: WORKOUT_IDS.chipper, estimatedDuration: 40 },
          { dayNumber: 2, name: "EMOM 20", focus: "Every minute on the minute", workoutPlanId: WORKOUT_IDS.emom_20, estimatedDuration: 20 },
          { dayNumber: 3, name: "12-Min AMRAP", focus: "Max rounds", workoutPlanId: WORKOUT_IDS.amrap_12, estimatedDuration: 15 },
          { dayNumber: 4, name: "Tabata Mix", focus: "20s on, 10s off", workoutPlanId: WORKOUT_IDS.tabata, estimatedDuration: 25 },
          { dayNumber: 5, name: "Death by Burpees", focus: "EMOM burpee ladder", workoutPlanId: WORKOUT_IDS.death_burpees, estimatedDuration: 20 },
        ],
      },
      {
        weekNumber: 4,
        name: "Test Week",
        focus: "Retest benchmarks",
        workouts: [
          { dayNumber: 1, name: "Fran Retest", focus: "Beat your time", workoutPlanId: WORKOUT_IDS.fran, estimatedDuration: 20 },
          { dayNumber: 2, name: "Grace Retest", focus: "Beat your time", workoutPlanId: WORKOUT_IDS.grace, estimatedDuration: 15 },
          { dayNumber: 3, name: "Helen Retest", focus: "Beat your time", workoutPlanId: WORKOUT_IDS.helen, estimatedDuration: 25 },
          { dayNumber: 4, name: "Cindy Retest", focus: "Beat your score", workoutPlanId: WORKOUT_IDS.cindy, estimatedDuration: 20 },
          { dayNumber: 5, name: "Murph Retest", focus: "Beat your time", workoutPlanId: WORKOUT_IDS.murph, estimatedDuration: 60 },
        ],
      },
    ],
  },
  
  // 8. Couch to 5K
  {
    name: "Couch to 5K",
    description: "The proven running program for absolute beginners. Go from zero to running 5K (3.1 miles) in 9 weeks with gradual, sustainable progression.",
    category: "cardio",
    difficulty: "beginner",
    durationWeeks: 9,
    daysPerWeek: 3,
    avgWorkoutDuration: 30,
    primaryGoal: "Run 5K without stopping",
    targetMuscles: ["legs", "cardiovascular"],
    equipmentRequired: ["running shoes"],
    weeks: [
      { weekNumber: 1, name: "Week 1", focus: "Walk/run intervals", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "60s run, 90s walk x8", estimatedDuration: 25, notes: "Run at conversational pace" },
        { dayNumber: 3, name: "Day 2", focus: "60s run, 90s walk x8", estimatedDuration: 25 },
        { dayNumber: 5, name: "Day 3", focus: "60s run, 90s walk x8", estimatedDuration: 25 },
      ]},
      { weekNumber: 2, name: "Week 2", focus: "Longer run intervals", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "90s run, 2min walk x6", estimatedDuration: 25 },
        { dayNumber: 3, name: "Day 2", focus: "90s run, 2min walk x6", estimatedDuration: 25 },
        { dayNumber: 5, name: "Day 3", focus: "90s run, 2min walk x6", estimatedDuration: 25 },
      ]},
      { weekNumber: 3, name: "Week 3", focus: "Mixed intervals", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "90s, 3min, 90s, 3min run", estimatedDuration: 28 },
        { dayNumber: 3, name: "Day 2", focus: "90s, 3min, 90s, 3min run", estimatedDuration: 28 },
        { dayNumber: 5, name: "Day 3", focus: "90s, 3min, 90s, 3min run", estimatedDuration: 28 },
      ]},
      { weekNumber: 4, name: "Week 4", focus: "Longer runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "3, 5, 3, 5 min runs", estimatedDuration: 30 },
        { dayNumber: 3, name: "Day 2", focus: "3, 5, 3, 5 min runs", estimatedDuration: 30 },
        { dayNumber: 5, name: "Day 3", focus: "3, 5, 3, 5 min runs", estimatedDuration: 30 },
      ]},
      { weekNumber: 5, name: "Week 5", focus: "Building endurance", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "5, 3, 5, 3, 5 min runs", workoutPlanId: WORKOUT_IDS.fartlek, estimatedDuration: 30 },
        { dayNumber: 3, name: "Day 2", focus: "8 min, 8 min runs", estimatedDuration: 30 },
        { dayNumber: 5, name: "Day 3", focus: "20 min continuous run", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 30, notes: "Big milestone!" },
      ]},
      { weekNumber: 6, name: "Week 6", focus: "Extending runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "5, 8, 5 min runs", estimatedDuration: 30 },
        { dayNumber: 3, name: "Day 2", focus: "10 min, 10 min runs", estimatedDuration: 30 },
        { dayNumber: 5, name: "Day 3", focus: "25 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 35 },
      ]},
      { weekNumber: 7, name: "Week 7", focus: "25 minute runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "25 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 35 },
        { dayNumber: 3, name: "Day 2", focus: "25 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 35 },
        { dayNumber: 5, name: "Day 3", focus: "25 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 35 },
      ]},
      { weekNumber: 8, name: "Week 8", focus: "28 minute runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "28 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 38 },
        { dayNumber: 3, name: "Day 2", focus: "28 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 38 },
        { dayNumber: 5, name: "Day 3", focus: "28 min continuous", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 38 },
      ]},
      { weekNumber: 9, name: "Week 9 - Race Week!", focus: "30 min / 5K", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "30 min or 5K", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 40, notes: "You can do this!" },
        { dayNumber: 3, name: "Day 2", focus: "30 min or 5K", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 40 },
        { dayNumber: 5, name: "Race Day!", focus: "Run your 5K!", workoutPlanId: WORKOUT_IDS.tempo_run, estimatedDuration: 40, notes: "Congratulations!" },
      ]},
    ],
  },
  
  // 9. Deadlift Specialization
  {
    name: "Deadlift Specialization",
    description: "A 6-week program focused on building your deadlift. Includes technique work, volume blocks, and heavy singles to push your max.",
    category: "powerlifting",
    difficulty: "advanced",
    durationWeeks: 6,
    daysPerWeek: 4,
    avgWorkoutDuration: 60,
    primaryGoal: "Maximize deadlift",
    targetMuscles: ["back", "legs", "grip"],
    equipmentRequired: ["barbell", "squat rack"],
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Volume phase" : i < 4 ? "Intensity phase" : "Peaking",
      workouts: [
        { dayNumber: 1, name: "Heavy Deadlift", focus: "Competition deadlift", workoutPlanId: WORKOUT_IDS.deadlift_special, estimatedDuration: 75 },
        { dayNumber: 2, name: "Back Accessory", focus: "Pull-ups, rows, shrugs", workoutPlanId: WORKOUT_IDS.back_builder, estimatedDuration: 60 },
        { dayNumber: 4, name: "Squat Day", focus: "Maintain squat strength", workoutPlanId: WORKOUT_IDS["531_squat"], estimatedDuration: 60 },
        { dayNumber: 5, name: "Deadlift Variations", focus: "Deficit, pause, Romanian", workoutPlanId: WORKOUT_IDS.deadlift_special, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 10. Cardio Conditioning
  {
    name: "Cardio Conditioning",
    description: "A varied cardio program mixing running, rowing, and cycling. Build aerobic capacity and improve conditioning with different modalities.",
    category: "cardio",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 4,
    avgWorkoutDuration: 40,
    primaryGoal: "Improve cardiovascular fitness",
    targetMuscles: ["cardiovascular", "legs"],
    equipmentRequired: ["treadmill", "rower", "assault bike"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i % 2 === 0 ? "Endurance" : "Intervals",
      workouts: [
        { dayNumber: 1, name: "Run Day", focus: "Tempo or intervals", workoutPlanId: i % 2 === 0 ? WORKOUT_IDS.tempo_run : WORKOUT_IDS.sprint_intervals, estimatedDuration: 35 },
        { dayNumber: 2, name: "Row Day", focus: "Rowing workout", workoutPlanId: i % 2 === 0 ? WORKOUT_IDS.rowing_intervals : WORKOUT_IDS.row_ladder, estimatedDuration: 30 },
        { dayNumber: 4, name: "Bike Day", focus: "Cycling workout", workoutPlanId: i % 2 === 0 ? WORKOUT_IDS.bike_pyramid : WORKOUT_IDS.assault_bike, estimatedDuration: 35 },
        { dayNumber: 6, name: "Mixed Conditioning", focus: "Various modalities", workoutPlanId: WORKOUT_IDS.jump_rope, estimatedDuration: 30 },
      ],
    })),
  },
  
  // 11. Full Body Strength (3 days)
  {
    name: "Full Body Strength",
    description: "A beginner-friendly 3-day program hitting the whole body each session. Perfect for those with limited gym time who want full-body development.",
    category: "strength",
    difficulty: "beginner",
    durationWeeks: 8,
    daysPerWeek: 3,
    avgWorkoutDuration: 50,
    primaryGoal: "Build overall strength",
    targetMuscles: ["full body"],
    equipmentRequired: ["barbell", "dumbbells", "squat rack"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Full body development",
      workouts: [
        { dayNumber: 1, name: "Full Body A", focus: "Squat emphasis", workoutPlanId: WORKOUT_IDS.full_body_pump, estimatedDuration: 50 },
        { dayNumber: 3, name: "Full Body B", focus: "Deadlift emphasis", workoutPlanId: WORKOUT_IDS.full_body_pump, estimatedDuration: 50 },
        { dayNumber: 5, name: "Full Body C", focus: "Bench emphasis", workoutPlanId: WORKOUT_IDS.full_body_pump, estimatedDuration: 50 },
      ],
    })),
  },
  
  // 12. Arm Specialization
  {
    name: "Arm Specialization",
    description: "A 4-week arm-focused program for those wanting bigger biceps and triceps. High frequency arm training while maintaining other muscle groups.",
    category: "hypertrophy",
    difficulty: "intermediate",
    durationWeeks: 4,
    daysPerWeek: 5,
    avgWorkoutDuration: 50,
    primaryGoal: "Build arm size",
    targetMuscles: ["biceps", "triceps", "forearms"],
    equipmentRequired: ["dumbbells", "cable machine", "barbell"],
    weeks: Array.from({ length: 4 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Arm hypertrophy",
      workouts: [
        { dayNumber: 1, name: "Arms A", focus: "Heavy compounds", workoutPlanId: WORKOUT_IDS.arm_blaster, estimatedDuration: 45 },
        { dayNumber: 2, name: "Chest & Triceps", focus: "Push day", workoutPlanId: WORKOUT_IDS.push, estimatedDuration: 60 },
        { dayNumber: 3, name: "Back & Biceps", focus: "Pull day", workoutPlanId: WORKOUT_IDS.pull, estimatedDuration: 60 },
        { dayNumber: 4, name: "Arms B", focus: "Isolation focus", workoutPlanId: WORKOUT_IDS.arm_blaster, estimatedDuration: 45 },
        { dayNumber: 6, name: "Legs & Arms", focus: "Legs + arm finisher", workoutPlanId: WORKOUT_IDS.legs_ppl, estimatedDuration: 60 },
      ],
    })),
  },
];

async function seedPrograms() {
  console.log("Starting program seeding...\n");

  for (const programDef of PROGRAMS) {
    try {
      console.log(`Creating program: ${programDef.name}`);

      // Check if program already exists
      const existing = await db.query.communityPrograms.findFirst({
        where: eq(communityPrograms.name, programDef.name),
      });

      if (existing) {
        console.log(`  ⚠️ Program "${programDef.name}" already exists, skipping...\n`);
        continue;
      }

      // Create program
      const [program] = await db
        .insert(communityPrograms)
        .values({
          name: programDef.name,
          description: programDef.description,
          category: programDef.category,
          difficulty: programDef.difficulty,
          durationWeeks: programDef.durationWeeks,
          daysPerWeek: programDef.daysPerWeek,
          avgWorkoutDuration: programDef.avgWorkoutDuration,
          primaryGoal: programDef.primaryGoal,
          targetMuscles: programDef.targetMuscles,
          equipmentRequired: programDef.equipmentRequired,
          isOfficial: true,
          isFeatured: true,
          visibility: "public",
          enrollmentCount: Math.floor(Math.random() * 1000) + 100,
          completionCount: Math.floor(Math.random() * 200) + 20,
          avgRating: 4 + Math.random() * 1, // 4.0 - 5.0
        })
        .returning();

      console.log(`  ✓ Created program: ${program.id}`);

      // Create weeks and workouts
      for (const weekDef of programDef.weeks) {
        // Create week
        const [week] = await db
          .insert(programWeeks)
          .values({
            programId: program.id,
            weekNumber: weekDef.weekNumber,
            name: weekDef.name,
            focus: weekDef.focus,
            notes: weekDef.notes,
          })
          .returning();

        console.log(`    Week ${weekDef.weekNumber}: ${weekDef.focus}`);

        // Create workouts for this week
        for (const workoutDef of weekDef.workouts) {
          await db.insert(programWorkouts).values({
            programId: program.id,
            weekId: week.id,
            weekNumber: weekDef.weekNumber,
            dayNumber: workoutDef.dayNumber,
            name: workoutDef.name,
            focus: workoutDef.focus,
            estimatedDuration: workoutDef.estimatedDuration,
            workoutPlanId: workoutDef.workoutPlanId || null,
            notes: workoutDef.notes,
          });
        }
      }

      console.log(`  ✓ Created ${programDef.weeks.length} weeks with workouts\n`);
    } catch (error) {
      console.error(`  ✗ Error creating program "${programDef.name}":`, error);
    }
  }

  console.log("\nProgram seeding complete!");
}

// Run the seed
seedPrograms()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
