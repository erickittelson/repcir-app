/**
 * Sync All Exercises from Free Exercise DB
 *
 * Imports 800+ exercises from the Free Exercise DB and populates both
 * the operational `exercises` table and the `dim_exercises` dimension table.
 *
 * Run: npx tsx scripts/migrations/sync-all-exercises.ts
 */

// Load environment variables FIRST before any other imports
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../../src/lib/db";
import { exercises } from "../../src/lib/db/schema";
import { dimExercises, dimMuscleGroups } from "../../src/lib/db/schema-star";
import { sql, eq } from "drizzle-orm";

const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

interface FreeExerciseDBEntry {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

// Muscle group definitions for the dimension table
const MUSCLE_GROUPS = [
  { name: "chest", displayName: "Chest", bodyRegion: "upper", category: "push", recoveryHours: 48 },
  { name: "back", displayName: "Back", bodyRegion: "upper", category: "pull", recoveryHours: 48 },
  { name: "shoulders", displayName: "Shoulders", bodyRegion: "upper", category: "push", recoveryHours: 48 },
  { name: "biceps", displayName: "Biceps", bodyRegion: "upper", category: "pull", recoveryHours: 36 },
  { name: "triceps", displayName: "Triceps", bodyRegion: "upper", category: "push", recoveryHours: 36 },
  { name: "forearms", displayName: "Forearms", bodyRegion: "upper", category: "pull", recoveryHours: 24 },
  { name: "quadriceps", displayName: "Quadriceps", bodyRegion: "lower", category: "push", recoveryHours: 72 },
  { name: "hamstrings", displayName: "Hamstrings", bodyRegion: "lower", category: "pull", recoveryHours: 72 },
  { name: "glutes", displayName: "Glutes", bodyRegion: "lower", category: "push", recoveryHours: 48 },
  { name: "calves", displayName: "Calves", bodyRegion: "lower", category: "push", recoveryHours: 36 },
  { name: "core", displayName: "Core", bodyRegion: "core", category: "stabilizer", recoveryHours: 24 },
  { name: "abdominals", displayName: "Abdominals", bodyRegion: "core", category: "stabilizer", recoveryHours: 24 },
  { name: "abs", displayName: "Abs", bodyRegion: "core", category: "stabilizer", recoveryHours: 24 },
  { name: "obliques", displayName: "Obliques", bodyRegion: "core", category: "stabilizer", recoveryHours: 24 },
  { name: "lower back", displayName: "Lower Back", bodyRegion: "core", category: "stabilizer", recoveryHours: 48 },
  { name: "traps", displayName: "Traps", bodyRegion: "upper", category: "pull", recoveryHours: 48 },
  { name: "lats", displayName: "Lats", bodyRegion: "upper", category: "pull", recoveryHours: 48 },
  { name: "middle back", displayName: "Middle Back", bodyRegion: "upper", category: "pull", recoveryHours: 48 },
  { name: "neck", displayName: "Neck", bodyRegion: "upper", category: "stabilizer", recoveryHours: 24 },
  { name: "adductors", displayName: "Adductors", bodyRegion: "lower", category: "stabilizer", recoveryHours: 48 },
  { name: "abductors", displayName: "Abductors", bodyRegion: "lower", category: "stabilizer", recoveryHours: 48 },
];

// Movement pattern mapping
const MOVEMENT_PATTERNS: Record<string, string[]> = {
  horizontal_push: ["bench press", "push-up", "chest press", "dumbbell press", "fly"],
  horizontal_pull: ["row", "cable row", "bent over", "face pull"],
  vertical_push: ["overhead press", "shoulder press", "military press", "arnold"],
  vertical_pull: ["pull-up", "lat pulldown", "chin-up", "pulldown"],
  squat: ["squat", "leg press", "goblet", "hack squat"],
  hinge: ["deadlift", "romanian", "hip thrust", "good morning", "hyperextension"],
  lunge: ["lunge", "split squat", "step-up", "bulgarian"],
  carry: ["farmer", "carry", "walk", "suitcase"],
  rotation: ["rotation", "twist", "woodchop", "russian"],
  isolation: ["curl", "extension", "raise", "fly", "kickback"],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    strength: "strength",
    stretching: "flexibility",
    plyometrics: "plyometric",
    strongman: "strength",
    powerlifting: "strength",
    cardio: "cardio",
    "olympic weightlifting": "strength",
  };
  return categoryMap[category.toLowerCase()] || "strength";
}

function mapDifficulty(level: string): string {
  const levelMap: Record<string, string> = {
    beginner: "beginner",
    intermediate: "intermediate",
    expert: "advanced",
  };
  return levelMap[level.toLowerCase()] || "intermediate";
}

function detectMovementPattern(name: string): string | null {
  const lowerName = name.toLowerCase();
  for (const [pattern, keywords] of Object.entries(MOVEMENT_PATTERNS)) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      return pattern;
    }
  }
  return null;
}

function detectForceType(force: string | null, name: string): string {
  if (force) return force;
  const lowerName = name.toLowerCase();
  if (lowerName.includes("pull") || lowerName.includes("row") || lowerName.includes("curl")) {
    return "pull";
  }
  if (lowerName.includes("push") || lowerName.includes("press") || lowerName.includes("extension")) {
    return "push";
  }
  return "static";
}

function inferBenefits(ex: FreeExerciseDBEntry): string[] {
  const benefits: string[] = [];
  if (ex.category === "strength" || ex.category === "powerlifting") benefits.push("strength");
  if (ex.category === "cardio") benefits.push("endurance", "cardiovascular health");
  if (ex.category === "stretching") benefits.push("flexibility", "mobility");
  if (ex.category === "plyometrics") benefits.push("power", "explosiveness");
  if (ex.mechanic === "compound") benefits.push("functional strength");
  if (ex.primaryMuscles.includes("abdominals") || ex.primaryMuscles.includes("lower back")) {
    benefits.push("core stability");
  }
  return [...new Set(benefits)];
}

async function populateMuscleGroups() {
  console.log("\n[1/4] Populating muscle groups dimension...");

  let inserted = 0;
  for (const [index, mg] of MUSCLE_GROUPS.entries()) {
    try {
      await db
        .insert(dimMuscleGroups)
        .values({
          name: mg.name,
          displayName: mg.displayName,
          bodyRegion: mg.bodyRegion,
          category: mg.category,
          recoveryHours: mg.recoveryHours,
          sortOrder: index,
        })
        .onConflictDoNothing();
      inserted++;
    } catch (error) {
      // Ignore duplicates
    }
  }

  console.log(`  Inserted ${inserted} muscle groups`);
}

async function syncExercisesFromFreeDB() {
  console.log("\n[2/4] Fetching exercises from Free Exercise DB...");

  const response = await fetch(FREE_EXERCISE_DB_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.statusText}`);
  }

  const freeDBExercises: FreeExerciseDBEntry[] = await response.json();
  console.log(`  Found ${freeDBExercises.length} exercises in Free Exercise DB`);

  // Get existing exercises to avoid duplicates
  const existingExercises = await db.select({ name: exercises.name }).from(exercises);
  const existingNames = new Set(existingExercises.map((e) => e.name.toLowerCase()));
  console.log(`  ${existingNames.size} exercises already exist in database`);

  // Filter new exercises
  const newExercises = freeDBExercises.filter(
    (ex) => !existingNames.has(ex.name.toLowerCase())
  );
  console.log(`  ${newExercises.length} new exercises to insert`);

  if (newExercises.length === 0) {
    console.log("  No new exercises to insert");
    return freeDBExercises.length;
  }

  // Insert in batches
  console.log("\n[3/4] Inserting exercises into main table...");
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < newExercises.length; i += batchSize) {
    const batch = newExercises.slice(i, i + batchSize);

    const values = batch.map((ex) => ({
      name: ex.name,
      description: `${ex.force ? `${ex.force.charAt(0).toUpperCase() + ex.force.slice(1)} movement. ` : ""}${
        ex.mechanic ? `${ex.mechanic.charAt(0).toUpperCase() + ex.mechanic.slice(1)} exercise. ` : ""
      }Targets ${ex.primaryMuscles.join(", ")}${
        ex.secondaryMuscles.length > 0
          ? ` with secondary activation of ${ex.secondaryMuscles.join(", ")}`
          : ""
      }.`,
      instructions: ex.instructions.join("\n"),
      category: mapCategory(ex.category),
      muscleGroups: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles,
      equipment: ex.equipment ? [ex.equipment] : ["bodyweight"],
      difficulty: mapDifficulty(ex.level),
      force: ex.force,
      mechanic: ex.mechanic,
      benefits: inferBenefits(ex),
      imageUrl: ex.images.length > 0 ? `${IMAGE_BASE_URL}/${ex.images[0]}` : null,
      isCustom: false,
    }));

    try {
      await db.insert(exercises).values(values).onConflictDoNothing();
      inserted += batch.length;
      process.stdout.write(`\r  Inserted ${inserted}/${newExercises.length} exercises...`);
    } catch (error) {
      console.error(`\n  Error inserting batch:`, error);
    }
  }

  console.log(`\n  Done! Inserted ${inserted} exercises`);
  return existingNames.size + inserted;
}

async function populateDimExercises() {
  console.log("\n[4/4] Populating dim_exercises from exercises table...");

  // Get all exercises
  const allExercises = await db.select().from(exercises);
  console.log(`  Found ${allExercises.length} exercises to migrate to dim_exercises`);

  // Check existing
  const existingDim = await db.select({ id: dimExercises.id }).from(dimExercises);
  const existingIds = new Set(existingDim.map((e) => e.id));
  console.log(`  ${existingIds.size} already in dim_exercises`);

  const toInsert = allExercises.filter((ex) => !existingIds.has(ex.id));
  console.log(`  ${toInsert.length} new exercises to add to dim_exercises`);

  if (toInsert.length === 0) {
    console.log("  No new exercises to migrate");
    return;
  }

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);

    const values = batch.map((ex) => {
      const slug = slugify(ex.name);
      const movementPattern = detectMovementPattern(ex.name);
      const forceType = detectForceType(ex.force, ex.name);

      const searchableText = [
        ex.name,
        ex.description,
        ex.category,
        ...(ex.muscleGroups || []),
        ...(ex.equipment || []),
      ]
        .filter(Boolean)
        .join(" ");

      return {
        id: ex.id, // Keep same ID for referential integrity
        name: ex.name,
        slug,
        description: ex.description,
        instructions: ex.instructions,
        category: ex.category,
        movementPattern,
        forceType,
        mechanic: ex.mechanic,
        primaryMuscles: ex.muscleGroups || [],
        secondaryMuscles: ex.secondaryMuscles || [],
        equipment: ex.equipment || [],
        difficulty: ex.difficulty,
        imageUrl: ex.imageUrl,
        videoUrl: ex.videoUrl,
        tags: [],
        searchableText,
        benefits: ex.benefits || [],
        isActive: true,
        isCustom: ex.isCustom || false,
        source: ex.isCustom ? "custom" : "free_exercise_db",
        createdAt: ex.createdAt,
        updatedAt: ex.updatedAt,
      };
    });

    try {
      await db.insert(dimExercises).values(values).onConflictDoNothing();
      inserted += batch.length;
      process.stdout.write(`\r  Migrated ${inserted}/${toInsert.length} exercises...`);
    } catch (error) {
      console.error(`\n  Error migrating batch:`, error);
    }
  }

  console.log(`\n  Done! Migrated ${inserted} exercises to dim_exercises`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Exercise Sync & Dimension Population Script");
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    // Step 1: Populate muscle groups
    await populateMuscleGroups();

    // Step 2 & 3: Sync exercises from Free Exercise DB
    const totalExercises = await syncExercisesFromFreeDB();

    // Step 4: Populate dim_exercises
    await populateDimExercises();

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log("\n" + "=".repeat(60));
    console.log("Sync completed successfully!");
    console.log(`  Total exercises in database: ${totalExercises}`);
    console.log(`  Time elapsed: ${elapsed}s`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\nSync failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
