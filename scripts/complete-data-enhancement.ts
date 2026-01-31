/**
 * Complete Data Enhancement - Fill ALL missing data
 * 
 * Run with: npx tsx scripts/complete-data-enhancement.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { 
  exercises, 
  workoutPlanExercises, 
  programWeeks, 
  programWorkouts,
  equipmentCatalog,
  locationTypeDefaults,
  sharedWorkouts,
  workoutPlans
} from "../src/lib/db/schema";
import { eq, isNull, or, sql } from "drizzle-orm";

// =============================================================================
// EXERCISE ENHANCEMENTS BY CATEGORY/MUSCLE GROUP
// =============================================================================

interface ExerciseMetadata {
  benefits: string[];
  commonMistakes: string[];
  safetyNotes: string;
}

// Category-based defaults
const CATEGORY_METADATA: Record<string, ExerciseMetadata> = {
  strength: {
    benefits: [
      "Builds muscle mass and strength",
      "Improves bone density",
      "Boosts metabolism",
      "Enhances functional fitness"
    ],
    commonMistakes: [
      "Using too much weight before mastering form",
      "Not controlling the eccentric (lowering) phase",
      "Holding breath instead of breathing properly",
      "Rushing through repetitions"
    ],
    safetyNotes: "Start with lighter weight to master form. Increase weight gradually. Use a spotter for heavy lifts."
  },
  cardio: {
    benefits: [
      "Improves cardiovascular endurance",
      "Burns calories efficiently",
      "Strengthens heart and lungs",
      "Reduces stress and improves mood"
    ],
    commonMistakes: [
      "Starting too intensely without warming up",
      "Poor posture during exercise",
      "Not staying hydrated",
      "Ignoring signs of overexertion"
    ],
    safetyNotes: "Always warm up for 5-10 minutes. Stay hydrated. Stop if you feel dizzy or experience chest pain."
  },
  flexibility: {
    benefits: [
      "Increases range of motion",
      "Reduces muscle tension and soreness",
      "Improves posture",
      "Decreases risk of injury"
    ],
    commonMistakes: [
      "Bouncing during static stretches",
      "Stretching cold muscles",
      "Holding breath while stretching",
      "Overstretching beyond comfort"
    ],
    safetyNotes: "Warm up before stretching. Never bounce. Hold stretches for 15-30 seconds. Stretch to discomfort, not pain."
  },
  plyometric: {
    benefits: [
      "Increases explosive power",
      "Improves athletic performance",
      "Enhances neuromuscular efficiency",
      "Burns high calories in short time"
    ],
    commonMistakes: [
      "Landing with stiff legs",
      "Not using arms for momentum",
      "Performing on hard surfaces",
      "Doing too many reps when fatigued"
    ],
    safetyNotes: "Ensure adequate rest between sets. Use proper footwear. Train on appropriate surfaces. Progress gradually."
  },
  skill: {
    benefits: [
      "Develops coordination and balance",
      "Improves body awareness",
      "Builds functional movement patterns",
      "Enhances motor learning"
    ],
    commonMistakes: [
      "Skipping progressions",
      "Training skills when overly fatigued",
      "Not practicing consistently",
      "Neglecting proper warm-up"
    ],
    safetyNotes: "Progress through skill levels gradually. Practice in a safe environment. Don't attempt advanced skills without proper preparation."
  },
  sport: {
    benefits: [
      "Sport-specific conditioning",
      "Improves game performance",
      "Develops relevant movement patterns",
      "Enhances competitive fitness"
    ],
    commonMistakes: [
      "Neglecting general fitness",
      "Overtraining sport-specific movements",
      "Ignoring recovery needs",
      "Not cross-training"
    ],
    safetyNotes: "Balance sport-specific and general training. Allow adequate recovery. Address any muscle imbalances."
  }
};

// Muscle-group specific additions
const MUSCLE_SPECIFIC_BENEFITS: Record<string, string[]> = {
  chest: ["Improves pushing strength", "Enhances upper body aesthetics"],
  back: ["Improves pulling strength", "Supports better posture", "Strengthens spine"],
  lats: ["Creates V-taper physique", "Improves pull-up performance"],
  shoulders: ["Improves overhead strength", "Enhances shoulder stability"],
  biceps: ["Improves arm strength", "Enhances pulling movements"],
  triceps: ["Improves pushing strength", "Supports bench press and overhead work"],
  quadriceps: ["Builds lower body power", "Supports knee health"],
  hamstrings: ["Improves hip extension", "Protects against knee injuries", "Enhances running speed"],
  glutes: ["Improves hip power", "Supports lower back health", "Enhances athletic performance"],
  calves: ["Improves ankle stability", "Enhances jumping ability"],
  abdominals: ["Strengthens core stability", "Improves posture", "Protects lower back"],
  forearms: ["Improves grip strength", "Enhances overall lifting performance"],
  traps: ["Improves shoulder stability", "Enhances posture"],
  lower_back: ["Supports spine health", "Improves deadlift performance"],
  adductors: ["Improves hip stability", "Enhances lateral movement"],
  middle_back: ["Improves posture", "Enhances rowing strength"]
};

const MUSCLE_SPECIFIC_MISTAKES: Record<string, string[]> = {
  chest: ["Flaring elbows excessively", "Not touching chest on bench press"],
  back: ["Using momentum instead of muscle", "Rounding lower back"],
  lats: ["Not fully extending at bottom", "Using biceps to pull"],
  shoulders: ["Shrugging during presses", "Going too heavy too soon"],
  biceps: ["Swinging the weight", "Not fully extending arms"],
  triceps: ["Flaring elbows on pushdowns", "Using too narrow grip"],
  quadriceps: ["Knees caving inward", "Not hitting proper depth"],
  hamstrings: ["Rounding lower back", "Hyperextending knees"],
  glutes: ["Not squeezing at the top", "Using lower back instead"],
  calves: ["Bouncing at the bottom", "Not getting full range of motion"],
  abdominals: ["Pulling on neck", "Using hip flexors instead of abs"],
  forearms: ["Gripping too tight", "Using wrist straps too often"],
  traps: ["Rolling shoulders", "Using too much weight"],
  lower_back: ["Rounding spine", "Hyperextending at the top"],
  adductors: ["Moving too fast", "Not controlling the movement"],
  middle_back: ["Using too much arm", "Not squeezing shoulder blades"]
};

async function enhanceExercises() {
  console.log("\n=== Enhancing Exercises ===");
  
  const allExercises = await db.query.exercises.findMany();
  let updated = 0;
  
  for (const exercise of allExercises) {
    const category = exercise.category || "strength";
    const muscleGroups = (exercise.muscleGroups as string[]) || [];
    const primaryMuscle = muscleGroups[0] || "general";
    
    const categoryMeta = CATEGORY_METADATA[category] || CATEGORY_METADATA.strength;
    
    // Build benefits
    let benefits = [...categoryMeta.benefits];
    for (const muscle of muscleGroups) {
      const muscleKey = muscle.toLowerCase().replace(/\s+/g, "_");
      if (MUSCLE_SPECIFIC_BENEFITS[muscleKey]) {
        benefits = [...benefits, ...MUSCLE_SPECIFIC_BENEFITS[muscleKey]];
      }
    }
    benefits = [...new Set(benefits)].slice(0, 6); // Unique, max 6
    
    // Build common mistakes
    let commonMistakes = [...categoryMeta.commonMistakes];
    for (const muscle of muscleGroups) {
      const muscleKey = muscle.toLowerCase().replace(/\s+/g, "_");
      if (MUSCLE_SPECIFIC_MISTAKES[muscleKey]) {
        commonMistakes = [...commonMistakes, ...MUSCLE_SPECIFIC_MISTAKES[muscleKey]];
      }
    }
    commonMistakes = [...new Set(commonMistakes)].slice(0, 5); // Unique, max 5
    
    // Safety notes
    let safetyNotes = categoryMeta.safetyNotes;
    if (exercise.difficulty === "advanced" || exercise.difficulty === "expert") {
      safetyNotes += " This is an advanced movement - ensure proper progression before attempting.";
    }
    
    // Schema: benefits and common_mistakes are both jsonb (common_mistakes stores string[])
    const benefitsJson = JSON.stringify(benefits);
    const commonMistakesJson = JSON.stringify(commonMistakes);
    
    await db.execute(sql`
      UPDATE exercises 
      SET 
        benefits = ${benefitsJson}::jsonb,
        common_mistakes = ${commonMistakesJson}::jsonb,
        safety_notes = ${safetyNotes}
      WHERE id = ${exercise.id}
    `);
    
    updated++;
    if (updated % 100 === 0) {
      console.log(`  Progress: ${updated}/${allExercises.length} exercises updated`);
    }
  }
  
  console.log(`  ✓ Enhanced ${updated} exercises with benefits, common mistakes, and safety notes`);
}

// =============================================================================
// WORKOUT PLAN EXERCISES - REST PERIODS
// =============================================================================

async function enhanceWorkoutPlanExercises() {
  console.log("\n=== Enhancing Workout Plan Exercises ===");
  
  // Get exercises missing rest periods
  const result = await db.execute(sql`
    SELECT wpe.id, wpe.sets, wpe.reps, e.category, e.difficulty
    FROM workout_plan_exercises wpe
    JOIN exercises e ON wpe.exercise_id = e.id
    WHERE wpe.rest_between_sets IS NULL
  `);
  
  let updated = 0;
  for (const row of result.rows as any[]) {
    const sets = row.sets || 3;
    const reps = row.reps || "10";
    const category = row.category || "strength";
    const difficulty = row.difficulty || "intermediate";
    
    // Determine rest period based on exercise type
    let restSeconds = 60; // Default
    
    if (category === "strength") {
      // Heavy compound movements get more rest
      const repNum = parseInt(reps) || 10;
      if (repNum <= 5) {
        restSeconds = 180; // Heavy strength: 3 min
      } else if (repNum <= 8) {
        restSeconds = 120; // Moderate: 2 min
      } else {
        restSeconds = 90; // Hypertrophy: 90 sec
      }
    } else if (category === "cardio") {
      restSeconds = 30; // Short rest for cardio
    } else if (category === "plyometric") {
      restSeconds = 90; // Adequate recovery for power
    } else if (category === "flexibility") {
      restSeconds = 15; // Brief transition between stretches
    }
    
    await db.update(workoutPlanExercises)
      .set({ restBetweenSets: restSeconds })
      .where(eq(workoutPlanExercises.id, row.id));
    
    updated++;
  }
  
  // Update missing notes
  const missingNotes = await db.execute(sql`
    SELECT wpe.id, e.name, wpe.sets, wpe.reps
    FROM workout_plan_exercises wpe
    JOIN exercises e ON wpe.exercise_id = e.id
    WHERE wpe.notes IS NULL OR wpe.notes = ''
  `);
  
  for (const row of missingNotes.rows as any[]) {
    const sets = row.sets || 3;
    const reps = row.reps || "10";
    const note = `Focus on controlled movement. ${sets}x${reps} with proper form.`;
    
    await db.update(workoutPlanExercises)
      .set({ notes: note })
      .where(eq(workoutPlanExercises.id, row.id));
  }
  
  console.log(`  ✓ Updated ${updated} exercises with rest periods`);
  console.log(`  ✓ Updated ${missingNotes.rows.length} exercises with notes`);
}

// =============================================================================
// PROGRAM WEEKS - NOTES
// =============================================================================

const WEEK_NOTES: Record<string, string[]> = {
  "adaptation": [
    "Focus on learning movement patterns. Keep intensity moderate.",
    "This week establishes your baseline. Don't push to failure.",
    "Prioritize form over weight. Build consistency."
  ],
  "strength": [
    "Push harder this week. Add weight if form is solid.",
    "Focus on progressive overload. Rest adequately between sets.",
    "Compound movements are priority. Accessories support the main lifts."
  ],
  "hypertrophy": [
    "Higher volume this week. Chase the pump.",
    "Mind-muscle connection is key. Control the eccentric.",
    "Stay hydrated. Protein intake is crucial for recovery."
  ],
  "power": [
    "Move the weight explosively. Quality over quantity.",
    "CNS recovery is important. Don't train fatigued.",
    "Speed on the concentric, control on the eccentric."
  ],
  "endurance": [
    "Maintain pace throughout. This builds work capacity.",
    "Shorter rest periods challenge cardiovascular system.",
    "Keep moving. The goal is sustained effort."
  ],
  "deload": [
    "Recovery week. Reduce volume and intensity by 40-50%.",
    "Active recovery only. Let your body adapt.",
    "Use this time to address any mobility issues."
  ],
  "peak": [
    "Test week. Find your new maxes.",
    "Full recovery between attempts. This is the payoff.",
    "Trust your training. You're ready for this."
  ],
  "default": [
    "Stay consistent with the program. Trust the process.",
    "Listen to your body. Adjust as needed.",
    "Quality reps over quantity. Progress takes time."
  ]
};

async function enhanceProgramWeeks() {
  console.log("\n=== Enhancing Program Weeks ===");
  
  const weeks = await db.query.programWeeks.findMany();
  let updated = 0;
  
  for (const week of weeks) {
    const focus = (week.focus || "default").toLowerCase();
    const weekNum = week.weekNumber;
    
    // Find matching notes based on focus
    let notesPool = WEEK_NOTES.default;
    for (const [key, notes] of Object.entries(WEEK_NOTES)) {
      if (focus.includes(key)) {
        notesPool = notes;
        break;
      }
    }
    
    // Add variety based on week number
    const noteIndex = weekNum % notesPool.length;
    const note = notesPool[noteIndex];
    
    await db.update(programWeeks)
      .set({ notes: note })
      .where(eq(programWeeks.id, week.id));
    
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} program weeks with notes`);
}

// =============================================================================
// PROGRAM WORKOUTS - NOTES
// =============================================================================

async function enhanceProgramWorkouts() {
  console.log("\n=== Enhancing Program Workouts ===");
  
  const workouts = await db.execute(sql`
    SELECT pw.id, pw.day_number, wp.name as plan_name, wp.category, wp.difficulty
    FROM program_workouts pw
    JOIN workout_plans wp ON pw.workout_plan_id = wp.id
    WHERE pw.notes IS NULL
  `);
  
  let updated = 0;
  const dayNotes = [
    "Start fresh. This is day one of the training week.",
    "Build on yesterday's work. Stay consistent.",
    "Mid-week grind. Keep the momentum going.",
    "Recovery may be setting in. Listen to your body.",
    "Push through. The weekend is close.",
    "Finish the week strong. Leave nothing in the tank.",
    "Active recovery or full rest. You've earned it."
  ];
  
  for (const row of workouts.rows as any[]) {
    const dayNum = row.day_number || 1;
    const planName = row.plan_name || "Workout";
    const category = row.category || "strength";
    
    const dayIndex = (dayNum - 1) % 7;
    let note = dayNotes[dayIndex];
    
    // Add category-specific guidance
    if (category === "strength" || planName.toLowerCase().includes("strength")) {
      note += " Focus on main lifts first.";
    } else if (planName.toLowerCase().includes("cardio") || planName.toLowerCase().includes("hiit")) {
      note += " Stay hydrated. Keep intensity high.";
    } else if (planName.toLowerCase().includes("leg")) {
      note += " Don't skip leg day. Embrace the challenge.";
    }
    
    await db.update(programWorkouts)
      .set({ notes: note })
      .where(eq(programWorkouts.id, row.id));
    
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} program workouts with notes`);
}

// =============================================================================
// EQUIPMENT CATALOG - ICONS AND DETAILS
// =============================================================================

const EQUIPMENT_DETAILS: Record<string, { icon: string; details: Record<string, unknown> }> = {
  "Dumbbells": {
    icon: "dumbbell",
    details: {
      description: "Versatile free weights for unilateral and bilateral training",
      typicalWeightRange: "5-100 lbs",
      useCases: ["Pressing", "Curls", "Rows", "Lunges", "Shoulder work"],
      spaceRequired: "Minimal",
      priceRange: "$50-500+"
    }
  },
  "Barbell": {
    icon: "barbell",
    details: {
      description: "Olympic bar for heavy compound lifts",
      weight: "45 lbs (20 kg) standard",
      useCases: ["Squats", "Deadlifts", "Bench Press", "Rows", "Olympic lifts"],
      spaceRequired: "Moderate with rack",
      priceRange: "$150-500+"
    }
  },
  "Kettlebells": {
    icon: "kettlebell",
    details: {
      description: "Cast iron weights for dynamic and ballistic movements",
      typicalWeightRange: "8-70 kg",
      useCases: ["Swings", "Cleans", "Snatches", "Turkish Get-ups", "Goblet squats"],
      spaceRequired: "Minimal",
      priceRange: "$30-200"
    }
  },
  "Resistance Bands": {
    icon: "band",
    details: {
      description: "Elastic bands providing variable resistance",
      resistanceLevels: ["Light", "Medium", "Heavy", "Extra Heavy"],
      useCases: ["Warm-up", "Rehabilitation", "Assistance work", "Travel workouts"],
      spaceRequired: "Minimal",
      priceRange: "$15-50"
    }
  },
  "Pull-up Bar": {
    icon: "pull-up-bar",
    details: {
      description: "Fixed or doorway bar for hanging exercises",
      useCases: ["Pull-ups", "Chin-ups", "Hanging leg raises", "Dead hangs"],
      spaceRequired: "Door frame or wall mount",
      priceRange: "$20-100"
    }
  },
  "Squat Rack": {
    icon: "squat-rack",
    details: {
      description: "Safety rack for barbell exercises",
      features: ["Safety pins", "J-hooks", "Pull-up bar"],
      useCases: ["Squats", "Rack pulls", "Overhead press"],
      spaceRequired: "Moderate (4x4 feet)",
      priceRange: "$200-800"
    }
  },
  "Power Rack": {
    icon: "power-rack",
    details: {
      description: "Full cage for safe heavy lifting",
      features: ["Full cage", "Safety bars", "Multiple attachments"],
      useCases: ["Squats", "Bench press", "Rack pulls", "Pin presses"],
      spaceRequired: "Large (5x5 feet)",
      priceRange: "$400-2000+"
    }
  },
  "Flat Bench": {
    icon: "bench",
    details: {
      description: "Fixed horizontal bench for pressing movements",
      useCases: ["Bench press", "Dumbbell work", "Step-ups", "Hip thrusts"],
      spaceRequired: "Moderate",
      priceRange: "$100-300"
    }
  },
  "Adjustable Bench": {
    icon: "adjustable-bench",
    details: {
      description: "Multi-angle bench for varied pressing angles",
      angles: ["Flat", "Incline", "Decline", "Upright"],
      useCases: ["Incline press", "Decline press", "Seated exercises"],
      spaceRequired: "Moderate",
      priceRange: "$150-500"
    }
  },
  "Cable Machine": {
    icon: "cable-machine",
    details: {
      description: "Pulley system for constant tension exercises",
      features: ["Adjustable height", "Multiple attachments", "Dual stacks"],
      useCases: ["Cable crossovers", "Tricep pushdowns", "Face pulls", "Cable rows"],
      spaceRequired: "Large",
      priceRange: "$500-3000+"
    }
  },
  "Lat Pulldown": {
    icon: "lat-pulldown",
    details: {
      description: "Seated pulling machine for back development",
      useCases: ["Lat pulldowns", "Close grip pulldowns", "Behind neck pulls"],
      targetMuscles: ["Lats", "Biceps", "Rear delts"],
      priceRange: "$400-1500"
    }
  },
  "Leg Press": {
    icon: "leg-press",
    details: {
      description: "Seated pressing machine for lower body",
      useCases: ["Leg press", "Calf raises", "Single leg press"],
      targetMuscles: ["Quads", "Glutes", "Hamstrings"],
      priceRange: "$800-3000+"
    }
  },
  "Smith Machine": {
    icon: "smith-machine",
    details: {
      description: "Guided barbell system for controlled movements",
      features: ["Fixed bar path", "Safety catches", "Counter-balanced options"],
      useCases: ["Smith squats", "Smith bench", "Shrugs", "Calf raises"],
      priceRange: "$500-2000+"
    }
  },
  "Treadmill": {
    icon: "treadmill",
    details: {
      description: "Motorized running/walking machine",
      features: ["Speed control", "Incline adjustment", "Heart rate monitor"],
      useCases: ["Running", "Walking", "HIIT intervals", "Warm-up"],
      priceRange: "$500-3000+"
    }
  },
  "Stationary Bike": {
    icon: "bike",
    details: {
      description: "Indoor cycling machine for cardio training",
      types: ["Upright", "Recumbent", "Spin bike"],
      useCases: ["Cardio", "Warm-up", "Active recovery", "HIIT"],
      priceRange: "$200-2000+"
    }
  },
  "Rowing Machine": {
    icon: "rower",
    details: {
      description: "Full-body cardio machine simulating rowing",
      resistanceTypes: ["Air", "Water", "Magnetic", "Hydraulic"],
      useCases: ["Cardio", "HIIT", "Warm-up", "Full body conditioning"],
      priceRange: "$300-1500"
    }
  },
  "Elliptical": {
    icon: "elliptical",
    details: {
      description: "Low-impact cardio machine for full-body workout",
      features: ["Arm handles", "Adjustable resistance", "Forward/reverse"],
      useCases: ["Low-impact cardio", "Warm-up", "Active recovery"],
      priceRange: "$400-2000+"
    }
  },
  "Medicine Ball": {
    icon: "medicine-ball",
    details: {
      description: "Weighted ball for dynamic exercises",
      typicalWeightRange: "4-30 lbs",
      useCases: ["Slams", "Throws", "Rotational work", "Core training"],
      priceRange: "$20-100"
    }
  },
  "Stability Ball": {
    icon: "stability-ball",
    details: {
      description: "Large inflatable ball for core and stability work",
      sizes: ["55cm", "65cm", "75cm"],
      useCases: ["Core exercises", "Stretching", "Balance training", "Desk chair alternative"],
      priceRange: "$15-50"
    }
  },
  "Foam Roller": {
    icon: "foam-roller",
    details: {
      description: "Cylindrical foam tool for self-myofascial release",
      densities: ["Soft", "Medium", "Firm", "Extra firm"],
      useCases: ["Recovery", "Warm-up", "Muscle release", "Mobility work"],
      priceRange: "$15-60"
    }
  },
  "Plyo Box": {
    icon: "plyo-box",
    details: {
      description: "Sturdy box for jumping exercises",
      heights: ["20 inch", "24 inch", "30 inch"],
      useCases: ["Box jumps", "Step-ups", "Box squats", "Depth jumps"],
      priceRange: "$50-200"
    }
  },
  "Battle Ropes": {
    icon: "battle-ropes",
    details: {
      description: "Heavy ropes for high-intensity conditioning",
      lengths: ["30 feet", "40 feet", "50 feet"],
      useCases: ["Waves", "Slams", "HIIT conditioning", "Grip strength"],
      priceRange: "$50-150"
    }
  },
  "Dip Station": {
    icon: "dip-station",
    details: {
      description: "Parallel bars for dip exercises",
      useCases: ["Dips", "Knee raises", "L-sits", "Inverted rows"],
      priceRange: "$100-300"
    }
  },
  "Jump Rope": {
    icon: "jump-rope",
    details: {
      description: "Speed rope for cardio and coordination",
      types: ["Speed rope", "Weighted rope", "Beaded rope"],
      useCases: ["Warm-up", "HIIT", "Conditioning", "Coordination"],
      priceRange: "$10-50"
    }
  },
  "Yoga Mat": {
    icon: "yoga-mat",
    details: {
      description: "Cushioned mat for floor exercises",
      thickness: ["3mm", "5mm", "6mm+"],
      useCases: ["Yoga", "Stretching", "Core work", "Bodyweight exercises"],
      priceRange: "$15-100"
    }
  },
  "Yoga Blocks": {
    icon: "yoga-blocks",
    details: {
      description: "Foam or cork blocks for yoga support",
      materials: ["Foam", "Cork", "Wood"],
      useCases: ["Yoga poses", "Stretching support", "Mobility work"],
      priceRange: "$10-30"
    }
  },
  "Stretching Strap": {
    icon: "strap",
    details: {
      description: "Fabric strap with loops for assisted stretching",
      useCases: ["Hamstring stretches", "Shoulder stretches", "Hip openers"],
      priceRange: "$10-25"
    }
  },
  "Weight Plates": {
    icon: "weight-plate",
    details: {
      description: "Iron or bumper plates for loading barbells",
      types: ["Iron", "Rubber coated", "Bumper plates"],
      sizes: ["2.5 lb to 55 lb / 1.25 kg to 25 kg"],
      priceRange: "$1-3 per pound"
    }
  }
};

async function enhanceEquipmentCatalog() {
  console.log("\n=== Enhancing Equipment Catalog ===");
  
  const equipment = await db.query.equipmentCatalog.findMany();
  let updated = 0;
  
  for (const item of equipment) {
    const details = EQUIPMENT_DETAILS[item.name];
    
    if (details) {
      await db.update(equipmentCatalog)
        .set({
          icon: details.icon,
          details: details.details
        })
        .where(eq(equipmentCatalog.id, item.id));
    } else {
      // Default for unknown equipment
      await db.update(equipmentCatalog)
        .set({
          icon: "equipment",
          details: {
            description: `${item.name} for ${item.category} training`,
            category: item.category
          }
        })
        .where(eq(equipmentCatalog.id, item.id));
    }
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} equipment items with icons and details`);
}

// =============================================================================
// LOCATION TYPE DEFAULTS - EQUIPMENT
// =============================================================================

async function enhanceLocationDefaults() {
  console.log("\n=== Enhancing Location Type Defaults ===");
  
  // Update custom location with some basic equipment suggestions
  await db.update(locationTypeDefaults)
    .set({
      defaultEquipment: ["Yoga Mat", "Resistance Bands"],
      typicalEquipmentCount: 2
    })
    .where(eq(locationTypeDefaults.locationType, "custom"));
  
  console.log(`  ✓ Updated custom location with default equipment`);
}

// =============================================================================
// SHARED WORKOUTS - TARGET MUSCLES AND EQUIPMENT
// =============================================================================

async function enhanceSharedWorkouts() {
  console.log("\n=== Enhancing Shared Workouts ===");
  
  // Get shared workouts with their workout plan data
  const result = await db.execute(sql`
    SELECT 
      sw.id,
      sw.title,
      sw.category,
      wp.category as plan_category,
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT mg)
          FROM workout_plan_exercises wpe
          JOIN exercises e ON wpe.exercise_id = e.id,
          jsonb_array_elements_text(e.muscle_groups) as mg
          WHERE wpe.plan_id = wp.id
        ),
        '[]'::jsonb
      ) as target_muscles,
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT eq)
          FROM workout_plan_exercises wpe
          JOIN exercises e ON wpe.exercise_id = e.id,
          jsonb_array_elements_text(e.equipment) as eq
          WHERE wpe.plan_id = wp.id AND e.equipment IS NOT NULL
        ),
        '[]'::jsonb
      ) as equipment_required
    FROM shared_workouts sw
    JOIN workout_plans wp ON sw.workout_plan_id = wp.id
    WHERE sw.target_muscles IS NULL OR sw.equipment_required IS NULL
  `);
  
  let updated = 0;
  for (const row of result.rows as any[]) {
    let muscles = row.target_muscles;
    let equipment = row.equipment_required;
    
    // Default fallbacks if empty
    if (!muscles || muscles.length === 0) {
      const category = (row.category || row.plan_category || "").toLowerCase();
      if (category.includes("push") || category.includes("chest")) {
        muscles = ["chest", "shoulders", "triceps"];
      } else if (category.includes("pull") || category.includes("back")) {
        muscles = ["lats", "biceps", "rhomboids"];
      } else if (category.includes("leg")) {
        muscles = ["quadriceps", "hamstrings", "glutes", "calves"];
      } else {
        muscles = ["full body"];
      }
    }
    
    if (!equipment || equipment.length === 0) {
      equipment = ["Body Only"];
    }
    
    await db.update(sharedWorkouts)
      .set({
        targetMuscles: muscles,
        equipmentRequired: equipment
      })
      .where(eq(sharedWorkouts.id, row.id));
    
    updated++;
  }
  
  console.log(`  ✓ Enhanced ${updated} shared workouts with muscles and equipment`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║           COMPLETE DATA ENHANCEMENT SCRIPT                    ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  
  try {
    await enhanceExercises();
    await enhanceWorkoutPlanExercises();
    await enhanceProgramWeeks();
    await enhanceProgramWorkouts();
    await enhanceEquipmentCatalog();
    await enhanceLocationDefaults();
    await enhanceSharedWorkouts();
    
    console.log("\n✅ All data enhanced successfully!");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
