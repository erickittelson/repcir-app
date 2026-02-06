/**
 * Inngest AI Workflow Functions
 *
 * Long-running AI operations that exceed Vercel's 10-minute timeout.
 * These run as background jobs with progress tracking.
 *
 * Benefits:
 * - No timeout limits (workouts can take 30-120s)
 * - Step-based execution with automatic retries
 * - Progress tracking and observability
 * - Rate limiting and concurrency control
 */

import { inngest } from "../client";
import { db, dbRead } from "@/lib/db";
import {
  circleMembers,
  memberEmbeddings,
  memberMetrics,
  goals,
  workoutSessions,
  personalRecords,
  memberLimitations,
  memberSkills,
  contextNotes,
  userProfiles,
  workoutPlans,
  workoutPlanExercises,
  exercises,
  circleEquipment,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { embed, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { aiModel } from "@/lib/ai";

/**
 * Generate Member Embeddings (Background)
 *
 * Generates vector embeddings for a member's profile, goals, workout history,
 * preferences, and limitations. Used for semantic search and personalization.
 *
 * This is an expensive operation (5 API calls) that can take 15-90 seconds.
 */
export const generateEmbeddingsFunction = inngest.createFunction(
  {
    id: "ai-generate-embeddings",
    name: "Generate Member Embeddings",
    retries: 2,
    concurrency: {
      limit: 5, // Max 5 concurrent embedding generations
    },
  },
  { event: "ai/generate-embeddings" },
  async ({ event, step, logger }) => {
    const { userId, circleId, memberId } = event.data;

    // Step 1: Verify member exists and belongs to circle
    const member = await step.run("verify-member", async () => {
      return db.query.circleMembers.findFirst({
        where: and(
          eq(circleMembers.id, memberId),
          eq(circleMembers.circleId, circleId)
        ),
      });
    });

    if (!member) {
      throw new Error(`Member ${memberId} not found in circle ${circleId}`);
    }

    // Step 2: Gather all member data
    const memberData = await step.run("gather-member-data", async () => {
      const [metrics, memberGoals, workouts, prs, limitations, skills, notes, profile] =
        await Promise.all([
          db.query.memberMetrics.findMany({
            where: eq(memberMetrics.memberId, memberId),
            orderBy: [desc(memberMetrics.date)],
            limit: 10,
          }),
          db.query.goals.findMany({
            where: eq(goals.memberId, memberId),
          }),
          db.query.workoutSessions.findMany({
            where: eq(workoutSessions.memberId, memberId),
            orderBy: [desc(workoutSessions.date)],
            limit: 20,
          }),
          db.query.personalRecords.findMany({
            where: eq(personalRecords.memberId, memberId),
            with: { exercise: true },
          }),
          db.query.memberLimitations.findMany({
            where: eq(memberLimitations.memberId, memberId),
          }),
          db.query.memberSkills.findMany({
            where: eq(memberSkills.memberId, memberId),
          }),
          db.query.contextNotes.findMany({
            where: eq(contextNotes.memberId, memberId),
            orderBy: [desc(contextNotes.createdAt)],
            limit: 30,
          }),
          member.userId
            ? db.query.userProfiles.findFirst({
                where: eq(userProfiles.userId, member.userId),
              })
            : null,
        ]);

      return { metrics, memberGoals, workouts, prs, limitations, skills, notes, profile };
    });

    // Step 3: Build embedding content
    // Note: step.run serializes data, so we build content directly from the returned data
    const embeddingsToCreate = await step.run("build-embedding-content", async () => {
      const { metrics, memberGoals, workouts, notes, limitations, profile } = memberData;
      const result: Array<{ type: string; content: string; metadata: Record<string, unknown> }> = [];

      // Profile embedding - pass member data directly instead of typed objects
      const profileContent = buildProfileContentFromData(
        { name: member.name, gender: member.gender, dateOfBirth: member.dateOfBirth },
        metrics[0],
        profile
      );
      result.push({
        type: "profile",
        content: profileContent,
        metadata: { memberId, updatedAt: new Date().toISOString() },
      });

      // Goals embedding
      if (memberGoals.length > 0) {
        result.push({
          type: "goals",
          content: buildGoalsContentFromData(memberGoals),
          metadata: { memberId, goalCount: memberGoals.length },
        });
      }

      // Workout history embedding
      if (workouts.length > 0) {
        result.push({
          type: "workout_history",
          content: buildWorkoutHistoryContentFromData(workouts),
          metadata: { memberId, workoutCount: workouts.length },
        });
      }

      // Preferences embedding
      if (notes.length > 0) {
        result.push({
          type: "preferences",
          content: buildPreferencesContentFromData(notes),
          metadata: { memberId, noteCount: notes.length },
        });
      }

      // Limitations embedding
      if (limitations.length > 0) {
        result.push({
          type: "limitations",
          content: buildLimitationsContentFromData(limitations),
          metadata: { memberId, limitationCount: limitations.length },
        });
      }

      return result;
    });

    // Step 4: Delete existing embeddings
    await step.run("delete-existing-embeddings", async () => {
      await db.delete(memberEmbeddings).where(eq(memberEmbeddings.memberId, memberId));
    });

    // Step 5: Generate and save embeddings (one at a time to manage rate limits)
    const savedEmbeddings: Array<{ type: string; id: string }> = [];

    for (let i = 0; i < embeddingsToCreate.length; i++) {
      const emb = embeddingsToCreate[i];

      const saved = await step.run(`generate-embedding-${emb.type}`, async () => {
        try {
          const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: emb.content,
          });

          const [result] = await db
            .insert(memberEmbeddings)
            .values({
              memberId,
              type: emb.type,
              content: emb.content,
              embedding,
              metadata: emb.metadata,
            })
            .returning({ id: memberEmbeddings.id });

          return { type: emb.type, id: result.id, success: true };
        } catch (err) {
          logger.error(`Failed to generate embedding for ${emb.type}`, { error: err });
          return { type: emb.type, id: "", success: false };
        }
      });

      if (saved.success) {
        savedEmbeddings.push({ type: saved.type, id: saved.id });
      }
    }

    logger.info("Embeddings generation completed", {
      memberId,
      generated: savedEmbeddings.length,
      total: embeddingsToCreate.length,
    });

    return {
      success: true,
      memberId,
      embeddings: savedEmbeddings,
      message: `Generated ${savedEmbeddings.length} embeddings for member`,
    };
  }
);

/**
 * Generate Milestones Function
 *
 * AI-powered milestone generation based on member goals.
 * Creates incremental progress markers with celebratory achievements.
 */
export const generateMilestonesFunction = inngest.createFunction(
  {
    id: "ai-generate-milestones",
    name: "Generate Goal Milestones",
    retries: 2,
    concurrency: {
      limit: 3,
    },
  },
  { event: "ai/generate-milestones" },
  async ({ event, step, logger }) => {
    const { userId, circleId, memberId, goalId } = event.data;

    // Step 1: Get member and goals
    const data = await step.run("fetch-member-goals", async () => {
      const member = await db.query.circleMembers.findFirst({
        where: and(
          eq(circleMembers.id, memberId),
          eq(circleMembers.circleId, circleId)
        ),
      });

      if (!member) {
        throw new Error("Member not found");
      }

      let memberGoals;
      if (goalId) {
        const goal = await db.query.goals.findFirst({
          where: and(eq(goals.id, goalId), eq(goals.memberId, memberId)),
        });
        memberGoals = goal ? [goal] : [];
      } else {
        memberGoals = await db.query.goals.findMany({
          where: and(eq(goals.memberId, memberId), eq(goals.status, "active")),
        });
      }

      return { member, goals: memberGoals };
    });

    if (data.goals.length === 0) {
      return { success: true, message: "No goals to generate milestones for" };
    }

    const milestoneSchema = z.object({
      milestones: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          targetValue: z.number().nullable(),
          targetDate: z.string().nullable(),
          celebrationMessage: z.string(),
          difficultyLevel: z.enum(["easy", "moderate", "challenging"]),
        })
      ),
    });

    // Step 2: Generate milestones for each goal
    const results: Array<{ goalId: string; milestones: number }> = [];

    for (const goal of data.goals) {
      const milestones = await step.run(`generate-milestones-${goal.id}`, async () => {
        const result = await generateObject({
          model: aiModel,
          schema: milestoneSchema,
          prompt: `Generate 3-5 incremental milestones for this fitness goal:

Goal: ${goal.title}
Category: ${goal.category}
Target: ${goal.targetValue} ${goal.targetUnit}
Current: ${goal.currentValue || 0} ${goal.targetUnit}
Target Date: ${goal.targetDate || "Not set"}

Requirements:
1. Milestones should be achievable steps toward the goal
2. Include celebration messages that are encouraging
3. Space them appropriately based on the target date
4. First milestone should be close to current progress
5. Final milestone should be at or near the goal

Member context: ${data.member.name}`,
        });

        return result.object.milestones;
      });

      results.push({ goalId: goal.id, milestones: milestones.length });

      logger.info("Generated milestones for goal", {
        goalId: goal.id,
        count: milestones.length,
      });
    }

    return {
      success: true,
      results,
      totalMilestones: results.reduce((sum, r) => sum + r.milestones, 0),
    };
  }
);

// Helper functions for building embedding content
// These use plain data types since Inngest serializes step results

interface MemberData {
  name: string;
  gender: string | null;
  dateOfBirth: Date | string | null;
}

interface MetricsData {
  weight: number | null;
  height: number | null;
  fitnessLevel: string | null;
  bodyFatPercentage: number | null;
}

interface ProfileData {
  birthMonth: number | null;
  birthYear: number | null;
  gender: string | null;
}

interface GoalData {
  status: string;
  title: string;
  category: string;
  targetValue: number | null;
  targetUnit: string | null;
  currentValue: number | null;
}

interface WorkoutData {
  status: string;
  name: string;
  date: Date | string;
  rating: number | null;
}

interface NoteData {
  mood: string | null;
  energyLevel: number | null;
  painLevel: number | null;
  tags: string[] | null;
  content: string | null;
}

interface LimitationData {
  active: boolean;
  type: string;
  description: string;
  severity: string | null;
  affectedAreas: string[] | null;
}

function buildProfileContentFromData(
  member: MemberData,
  metrics?: MetricsData,
  profile?: ProfileData | null
): string {
  let content = `Member Profile: ${member.name}`;

  let age: number | null = null;
  if (profile?.birthMonth && profile?.birthYear) {
    const today = new Date();
    age = today.getFullYear() - profile.birthYear;
    if (today.getMonth() + 1 < profile.birthMonth) age--;
  } else if (member.dateOfBirth) {
    const dob = typeof member.dateOfBirth === "string" ? new Date(member.dateOfBirth) : member.dateOfBirth;
    age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  if (age) content += `, ${age} years old`;
  const gender = profile?.gender || member.gender;
  if (gender) content += `, ${gender}`;

  if (metrics) {
    if (metrics.weight) content += `. Weight: ${metrics.weight} lbs`;
    if (metrics.height) {
      const feet = Math.floor(metrics.height / 12);
      const inches = metrics.height % 12;
      content += `. Height: ${feet}'${inches}"`;
    }
    if (metrics.fitnessLevel) content += `. Fitness level: ${metrics.fitnessLevel}`;
    if (metrics.bodyFatPercentage) content += `. Body fat: ${metrics.bodyFatPercentage}%`;
  }

  return content;
}

function buildGoalsContentFromData(goals: GoalData[]): string {
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  let content = `Fitness Goals:\nActive goals (${activeGoals.length}):\n`;
  activeGoals.forEach((g) => {
    content += `- ${g.title} (${g.category})`;
    if (g.targetValue && g.targetUnit) content += `: target ${g.targetValue} ${g.targetUnit}`;
    if (g.currentValue) content += `, current ${g.currentValue}`;
    content += "\n";
  });

  if (completedGoals.length > 0) {
    content += `\nCompleted goals (${completedGoals.length}):\n`;
    completedGoals.slice(0, 5).forEach((g) => {
      content += `- ${g.title} (${g.category})\n`;
    });
  }

  return content;
}

function buildWorkoutHistoryContentFromData(workouts: WorkoutData[]): string {
  const completed = workouts.filter((w) => w.status === "completed");
  const avgRating =
    completed.filter((w) => w.rating).reduce((sum, w) => sum + (w.rating || 0), 0) /
    (completed.filter((w) => w.rating).length || 1);

  let content = `Workout History:\nTotal sessions: ${completed.length}\n`;
  content += `Average rating: ${avgRating.toFixed(1)}/5\n\nRecent workouts:\n`;

  completed.slice(0, 10).forEach((w) => {
    const dateStr = typeof w.date === "string" ? new Date(w.date).toLocaleDateString() : w.date.toLocaleDateString();
    content += `- ${w.name} (${dateStr})`;
    if (w.rating) content += ` - Rating: ${w.rating}/5`;
    content += "\n";
  });

  return content;
}

function buildPreferencesContentFromData(notes: NoteData[]): string {
  const moods = notes.filter((n) => n.mood).map((n) => n.mood as string);
  const energyLevels = notes
    .filter((n) => n.energyLevel !== null)
    .map((n) => n.energyLevel as number);
  const painNotes = notes.filter((n) => n.painLevel && n.painLevel > 0);
  const allTags = notes.flatMap((n) => n.tags || []);

  let content = `User Preferences and Feedback:\n`;

  if (moods.length > 0) {
    const moodCounts: Record<string, number> = {};
    moods.forEach((m) => (moodCounts[m] = (moodCounts[m] || 0) + 1));
    content += `Common moods: ${Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m]) => m)
      .join(", ")}\n`;
  }

  if (energyLevels.length > 0) {
    const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
    content += `Average energy level: ${avgEnergy.toFixed(1)}/5\n`;
  }

  if (painNotes.length > 0) {
    const avgPain = painNotes.reduce((a, n) => a + (n.painLevel || 0), 0) / painNotes.length;
    content += `Reports pain in ${painNotes.length} entries, avg: ${avgPain.toFixed(1)}/10\n`;
  }

  if (allTags.length > 0) {
    const tagCounts: Record<string, number> = {};
    allTags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1));
    content += `Common themes: ${Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t)
      .join(", ")}\n`;
  }

  const recentNotes = notes.filter((n) => n.content).slice(0, 5);
  if (recentNotes.length > 0) {
    content += `\nRecent notes:\n`;
    recentNotes.forEach((n) => {
      content += `- "${n.content}"\n`;
    });
  }

  return content;
}

function buildLimitationsContentFromData(limitations: LimitationData[]): string {
  const active = limitations.filter((l) => l.active);

  let content = `Physical Limitations and Injuries:\n`;

  active.forEach((l) => {
    content += `- ${l.type}: ${l.description}`;
    if (l.severity) content += ` (Severity: ${l.severity})`;
    if (l.affectedAreas) content += ` - Affects: ${l.affectedAreas.join(", ")}`;
    content += "\n";
  });

  const resolved = limitations.filter((l) => !l.active);
  if (resolved.length > 0) {
    content += `\nResolved issues: ${resolved.map((l) => l.type).join(", ")}`;
  }

  return content;
}

/**
 * Export all AI functions for registration
 */
export const aiFunctions = [generateEmbeddingsFunction, generateMilestonesFunction];
