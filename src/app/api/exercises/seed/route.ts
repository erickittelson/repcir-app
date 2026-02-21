import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const EXERCISE_SEED_DATA = [
  // Chest - Strength
  {
    name: "Barbell Bench Press",
    category: "strength",
    muscleGroups: ["Chest"],
    secondaryMuscles: ["Triceps", "Shoulders"],
    equipment: ["Barbell", "Bench"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "The king of chest exercises. Lie on a flat bench and press a barbell up from chest level.",
    instructions: "1. Lie on the bench with feet flat on floor\\n2. Grip the bar slightly wider than shoulder width\\n3. Unrack and lower the bar to mid-chest\\n4. Press up until arms are extended\\n5. Keep shoulder blades pinched throughout",
    benefits: ["strength", "power"],
  },
  {
    name: "Incline Dumbbell Press",
    category: "strength",
    muscleGroups: ["Chest", "Shoulders"],
    secondaryMuscles: ["Triceps"],
    equipment: ["Dumbbells", "Incline Bench"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "Targets the upper chest with an inclined angle.",
    instructions: "1. Set bench to 30-45 degree angle\\n2. Hold dumbbells at shoulder level\\n3. Press up and slightly together\\n4. Lower with control",
    benefits: ["strength"],
  },
  {
    name: "Push-ups",
    category: "strength",
    muscleGroups: ["Chest"],
    secondaryMuscles: ["Triceps", "Shoulders", "Core"],
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    force: "push",
    mechanic: "compound",
    description: "Classic bodyweight chest exercise.",
    instructions: "1. Start in plank position\\n2. Lower chest toward floor\\n3. Push back up to start\\n4. Keep body in straight line throughout",
    benefits: ["strength", "endurance"],
    progressions: ["diamond push-ups", "one-arm push-ups", "planche push-ups"],
  },
  {
    name: "Dumbbell Flyes",
    category: "strength",
    muscleGroups: ["Chest"],
    equipment: ["Dumbbells", "Bench"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "isolation",
    description: "Isolation movement for chest stretch and contraction.",
    instructions: "1. Lie on flat bench with dumbbells above chest\\n2. Lower arms out to sides with slight bend in elbows\\n3. Feel stretch in chest\\n4. Bring arms back together",
    benefits: ["strength", "flexibility"],
  },

  // Back - Strength
  {
    name: "Barbell Deadlift",
    category: "strength",
    muscleGroups: ["Back", "Glutes", "Hamstrings"],
    secondaryMuscles: ["Core", "Forearms"],
    equipment: ["Barbell"],
    difficulty: "intermediate",
    force: "pull",
    mechanic: "compound",
    description: "Full body compound movement and one of the big three lifts.",
    instructions: "1. Stand with feet hip-width apart, bar over mid-foot\\n2. Hinge at hips and grip bar\\n3. Flatten back, brace core\\n4. Drive through heels and extend hips\\n5. Stand tall at top, then lower with control",
    benefits: ["strength", "power"],
  },
  {
    name: "Pull-ups",
    category: "strength",
    muscleGroups: ["Back", "Biceps"],
    secondaryMuscles: ["Shoulders", "Core"],
    equipment: ["Pull-up Bar"],
    difficulty: "intermediate",
    force: "pull",
    mechanic: "compound",
    description: "Classic vertical pulling movement.",
    instructions: "1. Hang from bar with overhand grip\\n2. Pull chest toward bar\\n3. Lower with control\\n4. Full extension at bottom",
    benefits: ["strength"],
    progressions: ["muscle-up", "one-arm pull-up"],
  },
  {
    name: "Barbell Row",
    category: "strength",
    muscleGroups: ["Back"],
    secondaryMuscles: ["Biceps", "Core"],
    equipment: ["Barbell"],
    difficulty: "intermediate",
    force: "pull",
    mechanic: "compound",
    description: "Horizontal pulling for back thickness.",
    instructions: "1. Hinge at hips, flat back\\n2. Grip bar shoulder width\\n3. Pull bar to lower chest/upper abs\\n4. Squeeze shoulder blades\\n5. Lower with control",
    benefits: ["strength"],
  },
  {
    name: "Lat Pulldown",
    category: "strength",
    muscleGroups: ["Back"],
    secondaryMuscles: ["Biceps"],
    equipment: ["Cable Machine"],
    difficulty: "beginner",
    force: "pull",
    mechanic: "compound",
    description: "Machine version of pull-up motion.",
    instructions: "1. Grip bar wider than shoulders\\n2. Pull bar to upper chest\\n3. Squeeze lats at bottom\\n4. Control the return",
    benefits: ["strength"],
  },

  // Legs - Strength
  {
    name: "Barbell Back Squat",
    category: "strength",
    muscleGroups: ["Quadriceps", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Core", "Back"],
    equipment: ["Barbell", "Squat Rack"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "The king of leg exercises and one of the big three lifts.",
    instructions: "1. Bar on upper traps, not neck\\n2. Feet shoulder width or slightly wider\\n3. Break at hips and knees together\\n4. Descend until thighs parallel or below\\n5. Drive through whole foot to stand",
    benefits: ["strength", "power"],
  },
  {
    name: "Romanian Deadlift",
    category: "strength",
    muscleGroups: ["Hamstrings", "Glutes"],
    secondaryMuscles: ["Back", "Core"],
    equipment: ["Barbell"],
    difficulty: "intermediate",
    force: "pull",
    mechanic: "compound",
    description: "Hip hinge movement targeting posterior chain.",
    instructions: "1. Hold bar at hip level\\n2. Slight bend in knees\\n3. Hinge at hips, push butt back\\n4. Lower bar along legs\\n5. Feel hamstring stretch, then drive hips forward",
    benefits: ["strength", "flexibility"],
  },
  {
    name: "Leg Press",
    category: "strength",
    muscleGroups: ["Quadriceps", "Glutes"],
    secondaryMuscles: ["Hamstrings"],
    equipment: ["Leg Press Machine"],
    difficulty: "beginner",
    force: "push",
    mechanic: "compound",
    description: "Machine-based quad dominant leg exercise.",
    instructions: "1. Feet shoulder width on platform\\n2. Lower weight by bending knees\\n3. Don't let lower back round\\n4. Press through heels to extend",
    benefits: ["strength"],
  },
  {
    name: "Walking Lunges",
    category: "strength",
    muscleGroups: ["Quadriceps", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["Bodyweight", "Dumbbells"],
    difficulty: "beginner",
    force: "push",
    mechanic: "compound",
    description: "Unilateral leg exercise with balance component.",
    instructions: "1. Take a big step forward\\n2. Lower back knee toward floor\\n3. Front knee over ankle\\n4. Push off front foot to step through",
    benefits: ["strength", "balance", "coordination"],
  },

  // Shoulders - Strength
  {
    name: "Overhead Press",
    category: "strength",
    muscleGroups: ["Shoulders"],
    secondaryMuscles: ["Triceps", "Core"],
    equipment: ["Barbell"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "Standing barbell press for shoulder strength.",
    instructions: "1. Bar at collar bone level\\n2. Grip just outside shoulders\\n3. Press straight up\\n4. Move head through at top\\n5. Lower with control",
    benefits: ["strength", "power"],
  },
  {
    name: "Lateral Raises",
    category: "strength",
    muscleGroups: ["Shoulders"],
    equipment: ["Dumbbells"],
    difficulty: "beginner",
    force: "push",
    mechanic: "isolation",
    description: "Isolation exercise for lateral deltoid.",
    instructions: "1. Hold dumbbells at sides\\n2. Slight bend in elbows\\n3. Raise arms out to sides\\n4. Stop at shoulder height\\n5. Lower with control",
    benefits: ["strength"],
  },

  // Arms - Strength
  {
    name: "Barbell Curl",
    category: "strength",
    muscleGroups: ["Biceps"],
    equipment: ["Barbell"],
    difficulty: "beginner",
    force: "pull",
    mechanic: "isolation",
    description: "Classic bicep exercise.",
    instructions: "1. Stand with bar at thigh level\\n2. Curl bar up keeping elbows fixed\\n3. Squeeze at top\\n4. Lower with control",
    benefits: ["strength"],
  },
  {
    name: "Tricep Dips",
    category: "strength",
    muscleGroups: ["Triceps"],
    secondaryMuscles: ["Chest", "Shoulders"],
    equipment: ["Dip Bars", "Bench"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "Bodyweight tricep exercise.",
    instructions: "1. Support body on bars or bench\\n2. Lower by bending elbows\\n3. Keep elbows close to body\\n4. Press back up",
    benefits: ["strength"],
  },
  {
    name: "Skull Crushers",
    category: "strength",
    muscleGroups: ["Triceps"],
    equipment: ["Barbell", "EZ Bar", "Bench"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "isolation",
    description: "Lying tricep extension.",
    instructions: "1. Lie on bench with bar extended above chest\\n2. Lower bar toward forehead by bending elbows\\n3. Keep upper arms stationary\\n4. Extend back up",
    benefits: ["strength"],
  },

  // Core - Strength
  {
    name: "Plank",
    category: "strength",
    muscleGroups: ["Core"],
    secondaryMuscles: ["Shoulders"],
    equipment: ["Bodyweight"],
    difficulty: "beginner",
    force: "static",
    mechanic: "isolation",
    description: "Isometric core stability exercise.",
    instructions: "1. Forearms and toes on ground\\n2. Body in straight line\\n3. Brace core\\n4. Hold position\\n5. Don't let hips sag or pike",
    benefits: ["strength", "endurance"],
  },
  {
    name: "Hanging Leg Raises",
    category: "strength",
    muscleGroups: ["Core"],
    equipment: ["Pull-up Bar"],
    difficulty: "intermediate",
    force: "pull",
    mechanic: "isolation",
    description: "Advanced ab exercise from hanging position.",
    instructions: "1. Hang from bar\\n2. Raise legs together\\n3. Aim for parallel or higher\\n4. Lower with control\\n5. Minimize swinging",
    benefits: ["strength"],
  },

  // Cardio
  {
    name: "Running",
    category: "cardio",
    muscleGroups: ["Legs", "Core"],
    equipment: ["Treadmill"],
    difficulty: "beginner",
    description: "Classic cardio exercise for endurance.",
    instructions: "1. Start with walking warmup\\n2. Increase pace gradually\\n3. Maintain good posture\\n4. Land mid-foot\\n5. Cool down with walking",
    benefits: ["endurance", "speed"],
  },
  {
    name: "Rowing Machine",
    category: "cardio",
    muscleGroups: ["Back", "Legs"],
    secondaryMuscles: ["Biceps", "Core"],
    equipment: ["Rowing Machine"],
    difficulty: "beginner",
    force: "pull",
    mechanic: "compound",
    description: "Full body cardio with pulling emphasis.",
    instructions: "1. Legs drive first\\n2. Then lean back\\n3. Finally pull arms\\n4. Reverse the motion\\n5. Legs-back-arms, arms-back-legs",
    benefits: ["endurance", "strength"],
  },
  {
    name: "Jump Rope",
    category: "cardio",
    muscleGroups: ["Calves", "Shoulders"],
    equipment: ["Jump Rope"],
    difficulty: "beginner",
    description: "High intensity cardio with coordination.",
    instructions: "1. Hold handles at hip level\\n2. Jump with both feet\\n3. Use wrists to turn rope\\n4. Land softly on balls of feet",
    benefits: ["endurance", "coordination", "speed"],
  },

  // Plyometrics
  {
    name: "Box Jumps",
    category: "plyometric",
    muscleGroups: ["Quadriceps", "Glutes"],
    secondaryMuscles: ["Calves"],
    equipment: ["Plyo Box"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "Explosive lower body power exercise.",
    instructions: "1. Stand facing box\\n2. Swing arms back\\n3. Explode up onto box\\n4. Land softly with bent knees\\n5. Step down to reset",
    benefits: ["power", "speed"],
  },
  {
    name: "Burpees",
    category: "plyometric",
    muscleGroups: ["Full Body"],
    equipment: ["Bodyweight"],
    difficulty: "intermediate",
    force: "push",
    mechanic: "compound",
    description: "Full body explosive movement.",
    instructions: "1. Start standing\\n2. Drop to push-up position\\n3. Do a push-up\\n4. Jump feet to hands\\n5. Explode up with jump",
    benefits: ["power", "endurance"],
  },

  // Flexibility
  {
    name: "Downward Dog",
    category: "flexibility",
    muscleGroups: ["Hamstrings", "Calves", "Shoulders"],
    equipment: ["Yoga Mat"],
    difficulty: "beginner",
    force: "static",
    description: "Classic yoga pose for full body stretch.",
    instructions: "1. Start on hands and knees\\n2. Push hips up and back\\n3. Straighten legs\\n4. Press heels toward floor\\n5. Hold and breathe",
    benefits: ["flexibility"],
  },
  {
    name: "Pigeon Pose",
    category: "flexibility",
    muscleGroups: ["Hips", "Glutes"],
    equipment: ["Yoga Mat"],
    difficulty: "beginner",
    force: "static",
    description: "Deep hip opener yoga pose.",
    instructions: "1. From downward dog, bring knee forward\\n2. Lower hips to floor\\n3. Back leg extends behind\\n4. Stay upright or fold forward\\n5. Breathe into the stretch",
    benefits: ["flexibility"],
  },
];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.activeCircle?.role;
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check if exercises already exist
    const existingCount = await db.query.exercises.findMany({
      columns: { id: true },
      limit: 1,
    });

    if (existingCount.length > 0) {
      // Check for specific exercises to avoid duplicates
      const existingNames = await db.query.exercises.findMany({
        columns: { name: true },
      });
      const existingNameSet = new Set(existingNames.map((e) => e.name.toLowerCase()));

      const newExercises = EXERCISE_SEED_DATA.filter(
        (e) => !existingNameSet.has(e.name.toLowerCase())
      );

      if (newExercises.length === 0) {
        return NextResponse.json({
          message: "Exercises already seeded",
          count: 0,
        });
      }

      // Insert only new exercises
      await db.insert(exercises).values(
        newExercises.map((e) => ({
          name: e.name,
          category: e.category,
          description: e.description,
          instructions: e.instructions,
          muscleGroups: e.muscleGroups,
          secondaryMuscles: e.secondaryMuscles,
          equipment: e.equipment,
          difficulty: e.difficulty,
          force: e.force,
          mechanic: e.mechanic,
          benefits: e.benefits,
          progressions: e.progressions,
          isCustom: false,
        }))
      );

      return NextResponse.json({
        message: `Added ${newExercises.length} new exercises`,
        count: newExercises.length,
      });
    }

    // Insert all exercises
    await db.insert(exercises).values(
      EXERCISE_SEED_DATA.map((e) => ({
        name: e.name,
        category: e.category,
        description: e.description,
        instructions: e.instructions,
        muscleGroups: e.muscleGroups,
        secondaryMuscles: e.secondaryMuscles,
        equipment: e.equipment,
        difficulty: e.difficulty,
        force: e.force,
        mechanic: e.mechanic,
        benefits: e.benefits,
        progressions: e.progressions,
        isCustom: false,
      }))
    );

    return NextResponse.json({
      message: `Seeded ${EXERCISE_SEED_DATA.length} exercises`,
      count: EXERCISE_SEED_DATA.length,
    });
  } catch (error) {
    console.error("Error seeding exercises:", error);
    return NextResponse.json(
      { error: "Failed to seed exercises" },
      { status: 500 }
    );
  }
}
