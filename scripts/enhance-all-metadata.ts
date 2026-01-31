/**
 * Enhance All Metadata - Fill in missing data across all tables
 * 
 * Fixes:
 * - workout_plans: warmup_notes, cooldown_notes, intensity_level
 * - community_programs: target_muscles
 * - challenges: rules, daily_tasks
 * - badge_definitions: unlock_message
 * 
 * Run with: npx tsx scripts/enhance-all-metadata.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { workoutPlans, communityPrograms, challenges, badgeDefinitions } from "../src/lib/db/schema";
import { eq, sql, isNull, or } from "drizzle-orm";

// =============================================================================
// WORKOUT PLAN ENHANCEMENTS
// =============================================================================

interface WorkoutPlanEnhancement {
  warmupNotes: string;
  cooldownNotes: string;
  intensityLevel: number; // 1-10
  scalingNotes?: Record<string, string>;
}

const WORKOUT_PLAN_METADATA: Record<string, WorkoutPlanEnhancement> = {
  // STRENGTH PROGRAMS
  "5/3/1 - Squat Day": {
    warmupNotes: "5 min light cardio. Dynamic stretches: leg swings, hip circles, walking lunges. Warm-up sets: empty bar x10, 40% x5, 50% x5, 60% x3",
    cooldownNotes: "Static stretching: quad stretch, hamstring stretch, hip flexor stretch, pigeon pose. Hold each 30-60 seconds. Foam roll quads, IT band, glutes.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Start with 70% TM. Focus on form over weight.", advanced: "Add joker sets at 90-95% after main work." }
  },
  "5/3/1 - Bench Day": {
    warmupNotes: "5 min rowing or arm circles. Band pull-aparts x20. Push-ups x10. Warm-up sets: empty bar x10, 40% x5, 50% x5, 60% x3",
    cooldownNotes: "Doorway pec stretch, cross-body shoulder stretch, tricep stretch. Foam roll thoracic spine and lats.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Use 60% for BBB instead of 65%", advanced: "FSL AMRAP on last set" }
  },
  "5/3/1 - Deadlift Day": {
    warmupNotes: "5 min bike or rowing. Cat-cow stretches x10. Bird-dogs x10 each side. Warm-up sets: 40% x5, 50% x5, 60% x3",
    cooldownNotes: "Child's pose, seated forward fold, standing hamstring stretch, figure-4 stretch. Foam roll hamstrings and lower back.",
    intensityLevel: 9,
    scalingNotes: { beginner: "Reduce BBB to 40-50%", advanced: "Add deficit deadlifts or pause deadlifts" }
  },
  "5/3/1 - OHP Day": {
    warmupNotes: "Band pull-aparts x20, band dislocates x10, arm circles. Light dumbbell lateral raises x10. Warm-up sets: empty bar x10, 40% x5, 50% x5, 60% x3",
    cooldownNotes: "Shoulder stretches: sleeper stretch, cross-body stretch, wall slides. Foam roll lats and thoracic spine.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Seated OHP if mobility is limited", advanced: "Push press for supplemental work" }
  },
  "StrongLifts 5x5 - Workout A": {
    warmupNotes: "5 min light cardio. Bodyweight squats x20, arm circles, hip circles. Start with empty bar for 2 sets of 5 on each exercise.",
    cooldownNotes: "Full body stretch routine: quads, hamstrings, hip flexors, chest, shoulders. 5-10 min walking cool down.",
    intensityLevel: 6,
    scalingNotes: { beginner: "Take longer rest periods (3-5 min)", advanced: "Add accessory work as needed" }
  },
  "StrongLifts 5x5 - Workout B": {
    warmupNotes: "5 min light cardio. Bodyweight squats x20, shoulder dislocates with band. Start with empty bar for warm-up sets.",
    cooldownNotes: "Static stretching for all major muscle groups. Focus on hip flexors and shoulders. Light walking for 5 min.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Start deadlifts very light, focus on form", advanced: "Can add power cleans after mastering basics" }
  },
  "Texas Method - Volume Day": {
    warmupNotes: "10 min general warm-up. Specific warm-up: 2-3 sets increasing weight. Mobility work for hips and shoulders.",
    cooldownNotes: "Extensive stretching required due to high volume. Ice any problem areas. Prioritize sleep and nutrition for recovery.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Start with 80% of 5RM for volume", advanced: "Add paused reps for weak points" }
  },
  "Texas Method - Intensity Day": {
    warmupNotes: "Thorough warm-up: 15 min minimum. Multiple warm-up sets working up to working weight. CNS priming with lighter explosive reps.",
    cooldownNotes: "Light stretching. Avoid heavy foam rolling. Focus on recovery nutrition immediately post-workout.",
    intensityLevel: 10,
    scalingNotes: { beginner: "Work up to 5RM with singles before attempting PR", advanced: "Add backoff sets at 85%" }
  },
  
  // HYPERTROPHY PROGRAMS
  "Push Day": {
    warmupNotes: "5 min cardio, band pull-aparts x15, push-ups x15, shoulder circles. Light dumbbell press x12.",
    cooldownNotes: "Pec stretch in doorway, tricep stretch, shoulder stretch. Foam roll chest and lats.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Use machines for isolation work", advanced: "Add drop sets on final exercises" }
  },
  "Pull Day": {
    warmupNotes: "5 min rowing, band pull-aparts x20, dead hangs 30 sec, light lat pulldown x15.",
    cooldownNotes: "Lat stretch, bicep stretch, forearm stretch. Foam roll lats and upper back.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Use assisted pull-ups or lat pulldown", advanced: "Weighted pull-ups, add intensity techniques" }
  },
  "Legs Day (PPL)": {
    warmupNotes: "5-10 min bike or walking. Leg swings, hip circles, bodyweight squats x20, walking lunges x10 each leg.",
    cooldownNotes: "Extensive leg stretching: quads, hamstrings, hip flexors, adductors, calves. Foam roll all leg muscles.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Goblet squats instead of barbell", advanced: "Add drop sets on leg press" }
  },
  "Upper Body Hypertrophy": {
    warmupNotes: "5 min cardio, arm circles, band work for shoulders. Light push-ups and rows.",
    cooldownNotes: "Full upper body stretch. Focus on chest, lats, and shoulders. Foam roll upper back.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Use machines when needed", advanced: "Superset opposing muscle groups" }
  },
  "Lower Body Hypertrophy": {
    warmupNotes: "10 min bike or elliptical. Dynamic leg stretches, bodyweight squats, leg swings.",
    cooldownNotes: "Full lower body stretch. Hold each position 45-60 seconds. Foam roll quads, hamstrings, IT band.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Reduce weight, focus on mind-muscle connection", advanced: "Add blood flow restriction training" }
  },
  "Arnold Chest & Back": {
    warmupNotes: "5 min rowing. Arm circles, push-ups x15, band pull-aparts x20. Work up on bench press.",
    cooldownNotes: "Doorway chest stretch, lat stretch on rack, thoracic spine foam rolling. Cross-body shoulder stretch.",
    intensityLevel: 9,
    scalingNotes: { beginner: "Reduce to 3-4 sets per exercise", advanced: "Add giant sets" }
  },
  "German Volume Training - Chest": {
    warmupNotes: "Thorough warm-up essential. 5 min cardio, rotator cuff work, 3 warm-up sets building to 60% 1RM.",
    cooldownNotes: "Extended stretching due to high volume. Pec stretches, shoulder work. Foam roll extensively.",
    intensityLevel: 9,
    scalingNotes: { beginner: "Start with 8x10 instead of 10x10", advanced: "Reduce rest to 45 seconds" }
  },
  
  // BRO SPLIT
  "Bro Split - Chest Monday": {
    warmupNotes: "5-10 min cardio. Rotator cuff exercises, band pull-aparts. Light dumbbell press x15, push-ups x15.",
    cooldownNotes: "Doorway pec stretch, foam roll chest and shoulders. Shoulder circles.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Use dumbbells for better control", advanced: "Pre-exhaust with flyes" }
  },
  "Back Width & Thickness": {
    warmupNotes: "5 min rowing, dead hangs 2x30 sec, band pull-aparts x20, light lat pulldown x15.",
    cooldownNotes: "Lat stretch on rack, child's pose, thoracic extension on foam roller.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Focus on lat pulldown and cables", advanced: "Weighted pull-ups, heavy rows" }
  },
  "Shoulder Boulder Builder": {
    warmupNotes: "Band work: pull-aparts, dislocates, face pulls. Light lateral raises x15, arm circles.",
    cooldownNotes: "Shoulder stretches in all directions. Foam roll upper back. Ice if any discomfort.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Lighter weights, focus on form", advanced: "Add mechanical drop sets" }
  },
  "Classic Arm Blaster": {
    warmupNotes: "5 min cardio, arm circles. Light curls x15, light pushdowns x15. Get blood flowing.",
    cooldownNotes: "Bicep stretch against wall, tricep stretch, forearm stretches.",
    intensityLevel: 6,
    scalingNotes: { beginner: "Focus on cables for constant tension", advanced: "Supersets throughout" }
  },
  "Leg Day Destroyer": {
    warmupNotes: "10 min bike or walking. Extensive hip mobility work. Bodyweight squats x20, walking lunges x10 each.",
    cooldownNotes: "Full lower body stretch protocol. Foam roll quads, hamstrings, IT band, calves. Cold shower or ice if available.",
    intensityLevel: 10,
    scalingNotes: { beginner: "Reduce sets and exercises", advanced: "Add rest-pause on compounds" }
  },
  
  // SPECIALIZATION
  "Chest Specialization": {
    warmupNotes: "Extended chest warm-up. Band work, light flyes, push-ups. Work up slowly on bench.",
    cooldownNotes: "Thorough pec stretching. Doorway stretch, floor stretch. Foam roll chest.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Focus on incline work", advanced: "Pre-exhaust with cables" }
  },
  "Deadlift Specialization": {
    warmupNotes: "10 min bike. Cat-cow, hip hinge practice with PVC pipe. Multiple warm-up sets.",
    cooldownNotes: "Hamstring and lower back stretching essential. Child's pose, pigeon pose.",
    intensityLevel: 10,
    scalingNotes: { beginner: "Focus on form, use trap bar if needed", advanced: "Add deficit and pause variations" }
  },
  "FST-7 Shoulders": {
    warmupNotes: "Thorough shoulder warm-up with bands. Rotator cuff exercises. Light laterals x15.",
    cooldownNotes: "Extended shoulder stretching. Focus on recovery as volume is high.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Use 5x7 instead of 7x7 for FST sets", advanced: "Minimal rest on FST sets" }
  },
  "Heavy Singles Day": {
    warmupNotes: "Extended warm-up: 15-20 min. Multiple sets building up. CNS activation drills.",
    cooldownNotes: "Light movement, mobility work. Focus on recovery nutrition immediately.",
    intensityLevel: 10,
    scalingNotes: { beginner: "Work up to heavy triples instead", advanced: "Multiple singles at 90%+" }
  },
  "Full Body Pump": {
    warmupNotes: "5 min light cardio. Dynamic stretching for full body. Light movement patterns.",
    cooldownNotes: "Full body stretch. This is a recovery workout, prioritize mobility.",
    intensityLevel: 5,
    scalingNotes: { beginner: "Reduce weight, focus on movement quality", advanced: "Add complexes" }
  },
  
  // CROSSFIT/HIIT
  "Cindy": {
    warmupNotes: "2 rounds of: 200m run, 10 air squats, 10 push-ups, 5 pull-ups (assisted if needed).",
    cooldownNotes: "400m walk, full body stretch. Focus on shoulders and hip flexors.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Jumping pull-ups, knee push-ups", advanced: "Add weight vest" }
  },
  "Murph": {
    warmupNotes: "800m easy jog. Dynamic stretching. 2 rounds: 5 pull-ups, 10 push-ups, 15 squats.",
    cooldownNotes: "Walk until heart rate drops. Full body stretch for 10+ minutes. Rehydrate immediately.",
    intensityLevel: 10,
    scalingNotes: { beginner: "Half Murph: 800m, 50-100-150, 800m", advanced: "20 lb weight vest" }
  },
  "Fran": {
    warmupNotes: "500m row, then 3 rounds: 5 thrusters (empty bar), 5 pull-ups (kipping practice).",
    cooldownNotes: "Walk 400m, stretch shoulders and hip flexors. This is a lung burner.",
    intensityLevel: 9,
    scalingNotes: { beginner: "65/45 lb, jumping pull-ups", advanced: "95/65 lb, butterfly pull-ups" }
  },
  "Helen": {
    warmupNotes: "400m easy jog, 10 KB swings light, 5 pull-ups. Dynamic leg stretches.",
    cooldownNotes: "Walk 400m, stretch hamstrings and shoulders.",
    intensityLevel: 7,
    scalingNotes: { beginner: "35/26 lb KB, ring rows", advanced: "70/53 lb KB" }
  },
  "Grace": {
    warmupNotes: "Burgener warm-up with PVC. Build up: 5-3-2-1 at increasing weights.",
    cooldownNotes: "Walk until heart rate normalizes. Shoulder mobility work.",
    intensityLevel: 9,
    scalingNotes: { beginner: "95/65 lb, power clean + push press OK", advanced: "155/105 lb, full clean & jerk" }
  },
  "Fight Gone Bad": {
    warmupNotes: "400m jog, then practice each movement for 20 sec at light weight.",
    cooldownNotes: "Walk 400m, full body stretch. This workout taxes everything.",
    intensityLevel: 9,
    scalingNotes: { beginner: "55/35 lb, 16\" box", advanced: "75/55 lb, 24\" box" }
  },
  "Filthy Fifty": {
    warmupNotes: "800m jog, dynamic stretching, practice each movement briefly.",
    cooldownNotes: "Long walk until recovered. Extensive stretching. This is a marathon workout.",
    intensityLevel: 10,
    scalingNotes: { beginner: "Dirty Thirty (30 reps each)", advanced: "RX+ heavier weights" }
  },
  "The Chipper": {
    warmupNotes: "500m row easy, then practice each movement with light weight.",
    cooldownNotes: "Walk until heart rate drops. Full body stretch.",
    intensityLevel: 9,
    scalingNotes: { beginner: "Reduce weights and reps by 50%", advanced: "Add weight to KB swings" }
  },
  "DT": {
    warmupNotes: "Burgener warm-up with barbell. Build up to workout weight over 4-5 sets.",
    cooldownNotes: "Walk, stretch lower back and shoulders. Hero WOD - give it respect.",
    intensityLevel: 9,
    scalingNotes: { beginner: "115/75 lb", advanced: "185/125 lb" }
  },
  "12-Minute AMRAP": {
    warmupNotes: "3 rounds: 5 pull-ups, 10 push-ups, 10 air squats at easy pace.",
    cooldownNotes: "Walk 400m, stretch hip flexors and shoulders.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Ring rows, knee push-ups", advanced: "Strict pull-ups, add weight vest" }
  },
  "EMOM 20": {
    warmupNotes: "Build up to working weight over 5-6 sets. This is skill work + conditioning.",
    cooldownNotes: "Light movement, stretching. Focus on lower back.",
    intensityLevel: 7,
    scalingNotes: { beginner: "60% of 1RM", advanced: "75% of 1RM, add reps" }
  },
  "Tabata Something Else": {
    warmupNotes: "Practice each movement for 30 sec. Get heart rate up with 200m jog.",
    cooldownNotes: "Walk until recovered. Full body stretch.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Assisted pull-ups, knee push-ups", advanced: "Weighted movements" }
  },
  "Death by Burpees": {
    warmupNotes: "Practice burpees with good form. 2 rounds of 5 burpees.",
    cooldownNotes: "Walk extensively. This accumulates fast.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Step-up burpees, no push-up", advanced: "Burpee over bar, lateral burpees" }
  },
  
  // CARDIO
  "Tempo Run": {
    warmupNotes: "10 min easy jog. Dynamic leg stretches. 4x100m strides at increasing pace.",
    cooldownNotes: "10 min easy jog. Static stretching for hamstrings, quads, calves, hip flexors.",
    intensityLevel: 6,
    scalingNotes: { beginner: "Start with 15 min tempo", advanced: "Extend tempo portion" }
  },
  "Sprint Intervals": {
    warmupNotes: "10 min easy jog. A-skips, B-skips, butt kicks. 4-6 acceleration runs building to sprint pace.",
    cooldownNotes: "10 min easy jog. Extensive leg stretching.",
    intensityLevel: 9,
    scalingNotes: { beginner: "80% effort sprints", advanced: "Incline sprints" }
  },
  "Hill Sprint Session": {
    warmupNotes: "10 min easy jog on flat. Dynamic stretches. 2-3 half-effort hill runs.",
    cooldownNotes: "Walk down hill for recovery. 10 min flat jog. Stretch calves and hamstrings.",
    intensityLevel: 9,
    scalingNotes: { beginner: "Shorter hill, walk down recovery", advanced: "Steeper hill, jog down recovery" }
  },
  "Fartlek Run": {
    warmupNotes: "5 min easy jog. Dynamic stretches.",
    cooldownNotes: "5 min easy jog. Light stretching.",
    intensityLevel: 6,
    scalingNotes: { beginner: "More recovery between fast segments", advanced: "Longer fast segments" }
  },
  "Long Slow Distance": {
    warmupNotes: "Start very easy, first mile is warm-up. Dynamic leg swings if stopping.",
    cooldownNotes: "Walk 5 min. Extensive stretching. Foam roll.",
    intensityLevel: 4,
    scalingNotes: { beginner: "Walk breaks as needed", advanced: "Add hills or time" }
  },
  "Rowing Intervals": {
    warmupNotes: "5 min easy rowing. 2-3 short builds to working pace.",
    cooldownNotes: "5 min easy rowing. Full body stretch, focus on back and hamstrings.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Longer rest between intervals", advanced: "Shorter rest, faster pace" }
  },
  "Row Ladder": {
    warmupNotes: "5 min easy rowing. Practice race-pace starts.",
    cooldownNotes: "5 min easy rowing. Stretch back, hamstrings, hip flexors.",
    intensityLevel: 8,
    scalingNotes: { beginner: "Reduce distances by 50%", advanced: "Add weight vest" }
  },
  "Assault Bike Intervals": {
    warmupNotes: "5 min easy biking. 2-3 short builds to all-out effort.",
    cooldownNotes: "5 min easy biking. Stretch hip flexors and quads.",
    intensityLevel: 9,
    scalingNotes: { beginner: "15 cal intervals", advanced: "25 cal intervals" }
  },
  "Bike Pyramid": {
    warmupNotes: "5 min easy biking. Practice transitions between intensities.",
    cooldownNotes: "5 min easy biking. Stretch legs and hip flexors.",
    intensityLevel: 7,
    scalingNotes: { beginner: "Reduce high intensity time", advanced: "Add sprints at peak" }
  },
  "Jump Rope Conditioning": {
    warmupNotes: "Light jump rope practice. Wrist circles, calf raises.",
    cooldownNotes: "Stretch calves extensively. Wrist stretches.",
    intensityLevel: 6,
    scalingNotes: { beginner: "Singles only", advanced: "Add double unders, crossovers" }
  },
  "Isabel": {
    warmupNotes: "Burgener warm-up. Build up: 5-3-2-1 at increasing weights.",
    cooldownNotes: "Walk 400m. Shoulder mobility work.",
    intensityLevel: 9,
    scalingNotes: { beginner: "95/65 lb, power snatch OK", advanced: "155/105 lb" }
  }
};

async function enhanceWorkoutPlans() {
  console.log("\n=== Enhancing Workout Plans ===");
  
  const allPlans = await db.query.workoutPlans.findMany();
  let updated = 0;
  
  for (const plan of allPlans) {
    const enhancement = WORKOUT_PLAN_METADATA[plan.name];
    
    if (!enhancement) {
      // Apply default values for plans without specific metadata
      await db.update(workoutPlans)
        .set({
          warmupNotes: plan.warmupNotes || "5-10 min light cardio. Dynamic stretching for target muscle groups. 2-3 light warm-up sets.",
          cooldownNotes: plan.cooldownNotes || "Static stretching for worked muscles. Foam rolling if available. Light walking for 5 min.",
          intensityLevel: plan.intensityLevel || 6,
        })
        .where(eq(workoutPlans.id, plan.id));
    } else {
      await db.update(workoutPlans)
        .set({
          warmupNotes: enhancement.warmupNotes,
          cooldownNotes: enhancement.cooldownNotes,
          intensityLevel: enhancement.intensityLevel,
          scalingNotes: enhancement.scalingNotes || null,
        })
        .where(eq(workoutPlans.id, plan.id));
    }
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} workout plans`);
}

// =============================================================================
// COMMUNITY PROGRAM ENHANCEMENTS
// =============================================================================

interface ProgramEnhancement {
  targetMuscles: string[];
}

const PROGRAM_MUSCLES: Record<string, ProgramEnhancement> = {
  "Push Pull Legs (PPL)": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs", "glutes", "core"] },
  "StrongLifts 5x5": { targetMuscles: ["legs", "chest", "back", "shoulders", "core"] },
  "Wendler 5/3/1": { targetMuscles: ["legs", "chest", "back", "shoulders", "core", "arms"] },
  "Texas Method": { targetMuscles: ["legs", "chest", "back", "shoulders", "core"] },
  "Starting Strength": { targetMuscles: ["legs", "chest", "back", "shoulders", "core"] },
  "Madcow 5x5": { targetMuscles: ["legs", "chest", "back", "shoulders", "core"] },
  "GZCLP": { targetMuscles: ["legs", "chest", "back", "shoulders", "arms", "core"] },
  "nSuns 5/3/1 LP": { targetMuscles: ["legs", "chest", "back", "shoulders", "arms", "core"] },
  "Upper Lower Split": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs", "glutes", "core"] },
  "German Volume Training (GVT)": { targetMuscles: ["chest", "back", "legs", "shoulders", "arms"] },
  "Arnold Blueprint to Mass": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs", "abs"] },
  "PHAT (Power Hypertrophy Adaptive Training)": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs", "core"] },
  "PHUL (Power Hypertrophy Upper Lower)": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs", "core"] },
  "Bro Split": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs"] },
  "FST-7 (Fascia Stretch Training)": { targetMuscles: ["chest", "back", "shoulders", "arms", "legs"] },
  "Smolov Jr": { targetMuscles: ["legs", "chest", "back"] },
  "Couch to 5K (C25K)": { targetMuscles: ["legs", "cardiovascular", "core"] },
  "10K Training Plan": { targetMuscles: ["legs", "cardiovascular", "core"] },
  "Half Marathon Training": { targetMuscles: ["legs", "cardiovascular", "core"] },
  "Sprint Speed Development": { targetMuscles: ["legs", "glutes", "core", "cardiovascular"] },
  "Vertical Jump Program": { targetMuscles: ["legs", "glutes", "core", "calves"] },
  "Athletic Performance": { targetMuscles: ["legs", "core", "shoulders", "back", "cardiovascular"] },
  "Muscle-Up Mastery": { targetMuscles: ["back", "chest", "shoulders", "arms", "core"] },
  "Handstand Journey": { targetMuscles: ["shoulders", "core", "arms", "back"] },
  "Mobility Overhaul": { targetMuscles: ["hips", "shoulders", "spine", "ankles"] },
};

async function enhancePrograms() {
  console.log("\n=== Enhancing Community Programs ===");
  
  const allPrograms = await db.query.communityPrograms.findMany();
  let updated = 0;
  
  for (const program of allPrograms) {
    const enhancement = PROGRAM_MUSCLES[program.name];
    const muscles = enhancement?.targetMuscles || ["full body"];
    
    await db.update(communityPrograms)
      .set({
        targetMuscles: muscles,
      })
      .where(eq(communityPrograms.id, program.id));
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} programs with target muscles`);
}

// =============================================================================
// CHALLENGE ENHANCEMENTS
// =============================================================================

/** Schema-compliant daily task: challenges.dailyTasks is jsonb with name, description?, type, isRequired */
type DailyTaskSchema = {
  name: string;
  description?: string;
  type: "workout" | "nutrition" | "mindset" | "recovery" | "custom";
  isRequired: boolean;
};

interface ChallengeEnhancement {
  rules: string[];
  dailyTasks: DailyTaskSchema[];
}

const CHALLENGE_DATA: Record<string, ChallengeEnhancement> = {
  "30-Day Push-Up Challenge": {
    rules: [
      "Complete all push-ups each day before midnight",
      "Proper form: full range of motion, chest to ground",
      "Can be done in sets throughout the day",
      "If you miss a day, you must restart from day 1",
      "Knee push-ups count for beginners"
    ],
    dailyTasks: [
      { name: "Push-ups", description: "15 reps", type: "workout", isRequired: true },
      { name: "Push-ups", description: "25 reps", type: "workout", isRequired: true },
      { name: "Push-ups", description: "40 reps", type: "workout", isRequired: true },
      { name: "Push-ups", description: "55 reps", type: "workout", isRequired: true },
      { name: "Push-ups", description: "70 reps", type: "workout", isRequired: true },
      { name: "Push-ups", description: "85 reps", type: "workout", isRequired: true },
      { name: "Push-ups", description: "100 reps", type: "workout", isRequired: true }
    ]
  },
  "100 Burpees a Day": {
    rules: [
      "Complete 100 burpees every day for 30 days",
      "Chest must touch the ground at bottom",
      "Full jump with arms overhead at top",
      "Can be broken into sets throughout the day",
      "Rest days are not allowed - consistency is key"
    ],
    dailyTasks: [
      { name: "Complete 100 burpees", description: "100 burpees before midnight", type: "workout", isRequired: true },
      { name: "Log your time", description: "Track total time to completion", type: "custom", isRequired: true },
      { name: "Rate difficulty 1-10", description: "Track perceived effort", type: "custom", isRequired: true }
    ]
  },
  "10K Steps Daily": {
    rules: [
      "Walk at least 10,000 steps every day",
      "Steps can be accumulated throughout the day",
      "Running/jogging steps count double",
      "Use a fitness tracker or phone for accuracy",
      "Outdoor steps preferred but treadmill counts"
    ],
    dailyTasks: [
      { name: "Morning walk", description: "3,000 steps before noon", type: "workout", isRequired: true },
      { name: "Lunch walk", description: "2,000 steps during lunch", type: "workout", isRequired: true },
      { name: "Evening walk", description: "5,000 steps in evening", type: "workout", isRequired: true }
    ]
  },
  "Couch to 5K": {
    rules: [
      "Follow the prescribed run/walk intervals",
      "Complete 3 workouts per week",
      "Rest at least one day between workouts",
      "Repeat a week if needed before progressing",
      "Finish all 9 weeks to complete the challenge"
    ],
    dailyTasks: [
      { name: "Week 1 workout", description: "60 sec run / 90 sec walk x8", type: "workout", isRequired: true },
      { name: "Week 1 workout", description: "60 sec run / 90 sec walk x8", type: "workout", isRequired: true },
      { name: "Week 1 workout", description: "60 sec run / 90 sec walk x8", type: "workout", isRequired: true }
    ]
  },
  "Pull-Up Progress": {
    rules: [
      "Train pull-ups 3-4 times per week",
      "Always use full range of motion",
      "Track your max reps weekly",
      "Use assisted pull-ups if needed",
      "Goal: Add 5+ reps to your max in 60 days"
    ],
    dailyTasks: [
      { name: "Greasing the groove", description: "5 sets throughout the day", type: "workout", isRequired: true },
      { name: "Max attempt", description: "Test max reps once per week", type: "workout", isRequired: true },
      { name: "Accessory work", description: "Lat pulldowns, rows, hangs", type: "workout", isRequired: true }
    ]
  },
  "Summer Shred": {
    rules: [
      "Follow the prescribed workout schedule",
      "Track nutrition - aim for caloric deficit",
      "Complete cardio sessions as prescribed",
      "Take progress photos weekly",
      "Rest days are for active recovery only"
    ],
    dailyTasks: [
      { name: "HIIT workout", description: "30-45 min high intensity", type: "workout", isRequired: true },
      { name: "Track nutrition", description: "Log all meals", type: "nutrition", isRequired: true },
      { name: "Stay hydrated", description: "1 gallon water minimum", type: "nutrition", isRequired: true }
    ]
  },
  "Flexibility Flow": {
    rules: [
      "Stretch for 15-20 minutes daily",
      "Hold each stretch for 30-60 seconds",
      "Never stretch cold - light warm-up first",
      "Focus on problem areas",
      "Take photos to track progress"
    ],
    dailyTasks: [
      { name: "Morning stretch routine", description: "10 min upon waking", type: "recovery", isRequired: true },
      { name: "Evening stretch routine", description: "15 min before bed", type: "recovery", isRequired: true },
      { name: "Foam rolling", description: "5 min on tight areas", type: "recovery", isRequired: true }
    ]
  },
  "HIIT Warrior": {
    rules: [
      "Complete prescribed HIIT workout daily",
      "Maximum effort during work periods",
      "Complete recovery during rest periods",
      "Track heart rate if possible",
      "Stay hydrated throughout"
    ],
    dailyTasks: [
      { name: "HIIT session", description: "20-30 min all-out effort", type: "workout", isRequired: true },
      { name: "Active recovery", description: "10 min walking/stretching", type: "recovery", isRequired: true },
      { name: "Nutrition", description: "High protein post-workout meal", type: "nutrition", isRequired: true }
    ]
  },
  "Morning Yoga": {
    rules: [
      "Practice yoga every morning for 30 days",
      "Minimum 15 minutes per session",
      "Can follow guided videos or self-practice",
      "Focus on breath-movement connection",
      "Journal any insights or progress"
    ],
    dailyTasks: [
      { name: "Morning flow", description: "15-30 min yoga practice", type: "workout", isRequired: true },
      { name: "Meditation", description: "5 min post-practice meditation", type: "mindset", isRequired: true },
      { name: "Journal", description: "Note any observations", type: "mindset", isRequired: true }
    ]
  },
  "Muscle Up Mission": {
    rules: [
      "Follow the structured progression plan",
      "Master each prerequisite before advancing",
      "Train 4 days per week minimum",
      "Video yourself weekly for form check",
      "Goal: First strict muscle-up in 90 days"
    ],
    dailyTasks: [
      { name: "Pull-up progression", description: "5x5 weighted or strict", type: "workout", isRequired: true },
      { name: "Dip progression", description: "5x5 weighted or strict", type: "workout", isRequired: true },
      { name: "Transition work", description: "Hip-to-bar drills", type: "workout", isRequired: true },
      { name: "Skill practice", description: "Banded muscle-up attempts", type: "workout", isRequired: true }
    ]
  }
};

async function enhanceChallenges() {
  console.log("\n=== Enhancing Challenges ===");
  
  const allChallenges = await db.query.challenges.findMany();
  let updated = 0;
  
  for (const challenge of allChallenges) {
    const enhancement = CHALLENGE_DATA[challenge.name];
    
    if (enhancement) {
      await db.update(challenges)
        .set({
          rules: enhancement.rules,
          dailyTasks: enhancement.dailyTasks,
        })
        .where(eq(challenges.id, challenge.id));
    } else {
      // Default rules for challenges without specific data
      const currentRules = challenge.rules as string[] | null;
      const currentTasks = challenge.dailyTasks as unknown[] | null;
      
      if (!currentRules || currentRules.length === 0) {
        await db.update(challenges)
          .set({
            rules: [
              `Complete the daily ${challenge.name} requirement`,
              "Track your progress in the app",
              "Consistency is key - don't skip days",
              "Proper form is more important than volume",
              "Share your progress with your circle"
            ],
          })
          .where(eq(challenges.id, challenge.id));
      }
      
      if (!currentTasks || currentTasks.length === 0) {
        const defaultDailyTasks: DailyTaskSchema[] = [
          { name: "Complete daily workout", description: "As prescribed", type: "workout", isRequired: true },
          { name: "Log progress", description: "Track in app", type: "custom", isRequired: true },
          { name: "Stay hydrated", description: "8+ glasses of water", type: "nutrition", isRequired: true }
        ];
        await db.update(challenges)
          .set({ dailyTasks: defaultDailyTasks })
          .where(eq(challenges.id, challenge.id));
      }
    }
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} challenges with rules and tasks`);
}

// =============================================================================
// BADGE DEFINITION ENHANCEMENTS
// =============================================================================

const BADGE_UNLOCK_MESSAGES: Record<string, string> = {
  // Workout badges
  "First Workout": "You've taken your first step! Every journey begins with a single rep.",
  "Week Warrior": "7 days strong! You're building momentum.",
  "Consistency King": "A month of dedication! Your discipline is inspiring.",
  "Century Club": "100 workouts! You're officially a gym veteran.",
  "Iron Will": "365 days of training - you're unstoppable!",
  
  // Strength badges
  "Bench Press Beginner": "You pressed your first plate! Keep pushing.",
  "Bench Press Intermediate": "185 lbs! You're getting serious.",
  "Bench Press Advanced": "225 lbs - two plates! Welcome to the club.",
  "Bench Press Elite": "315 lbs! You're in rare company.",
  "Bench Press Legend": "405 lbs! You're a bench press legend!",
  
  "Squat Beginner": "Your squat journey begins! Stay low, grow strong.",
  "Squat Intermediate": "225 lbs! Your legs are getting powerful.",
  "Squat Advanced": "315 lbs! Three plates - impressive!",
  "Squat Elite": "405 lbs! Elite squat strength unlocked.",
  "Squat Legend": "495+ lbs! Legendary lower body power!",
  
  "Deadlift Beginner": "You've lifted your first heavy weight! The journey begins.",
  "Deadlift Intermediate": "315 lbs! Solid pulling strength.",
  "Deadlift Advanced": "405 lbs! Four plates off the floor!",
  "Deadlift Elite": "495 lbs! Almost 500 - incredible!",
  "Deadlift Legend": "585+ lbs! You're a deadlift monster!",
  
  // Cardio badges
  "First Mile": "Your first mile! Running is freedom.",
  "5K Finisher": "3.1 miles conquered! You're a runner now.",
  "10K Warrior": "6.2 miles! You've got serious endurance.",
  "Half Marathon Hero": "13.1 miles - you're officially a long-distance runner!",
  "Marathon Master": "26.2 miles! You've conquered the marathon!",
  
  // Challenge badges
  "Challenge Accepted": "You've joined your first challenge! Game on.",
  "Challenge Champion": "First challenge completed! You proved you can do it.",
  "Challenge Legend": "10 challenges completed! You're a certified challenge crusher.",
  
  // Community badges
  "Circle Starter": "You've created your first circle! Build your tribe.",
  "Team Player": "You've joined a circle! Together we're stronger.",
  "Circle Leader": "Your circle has 10+ members! You're a community builder.",
  
  // Streak badges
  "3 Day Streak": "3 days in a row! Momentum is building.",
  "7 Day Streak": "A full week! You're on fire!",
  "14 Day Streak": "Two weeks strong! This is becoming a habit.",
  "30 Day Streak": "A full month! Incredible dedication.",
  "100 Day Streak": "100 days! Your commitment is legendary.",
  
  // PR badges
  "First PR": "Your first personal record! This is just the beginning.",
  "PR Hunter": "10 PRs! You keep getting stronger.",
  "PR Machine": "50 PRs! You're a personal record machine!",
  
  // Volume badges
  "Ton Club": "You've lifted 2,000 lbs in one workout! Serious volume.",
  "5 Ton Club": "10,000 lbs in one session! That's a lot of iron.",
  "10 Ton Club": "20,000 lbs! You're moving mountains.",
  
  // Special badges
  "Early Bird": "Working out before 6 AM! Rise and grind.",
  "Night Owl": "Late night training! Dedication knows no schedule.",
  "Weekend Warrior": "Never missing weekends! No rest for the dedicated.",
  "Comeback Kid": "Returned after 14+ days off. Welcome back, champion!",
};

async function enhanceBadges() {
  console.log("\n=== Enhancing Badge Definitions ===");
  
  const allBadges = await db.query.badgeDefinitions.findMany();
  let updated = 0;
  
  for (const badge of allBadges) {
    const unlockMessage = BADGE_UNLOCK_MESSAGES[badge.name];
    
    if (unlockMessage && !badge.unlockMessage) {
      await db.update(badgeDefinitions)
        .set({
          unlockMessage,
        })
        .where(eq(badgeDefinitions.id, badge.id));
      updated++;
    } else if (!badge.unlockMessage) {
      // Default unlock message
      await db.update(badgeDefinitions)
        .set({
          unlockMessage: `Congratulations! You've unlocked the ${badge.name} badge. Keep pushing towards your goals!`,
        })
        .where(eq(badgeDefinitions.id, badge.id));
      updated++;
    }
  }
  
  console.log(`  ✓ Enhanced ${updated} badges with unlock messages`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         ENHANCE ALL METADATA - COMPLETE DATA FIX              ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  
  try {
    await enhanceWorkoutPlans();
    await enhancePrograms();
    await enhanceChallenges();
    await enhanceBadges();
    
    console.log("\n✅ All metadata enhanced successfully!");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
