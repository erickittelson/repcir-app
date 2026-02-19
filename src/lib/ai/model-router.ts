/**
 * AI Model Router
 *
 * Routes AI requests to the appropriate model based on subscription tier.
 * Implements the "first 3 on Pro" taste mechanic for free users.
 *
 * Model tiers:
 * - Free: gpt-5.2-chat-latest (fast, cheap)
 * - Plus: gpt-5.2 (standard generation)
 * - Pro+: gpt-5.2-pro (full reasoning)
 *
 * "First 3 on Pro" mechanic:
 * - Free users' first 3 AI workouts use gpt-5.2 (Pro-quality)
 * - After that, they drop to gpt-5.2-chat-latest
 * - The quality difference is noticeable and drives upgrade intent
 */

import { AI_MODELS } from "./config";
import { db } from "@/lib/db";
import { aiQuotas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PlanTier } from "@/lib/billing/types";

type AITask = "workout_generation" | "chat" | "analysis" | "embedding";

interface ModelSelection {
  model: string;
  isProTaste: boolean;
  tier: PlanTier;
}

const FIRST_N_PRO_TASTE = 3;

/**
 * Select the appropriate AI model for a task based on user's tier.
 */
export async function selectModel(
  userId: string,
  tier: PlanTier,
  task: AITask
): Promise<ModelSelection> {
  // Pro and above always get the best model
  if (tier === "pro" || tier === "leader" || tier === "team") {
    return {
      model: task === "chat" ? AI_MODELS.primary : AI_MODELS.pro,
      isProTaste: false,
      tier,
    };
  }

  // Plus gets standard model
  if (tier === "plus") {
    return {
      model: task === "chat" ? AI_MODELS.primary : AI_MODELS.primary,
      isProTaste: false,
      tier,
    };
  }

  // Free tier: check for "first 3 on Pro" taste mechanic
  if (task === "workout_generation") {
    const quota = await db.query.aiQuotas.findFirst({
      where: eq(aiQuotas.userId, userId),
      columns: { currentWorkoutCount: true },
    });

    const workoutsUsed = quota?.currentWorkoutCount ?? 0;

    if (workoutsUsed < FIRST_N_PRO_TASTE) {
      return {
        model: AI_MODELS.primary,
        isProTaste: true,
        tier,
      };
    }
  }

  // Free tier default: fast model
  return {
    model: AI_MODELS.fast,
    isProTaste: false,
    tier,
  };
}

/**
 * Get the model label for display purposes (e.g., in usage banners).
 */
export function getModelLabel(model: string): string {
  if (model === AI_MODELS.pro) return "Pro";
  if (model === AI_MODELS.primary) return "Standard";
  if (model === AI_MODELS.fast) return "Fast";
  return "Standard";
}
