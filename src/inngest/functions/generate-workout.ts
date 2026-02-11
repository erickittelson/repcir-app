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
import { eq, ilike, and, inArray } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { aiModel, aiModelPro } from "@/lib/ai";
import { getFastMemberContext, contextToPrompt } from "@/lib/ai/fast-context";
import {
  getProgrammingRulesForPrompt,
  getExerciseCountForDuration,
  getWorkoutStructureForPrompt,
} from "@/lib/ai/schemas/loader";
import { trackAIUsage } from "@/lib/ai/usage-tracking";
import { calculateGenderRx, shouldUseGenderRx } from "@/lib/ai/rx-weights";

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

        return {
          memberContexts,
          circleGoalsList,
          locationEquipment,
          memberGenders,
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

        // Build Rx weight instructions for large groups
        let rxInstructions = "";
        if (useGenderRx) {
          rxInstructions = `\n## Weight Prescription Format (Group of ${memberIds.length} members)\nSince this is a large group, use gender-based Rx weights instead of individual prescriptions.\nFor weighted exercises, suggest standard CrossFit-style weights appropriate for the movement.\nThe system will calculate specific Rx weights post-generation based on member PRs.\n`;
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
      const workout = await step.run("generate-workout", async () => {
        const model = prompt.reasoningLevel === "max" ? aiModelPro : aiModel;

        const result = await generateObject({
          model,
          schema: workoutSchema,
          prompt: prompt.contextPrompt,
        });

        return result.object;
      });

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
          })
          .returning({ id: workoutPlans.id });

        // Match exercises to existing ones or create
        for (let i = 0; i < workout.exercises.length; i++) {
          const ex = workout.exercises[i];

          let exerciseId: string | null = null;
          const existing = await db.query.exercises.findFirst({
            where: ilike(exercises.name, ex.name),
          });

          if (existing) {
            exerciseId = existing.id;
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
          modelUsed: prompt.reasoningLevel === "max" ? "gpt-5.2-pro" : "gpt-5.2",
          reasoningLevel: prompt.reasoningLevel,
          inputTokens: 0,
          outputTokens: 0,
          metadata: {
            exerciseCount: workout.exercises.length,
            duration: workout.estimatedDuration,
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
