/**
 * Link workouts to their exercises in the workout_plan_exercises table
 * This fixes the missing workout-exercise relationships
 * Run: npx tsx scripts/link-workout-exercises.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { workoutPlans, exercises, workoutPlanExercises } from "../src/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import { ALL_WORKOUTS } from "./seed-workouts-programs-challenges";

async function linkWorkoutExercises() {
  console.log("🔗 Linking workouts to exercises...\n");

  // Get all exercises from the database for name matching
  const allExercises = await db.select({
    id: exercises.id,
    name: exercises.name,
  }).from(exercises);

  // Create a map for quick lookup (case-insensitive)
  const exerciseMap = new Map<string, string>();
  allExercises.forEach((e) => {
    exerciseMap.set(e.name.toLowerCase(), e.id);
  });

  console.log(`📚 Found ${allExercises.length} exercises in database\n`);

  // Get all workout plans
  const allWorkoutPlans = await db.select({
    id: workoutPlans.id,
    name: workoutPlans.name,
  }).from(workoutPlans);

  console.log(`🏋️ Found ${allWorkoutPlans.length} workout plans in database\n`);

  // Create a map for workout plans
  const workoutPlanMap = new Map<string, string>();
  allWorkoutPlans.forEach((w) => {
    workoutPlanMap.set(w.name.toLowerCase(), w.id);
  });

  let linkedCount = 0;
  let missingExercises: string[] = [];
  let missingWorkouts: string[] = [];

  for (const workout of ALL_WORKOUTS) {
    const workoutPlanId = workoutPlanMap.get(workout.name.toLowerCase());
    
    if (!workoutPlanId) {
      missingWorkouts.push(workout.name);
      continue;
    }

    // Check if this workout already has exercises linked
    const existingLinks = await db.select()
      .from(workoutPlanExercises)
      .where(eq(workoutPlanExercises.planId, workoutPlanId));

    if (existingLinks.length > 0) {
      console.log(`✓ ${workout.name} already has ${existingLinks.length} exercises linked`);
      continue;
    }

    if (!workout.exercises || workout.exercises.length === 0) {
      console.log(`⚠ ${workout.name} has no exercises defined`);
      continue;
    }

    console.log(`\n📝 Processing: ${workout.name} (${workout.exercises.length} exercises)`);

    for (let i = 0; i < workout.exercises.length; i++) {
      const exerciseData = workout.exercises[i];
      const exerciseName = exerciseData.name;
      
      // Try to find the exercise by name
      let exerciseId = exerciseMap.get(exerciseName.toLowerCase());
      
      // Try some variations if not found
      if (!exerciseId) {
        // Try without "s" at the end
        exerciseId = exerciseMap.get(exerciseName.toLowerCase().replace(/s$/, ""));
      }
      if (!exerciseId) {
        // Try with "s" at the end
        exerciseId = exerciseMap.get(exerciseName.toLowerCase() + "s");
      }
      if (!exerciseId) {
        // Try replacing "Bodyweight Squat" with "Squat"
        if (exerciseName.toLowerCase().includes("bodyweight")) {
          exerciseId = exerciseMap.get(exerciseName.toLowerCase().replace("bodyweight ", ""));
        }
      }

      if (!exerciseId) {
        if (!missingExercises.includes(exerciseName)) {
          missingExercises.push(exerciseName);
        }
        console.log(`  ❌ Exercise not found: "${exerciseName}"`);
        continue;
      }

      // Insert the link
      try {
        await db.insert(workoutPlanExercises).values({
          planId: workoutPlanId,
          exerciseId: exerciseId,
          order: i + 1,
          sets: exerciseData.sets || null,
          reps: exerciseData.reps || null,
          weight: exerciseData.weight || null,
          duration: exerciseData.duration || null,
          distance: exerciseData.distance ? String(exerciseData.distance) : null,
          notes: exerciseData.notes || null,
          groupId: exerciseData.groupId || null,
          groupType: exerciseData.groupType || null,
        });
        linkedCount++;
        console.log(`  ✅ Linked: ${exerciseName}`);
      } catch (error: any) {
        console.log(`  ❌ Error linking ${exerciseName}: ${error.message}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Successfully linked ${linkedCount} exercise instances`);
  
  if (missingWorkouts.length > 0) {
    console.log(`\n⚠ ${missingWorkouts.length} workouts not found in database:`);
    missingWorkouts.slice(0, 10).forEach(w => console.log(`  - ${w}`));
    if (missingWorkouts.length > 10) {
      console.log(`  ... and ${missingWorkouts.length - 10} more`);
    }
  }
  
  if (missingExercises.length > 0) {
    console.log(`\n⚠ ${missingExercises.length} exercises not found in database:`);
    missingExercises.forEach(e => console.log(`  - ${e}`));
    console.log("\nYou may need to add these exercises to the exercises table.");
  }

  process.exit(0);
}

linkWorkoutExercises().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
