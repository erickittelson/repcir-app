/**
 * Inngest Background Workout Generation
 *
 * Handles background workout generation with:
 * - Job status tracking via aiGenerationJobs table
 * - Circle goals integration
 * - Gender-Rx weight calculation for large groups (>3 members)
 * - Workout type/structure support
 * - Multi-step reasoning for complex workouts
 * - Backward compatibility with existing callers
 */

import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  workoutPlans,
  workoutPlanExercises,
  exercises,
  aiGenerationJobs,
  circleGoals,
  circleMembers,
  userLocations,
} from "@/lib/db/schema";
import { eq, ilike, and, or, inArray, sql } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { aiModel, aiModelPro, getTaskOptions } from "@/lib/ai";
import { getFastMemberContext, contextToPrompt } from "@/lib/ai/fast-context";
import {
  getProgrammingRulesForPrompt,
  getExerciseCountForDuration,
  getWorkoutStructureForPrompt,
} from "@/lib/ai/schemas/loader";
import { trackAIUsage } from "@/lib/ai/usage-tracking";
import { calculateGenderRx, shouldUseGenderRx } from "@/lib/ai/rx-weights";
import { PERCENT_OF_MAX, INDIVIDUAL_RX_THRESHOLD } from "@/lib/workout-contract";

/**
 * Match an AI-generated exercise name to an existing exercise in the database.
 * Uses multi-step fuzzy matching to handle AI's tendency to add parenthetical
 * qualifiers (e.g., "Barbell Hip Thrust (bench)" → "Barbell Hip Thrust").
 * Prefers exercises that have images/descriptions (i.e., from the seed library).
 */
async function matchExerciseToDb(aiName: string): Promise<{ id: string; name: string } | null> {
  // Helper: pick the best match from candidates, preferring library entries (with images)
  function pickBest(candidates: { id: string; name: string; imageUrl: string | null }[]): { id: string; name: string } {
    const withImage = candidates.find((c) => c.imageUrl);
    const best = withImage || candidates[0];
    return { id: best.id, name: best.name };
  }

  // Helper: check if ANY candidate has an image (i.e., is a rich library entry)
  function hasRichCandidate(candidates: { imageUrl: string | null }[]): boolean {
    return candidates.some((c) => c.imageUrl);
  }

  const stripped = aiName.replace(/\s*\([^)]*\)/g, "").trim();

  // Build all name variants to search for
  const withoutPrefix = stripped
    .replace(/^(barbell|dumbbell|db|bb|cable|machine|smith machine|seated|standing|incline|decline)\s+/i, "")
    .trim();

  // Collect all variants (deduplicated)
  const variants = [...new Set([aiName, stripped, withoutPrefix].filter(Boolean))];

  // 1. Find ALL exact matches across all name variants, then pick the best one
  const exactCandidates = await db
    .select({ id: exercises.id, name: exercises.name, imageUrl: exercises.imageUrl })
    .from(exercises)
    .where(
      or(...variants.map((v) => ilike(exercises.name, v)))
    )
    .limit(20);

  // Only return exact match if we found a rich library entry; otherwise keep looking
  if (exactCandidates.length > 0 && hasRichCandidate(exactCandidates)) {
    return pickBest(exactCandidates);
  }

  // 2. Partial/fuzzy match — DB name contained in AI name or vice versa
  const searchTerm = stripped.length >= 4 ? stripped : aiName;
  const partialCandidates = await db
    .select({ id: exercises.id, name: exercises.name, imageUrl: exercises.imageUrl })
    .from(exercises)
    .where(
      or(
        sql`${exercises.name} ILIKE ${"%" + searchTerm + "%"}`,
        sql`${searchTerm} ILIKE '%' || ${exercises.name} || '%'`
      )
    )
    .limit(20);

  if (partialCandidates.length > 0 && hasRichCandidate(partialCandidates)) {
    return pickBest(partialCandidates);
  }

  // 3. Last resort — try the prefix-stripped name as partial match
  if (withoutPrefix && withoutPrefix !== searchTerm && withoutPrefix.length >= 4) {
    const lastResort = await db
      .select({ id: exercises.id, name: exercises.name, imageUrl: exercises.imageUrl })
      .from(exercises)
      .where(
        or(
          sql`${exercises.name} ILIKE ${"%" + withoutPrefix + "%"}`,
          sql`${withoutPrefix} ILIKE '%' || ${exercises.name} || '%'`
        )
      )
      .limit(20);

    if (lastResort.length > 0 && hasRichCandidate(lastResort)) {
      return pickBest(lastResort);
    }
  }

  // 4. Keyword match — search by the most distinctive word(s)
  //    Handles cases like "Farmer Carry" → "Farmer's Walk" where exact/partial fail
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
    // Search for exercises matching the most distinctive keyword
    const keywordConditions = keywords.map((kw) => sql`${exercises.name} ILIKE ${"%" + kw + "%"}`);
    const keywordCandidates = await db
      .select({ id: exercises.id, name: exercises.name, imageUrl: exercises.imageUrl })
      .from(exercises)
      .where(or(...keywordConditions))
      .limit(30);

    if (keywordCandidates.length > 0 && hasRichCandidate(keywordCandidates)) {
      return pickBest(keywordCandidates);
    }
  }

  // 5. Fall back to sparse exact match if we had one (better than creating a duplicate)
  if (exactCandidates.length > 0) {
    return pickBest(exactCandidates);
  }

  // Also check if partial or last-resort had any candidates at all
  if (partialCandidates.length > 0) {
    return pickBest(partialCandidates);
  }

  return null;
}

const workoutSchema = z.object({
  name: z.string(),
  description: z.string(),
  targetAudience: z.string(),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.string(),
      restSeconds: z.number(),
      notes: z.string().nullable(),
      muscleGroups: z.array(z.string()),
      supersetGroup: z.number().nullable(),
      structureType: z.string().nullable(),
      memberPrescriptions: z
        .array(
          z.object({
            memberName: z.string(),
            weight: z.string().nullable(),
            rpeTarget: z.number().nullable(),
            bodyweightMod: z.string().nullable(),
            cardioTarget: z.string().nullable(),
            memberNotes: z.string().nullable(),
          })
        )
        .nullable(),
    })
  ),
  warmup: z.array(z.string()).nullable(),
  cooldown: z.array(z.string()).nullable(),
  estimatedDuration: z.number(),
  difficulty: z.string(),
  structure: z.string().nullable(),
  focusAreas: z.array(z.string()),
  coachingNotes: z.string().nullable(),
});

export const generateWorkoutBackground = inngest.createFunction(
  {
    id: "ai-generate-workout-background",
    name: "Background AI Workout Generation",
    retries: 1,
    concurrency: { limit: 5 },
  },
  { event: "ai/generate-workout" },
  async ({ event, step }) => {
    const { userId, circleId, memberIds, jobId, options } = event.data;
    const useGenderRx = shouldUseGenderRx(memberIds.length);

    // Step 0: Mark job as generating (if tracking)
    if (jobId) {
      await step.run("mark-generating", async () => {
        await db
          .update(aiGenerationJobs)
          .set({ status: "generating", startedAt: new Date() })
          .where(eq(aiGenerationJobs.id, jobId));
      });
    }

    try {
      // Step 1: Gather context (members, circle goals, location equipment)
      const contextData = await step.run("gather-context", async () => {
        const memberContexts = await Promise.all(
          memberIds.map((id) => getFastMemberContext(id))
        );

        // Fetch circle goals if requested
        let circleGoalsList: Array<{ title: string; category: string; priority: number }> = [];
        if (options.circleGoalIds && options.circleGoalIds.length > 0) {
          const goals = await db
            .select({ title: circleGoals.title, category: circleGoals.category, priority: circleGoals.priority })
            .from(circleGoals)
            .where(and(
              eq(circleGoals.circleId, circleId),
              inArray(circleGoals.id, options.circleGoalIds),
              eq(circleGoals.status, "active")
            ));
          circleGoalsList = goals;
        }

        // Fetch location equipment if specified
        let locationEquipment: string[] = [];
        if (options.locationId) {
          const location = await db.query.userLocations.findFirst({
            where: eq(userLocations.id, options.locationId),
          });
          if (location?.equipment) {
            locationEquipment = (location.equipment as string[]) || [];
          }
        }

        // Fetch member genders for Rx calculation
        let memberGenders: Record<string, string> = options.memberGenders || {};
        if (useGenderRx && Object.keys(memberGenders).length === 0) {
          const members = await db
            .select({ id: circleMembers.id, gender: circleMembers.gender })
            .from(circleMembers)
            .where(inArray(circleMembers.id, memberIds));
          for (const m of members) {
            if (m.gender) memberGenders[m.id] = m.gender;
          }
        }

        // Fetch exercise library names so the AI uses canonical names
        const libraryExercises = await db
          .select({ name: exercises.name, category: exercises.category })
          .from(exercises)
          .where(eq(exercises.isCustom, false));

        return {
          memberContexts,
          circleGoalsList,
          locationEquipment,
          memberGenders,
          libraryExercises,
        };
      });

      // Step 2: Build prompt
      const prompt = await step.run("build-prompt", async () => {
        const memberContextStr = contextData.memberContexts
          .filter((ctx): ctx is NonNullable<typeof ctx> => ctx !== null)
          .map((ctx) => contextToPrompt(ctx as any))
          .join("\n\n---\n\n");

        const {
          focus = "full_body",
          intensity = "moderate",
          targetDuration = 45,
          includeWarmup = true,
          includeCooldown = true,
          trainingGoal,
          reasoningLevel = "deep",
          workoutType,
          workoutSections,
        } = options;

        const { min: recommendedExercises, max: maxExercises } =
          getExerciseCountForDuration(targetDuration);

        const programmingRules = getProgrammingRulesForPrompt();

        // Build workout structure instructions
        let structureInstructions = "";
        if (workoutSections && workoutSections.length > 1) {
          // Multi-section workout
          structureInstructions = "\n## Workout Structure (Multi-Section)\n";
          structureInstructions += "This workout has multiple sections. Generate exercises for each section in order.\n";
          for (const section of workoutSections) {
            const sectionLabel = section.label || section.workoutType.toUpperCase();
            structureInstructions += `\n### Section ${section.order + 1}: ${sectionLabel}\n`;
            if (section.workoutType !== "standard") {
              try {
                structureInstructions += `${getWorkoutStructureForPrompt(section.workoutType)}\n`;
              } catch {
                structureInstructions += `Generate a ${section.workoutType}-style section.\n`;
              }
            } else {
              structureInstructions += "Standard sets and reps format.\n";
            }
          }
        } else if (workoutType && workoutType !== "standard") {
          // Single non-standard type (backward compat)
          try {
            structureInstructions = `\n## Workout Structure: ${workoutType.toUpperCase()}\n${getWorkoutStructureForPrompt(workoutType)}\n`;
          } catch {
            structureInstructions = `\n## Workout Structure: ${workoutType.toUpperCase()}\nGenerate a ${workoutType}-style workout.\n`;
          }
        }

        // Build circle goals section
        let circleGoalsSection = "";
        if (contextData.circleGoalsList.length > 0) {
          const goalsStr = contextData.circleGoalsList
            .sort((a, b) => b.priority - a.priority)
            .map((g) => `- Priority ${g.priority}: ${g.title} (${g.category})`)
            .join("\n");
          circleGoalsSection = `\n## Circle Goals (weight exercises toward these)\n${goalsStr}\n`;
        }

        // Build equipment section
        let equipmentSection = "";
        if (contextData.locationEquipment.length > 0) {
          equipmentSection = `\n## Available Equipment\n${contextData.locationEquipment.join(", ")}\nOnly use exercises that can be done with the available equipment.\n`;
        }

        // Build weight prescription instructions from contract
        const { strength, hypertrophy, endurance } = PERCENT_OF_MAX;
        let rxInstructions = "";
        if (useGenderRx) {
          rxInstructions = `\n## Weight Prescription Format (Group of ${memberIds.length} members)\nSince this is a large group (>${INDIVIDUAL_RX_THRESHOLD} members), use gender-based Rx weights instead of individual prescriptions.\nFor weighted exercises, suggest standard CrossFit-style weights appropriate for the movement.\nThe system will calculate specific Rx weights post-generation based on member PRs.\n`;
        } else {
          rxInstructions = `\n## Individual Weight Prescription\nFor each member, prescribe specific weights in memberPrescriptions based on their Personal Records listed above.\n- For exercises matching a known PR, calculate the working weight as a percentage of their max:\n  - Strength/heavy sets (${strength.reps[0]}-${strength.reps[1]} reps): ${strength.percent[0]}-${strength.percent[1]}% of 1RM\n  - Hypertrophy sets (${hypertrophy.reps[0]}-${hypertrophy.reps[1]} reps): ${hypertrophy.percent[0]}-${hypertrophy.percent[1]}% of 1RM\n  - Endurance/high-rep sets (${endurance.reps[0]}+ reps): ${endurance.percent[0]}-${endurance.percent[1]}% of 1RM\n- For exercises without a direct PR, estimate based on related lifts (e.g., incline press ~80% of bench max).\n- If a member has no relevant PRs, set weight to null and add a note like "start light, find working weight".\n- Include rpeTarget (6-10) to guide effort level.\n- For bodyweight exercises, use bodyweightMod (e.g., "add 25lb vest", "band-assisted", "unweighted").\n- For cardio, use cardioTarget (e.g., "8:00/mile pace", "150 BPM").\n`;
        }

        return {
          contextPrompt: `${programmingRules}
${structureInstructions}
## Member Context
${memberContextStr}
${circleGoalsSection}${equipmentSection}${rxInstructions}
## Workout Requirements
- Focus: ${focus}
- Intensity: ${intensity}
- Target Duration: ${targetDuration} minutes
- Include Warmup: ${includeWarmup}
- Include Cooldown: ${includeCooldown}
${workoutType ? `- Workout Type: ${workoutType}` : ""}
${trainingGoal ? `- Training Goal: ${trainingGoal}` : ""}

## Exercise Naming Rules
- You MUST use exercise names from our database. We have ${contextData.libraryExercises.length} exercises.
- Use simple, canonical exercise names WITHOUT parenthetical qualifiers.
- GOOD: "Barbell Hip Thrust", "Romanian Deadlift", "Pallof Press", "Farmer's Walk"
- BAD: "Barbell Hip Thrust (bench)", "Romanian Deadlift (barbell)", "Farmer Carry"
- Do NOT add equipment/variation hints in parentheses — put those in the notes field instead.
- Use the EXACT name from our database when possible (e.g., "Farmer's Walk" not "Farmer Carry", "Barbell Squat" not "Back Squat").
- Categories in our database: ${[...new Set(contextData.libraryExercises.map((e) => e.category))].join(", ")}
- Key exercises: Barbell Squat, Barbell Deadlift, Barbell Bench Press, Overhead Press, Barbell Row, Pull-up, Dips - Chest Version, Dips - Triceps Version, Barbell Lunge, Romanian Deadlift, Barbell Hip Thrust, Farmer's Walk, Kettlebell Swing, Box Jump, Plank, Dead Bug, Pallof Press, Cable Russian Twists, Mountain Climbers, Goblet Squat, Trap Bar Deadlift, Front Squat (Clean Grip), Sumo Deadlift, Power Clean, Thruster

Generate a comprehensive, personalized workout plan.
You MUST generate at least ${recommendedExercises} exercises (ideally ${recommendedExercises}-${maxExercises}).`,
          recommendedExercises,
          maxExercises,
          targetDuration,
          reasoningLevel,
          workoutType,
        };
      });

      // Step 3: Generate workout via AI
      const generationResult = await step.run("generate-workout", async () => {
        const model = prompt.reasoningLevel === "max" ? aiModelPro : aiModel;

        const result = await generateObject({
          model,
          schema: workoutSchema,
          prompt: prompt.contextPrompt,
          providerOptions: getTaskOptions("personalized_workout") as any,
        });

        return {
          workout: result.object,
          usage: {
            inputTokens: result.usage?.inputTokens ?? 0,
            outputTokens: result.usage?.outputTokens ?? 0,
            totalTokens: result.usage?.totalTokens ?? 0,
            cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
          },
        };
      });
      const workout = generationResult.workout;
      const aiUsage = generationResult.usage;

      // Step 4: Post-process Rx weights for large groups
      const rxWeightsMap = await step.run("calculate-rx-weights", async () => {
        if (!useGenderRx) return null;

        // Build member PR data for Rx calculation
        const memberPRData = contextData.memberContexts
          .filter((ctx): ctx is NonNullable<typeof ctx> => ctx !== null)
          .map((ctx) => ({
            id: (ctx as any).memberId || "",
            name: (ctx as any).memberName || "",
            gender: contextData.memberGenders[(ctx as any).memberId] || null,
            personalRecords: ((ctx as any).personalRecords || []).map((pr: any) => ({
              exerciseName: pr.exerciseName || pr.exercise || "",
              value: pr.value || 0,
              unit: pr.unit || "lbs",
              repMax: pr.repMax || 1,
            })),
          }));

        const rxMap: Record<string, { rxMen?: string; rxWomen?: string; calculation?: string }> = {};
        for (const ex of workout.exercises) {
          const rx = calculateGenderRx(ex.name, memberPRData, options.intensity || "moderate");
          rxMap[ex.name] = { rxMen: rx.rxMen || undefined, rxWomen: rx.rxWomen || undefined, calculation: rx.calculation };
        }
        return rxMap;
      });

      // Step 5: Save to database
      const planId = await step.run("save-plan", async () => {
        const [plan] = await db
          .insert(workoutPlans)
          .values({
            circleId,
            name: workout.name,
            description: workout.description,
            difficulty: workout.difficulty,
            estimatedDuration: workout.estimatedDuration,
            structureType: prompt.workoutType || null,
            aiGenerated: true,
            isDraft: true,
          })
          .returning({ id: workoutPlans.id });

        // Match exercises to existing ones (fuzzy) or create
        for (let i = 0; i < workout.exercises.length; i++) {
          const ex = workout.exercises[i];

          let exerciseId: string | null = null;
          const matched = await matchExerciseToDb(ex.name);

          if (matched) {
            exerciseId = matched.id;
          } else {
            const [created] = await db
              .insert(exercises)
              .values({
                name: ex.name,
                muscleGroups: ex.muscleGroups,
                category: "compound",
                isCustom: true,
              })
              .returning({ id: exercises.id });
            exerciseId = created.id;
          }

          await db.insert(workoutPlanExercises).values({
            planId: plan.id,
            exerciseId,
            order: i,
            sets: ex.sets,
            reps: ex.reps,
            restBetweenSets: ex.restSeconds,
            notes: ex.notes,
            groupId: ex.supersetGroup != null ? `S${ex.supersetGroup}` : null,
            groupType: ex.supersetGroup != null ? "superset" : null,
            rxWeights: rxWeightsMap?.[ex.name] || null,
          });
        }

        return plan.id;
      });

      // Step 6: Mark job complete (if tracking)
      if (jobId) {
        await step.run("mark-complete", async () => {
          await db
            .update(aiGenerationJobs)
            .set({
              status: "complete",
              completedAt: new Date(),
              resultPlanId: planId,
              resultData: {
                name: workout.name,
                description: workout.description,
                exerciseCount: workout.exercises.length,
                estimatedDuration: workout.estimatedDuration,
                difficulty: workout.difficulty,
                structure: workout.structure,
                warmup: workout.warmup,
                cooldown: workout.cooldown,
                exercises: workout.exercises,
              },
            })
            .where(eq(aiGenerationJobs.id, jobId));
        });
      }

      // Step 7: Track usage
      await step.run("track-usage", async () => {
        await trackAIUsage({
          userId,
          endpoint: "ai/generate-workout/background",
          feature: "workout_generation",
          modelUsed: prompt.reasoningLevel === "max" ? "gpt-5.2-pro" : "gpt-5.2",
          reasoningLevel: prompt.reasoningLevel,
          inputTokens: aiUsage.inputTokens,
          outputTokens: aiUsage.outputTokens,
          cachedTokens: aiUsage.cachedTokens,
          cacheHit: aiUsage.cachedTokens > 0,
          metadata: {
            exerciseCount: workout.exercises.length,
            duration: workout.estimatedDuration,
            totalTokens: aiUsage.totalTokens,
            background: true,
            chatTriggered: options.chatTriggered || false,
            workoutType: prompt.workoutType || "standard",
            useGenderRx,
          },
        });
      });

      return {
        success: true,
        planId,
        workout: {
          name: workout.name,
          description: workout.description,
          exerciseCount: workout.exercises.length,
          estimatedDuration: workout.estimatedDuration,
        },
      };
    } catch (error) {
      // Mark job as failed if tracking
      if (jobId) {
        await db
          .update(aiGenerationJobs)
          .set({
            status: "error",
            completedAt: new Date(),
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(aiGenerationJobs.id, jobId));
      }
      throw error; // Re-throw for Inngest retry handling
    }
  }
);

export const backgroundWorkoutFunctions = [generateWorkoutBackground];
