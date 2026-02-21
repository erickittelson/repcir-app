/**
 * Orphan Custom Exercise Cleanup
 *
 * Weekly cron job that finds sparse custom exercises (no image, no description)
 * and fuzzy-matches them against the rich exercise library. When a match is
 * found, all references are re-pointed to the library entry and the orphan
 * is deleted.
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  exercises,
  personalRecords,
  workoutPlanExercises,
  workoutSessionExercises,
} from "@/lib/db/schema";
import { eq, and, isNull, ne, ilike, sql } from "drizzle-orm";

/**
 * Find a library match for an orphan exercise name.
 * Only matches against rich library entries (isCustom=false, has imageUrl).
 */
async function matchOrphanToLibrary(
  orphanName: string,
  orphanId: string
): Promise<{ id: string; name: string } | null> {
  const stripped = orphanName.replace(/\s*\(.*?\)\s*/g, "").trim();

  // Step 1: Exact name match (case-insensitive)
  const exactMatch = await db.query.exercises.findFirst({
    where: and(
      ilike(exercises.name, stripped),
      eq(exercises.isCustom, false),
      ne(exercises.id, orphanId),
      sql`${exercises.imageUrl} IS NOT NULL`
    ),
    columns: { id: true, name: true },
  });
  if (exactMatch) return exactMatch;

  // Step 2: Partial/contains match — library name contained in orphan name or vice versa
  const partialMatches = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(
      and(
        eq(exercises.isCustom, false),
        ne(exercises.id, orphanId),
        sql`${exercises.imageUrl} IS NOT NULL`,
        sql`(
          ${exercises.name} ILIKE '%' || ${stripped} || '%'
          OR ${stripped} ILIKE '%' || ${exercises.name} || '%'
        )`
      )
    )
    .limit(5);

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  // Step 3: Check synonyms — does any library exercise list this name as a synonym?
  const synonymMatch = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(
      and(
        eq(exercises.isCustom, false),
        ne(exercises.id, orphanId),
        sql`${exercises.imageUrl} IS NOT NULL`,
        sql`${exercises.synonyms}::jsonb @> ${JSON.stringify([stripped])}::jsonb`
      )
    )
    .limit(1);

  if (synonymMatch.length > 0) {
    return synonymMatch[0];
  }

  // Step 4: Keyword-based search for distinctive words
  const stopWords = new Set([
    "the", "a", "an", "with", "and", "or", "for", "to", "in", "on", "of",
    "barbell", "dumbbell", "db", "bb", "cable", "machine", "seated", "standing",
    "incline", "decline", "smith", "band", "kettlebell", "kb",
  ]);
  const keywords = stripped
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (keywords.length > 0) {
    // Search for exercises matching ALL keywords
    const keywordConditions = keywords.map(
      (kw) => sql`${exercises.name} ILIKE '%' || ${kw} || '%'`
    );

    const keywordMatches = await db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(
        and(
          eq(exercises.isCustom, false),
          ne(exercises.id, orphanId),
          sql`${exercises.imageUrl} IS NOT NULL`,
          ...keywordConditions
        )
      )
      .limit(3);

    if (keywordMatches.length === 1) {
      return keywordMatches[0];
    }
  }

  // No confident match found
  return null;
}

/**
 * Re-point all references from one exercise to another, then delete the orphan.
 * Handles PR collisions by keeping the higher value.
 */
async function mergeExerciseReferences(
  fromId: string,
  toId: string
): Promise<void> {
  // Use a transaction for atomicity
  await db.transaction(async (tx) => {
    // 1. Handle personal records — check for collisions
    const orphanPRs = await tx
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.exerciseId, fromId));

    for (const pr of orphanPRs) {
      // Check if target exercise already has a PR for this member + repMax
      const existingPR = await tx.query.personalRecords.findFirst({
        where: and(
          eq(personalRecords.exerciseId, toId),
          eq(personalRecords.memberId, pr.memberId),
          eq(personalRecords.repMax, pr.repMax ?? 1)
        ),
      });

      if (existingPR) {
        if (pr.value > existingPR.value) {
          // Orphan PR is higher — update the existing one
          await tx
            .update(personalRecords)
            .set({ value: pr.value, date: pr.date, notes: pr.notes })
            .where(eq(personalRecords.id, existingPR.id));
        }
        // Delete the orphan PR (either way)
        await tx
          .delete(personalRecords)
          .where(eq(personalRecords.id, pr.id));
      } else {
        // No collision — just re-point
        await tx
          .update(personalRecords)
          .set({ exerciseId: toId })
          .where(eq(personalRecords.id, pr.id));
      }
    }

    // 2. Re-point workout plan exercises
    await tx
      .update(workoutPlanExercises)
      .set({ exerciseId: toId })
      .where(eq(workoutPlanExercises.exerciseId, fromId));

    // 3. Re-point workout session exercises
    await tx
      .update(workoutSessionExercises)
      .set({ exerciseId: toId })
      .where(eq(workoutSessionExercises.exerciseId, fromId));

    // 4. Delete the orphan exercise
    await tx
      .delete(exercises)
      .where(eq(exercises.id, fromId));
  });
}

export const orphanExerciseCleanupCron = inngest.createFunction(
  {
    id: "cron-orphan-exercise-cleanup",
    name: "Orphan Custom Exercise Cleanup",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 5 * * 0" }, // Sunday 5 AM
  async ({ step, logger }) => {
    // Step 1: Find all sparse custom exercises
    const orphans = await step.run("find-orphans", async () => {
      return db
        .select({ id: exercises.id, name: exercises.name })
        .from(exercises)
        .where(
          and(
            eq(exercises.isCustom, true),
            isNull(exercises.imageUrl),
            isNull(exercises.description)
          )
        );
    });

    if (orphans.length === 0) {
      logger.info("No orphan exercises found");
      return { success: true, merged: 0, skipped: 0, totalOrphans: 0 };
    }

    logger.info("Found orphan exercises", { count: orphans.length });

    let merged = 0;
    let skipped = 0;

    // Step 2: Process in batches of 5
    for (let i = 0; i < orphans.length; i += 5) {
      const batch = orphans.slice(i, i + 5);

      await step.run(`cleanup-batch-${i}`, async () => {
        for (const orphan of batch) {
          try {
            const match = await matchOrphanToLibrary(orphan.name, orphan.id);
            if (match) {
              await mergeExerciseReferences(orphan.id, match.id);
              logger.info("Merged orphan exercise", {
                orphan: orphan.name,
                mergedTo: match.name,
              });
              merged++;
            } else {
              skipped++;
            }
          } catch (error) {
            logger.warn("Failed to process orphan", {
              orphan: orphan.name,
              error: (error as Error).message,
            });
            skipped++;
          }
        }
      });

      // Rate limit between batches
      if (i + 5 < orphans.length) {
        await step.sleep("rate-limit", "5s");
      }
    }

    logger.info("Orphan cleanup completed", { merged, skipped, total: orphans.length });

    return { success: true, merged, skipped, totalOrphans: orphans.length };
  }
);

export const exerciseCleanupFunctions = [orphanExerciseCleanupCron];
