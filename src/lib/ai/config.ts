/**
 * AI Configuration
 *
 * Centralized configuration for AI models, timeouts, caching, and pricing.
 * Values can be overridden via environment variables.
 */

// =============================================================================
// MODEL CONFIGURATION
// =============================================================================

/**
 * AI model identifiers
 * Override via environment variables for A/B testing or model updates
 */
export const AI_MODELS = {
  /** Main model for complex tasks */
  primary: process.env.AI_MODEL_PRIMARY || "gpt-5.2",
  /** Pro model for advanced reasoning */
  pro: process.env.AI_MODEL_PRO || "gpt-5.2-pro",
  /** Fast model for chat and quick responses */
  fast: process.env.AI_MODEL_FAST || "gpt-5.2-chat-latest",
} as const;

// =============================================================================
// TIMEOUT CONFIGURATION
// =============================================================================

/**
 * Timeouts in milliseconds for different reasoning levels
 * Override via AI_TIMEOUT_* environment variables
 */
export const AI_TIMEOUTS = {
  none: parseInt(process.env.AI_TIMEOUT_NONE || "30000"),      // 30 seconds
  quick: parseInt(process.env.AI_TIMEOUT_QUICK || "45000"),    // 45 seconds
  standard: parseInt(process.env.AI_TIMEOUT_STANDARD || "90000"), // 90 seconds
  deep: parseInt(process.env.AI_TIMEOUT_DEEP || "120000"),     // 2 minutes
  max: parseInt(process.env.AI_TIMEOUT_MAX || "180000"),       // 3 minutes
} as const;

/**
 * Streaming timeout - max time without data before considering stream stalled
 */
export const STREAM_STALL_TIMEOUT = parseInt(process.env.AI_STREAM_STALL_TIMEOUT || "10000"); // 10 seconds

/**
 * Maximum request timeout for AI operations
 */
export const MAX_REQUEST_TIMEOUT = parseInt(process.env.AI_MAX_REQUEST_TIMEOUT || "180000"); // 3 minutes

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Cache TTL values in seconds for different cache types
 * Override via AI_CACHE_TTL_* environment variables
 */
export const CACHE_TTL = {
  workout_plan: parseInt(process.env.AI_CACHE_TTL_WORKOUT_PLAN || "3600"),           // 1 hour
  workout_generation: parseInt(process.env.AI_CACHE_TTL_WORKOUT_GENERATION || "3600"), // 1 hour
  exercise_recommendations: parseInt(process.env.AI_CACHE_TTL_EXERCISE_RECS || "1800"), // 30 minutes
  coaching_response: parseInt(process.env.AI_CACHE_TTL_COACHING || "7200"),          // 2 hours
  milestone_generation: parseInt(process.env.AI_CACHE_TTL_MILESTONES || "86400"),    // 24 hours
  context_analysis: parseInt(process.env.AI_CACHE_TTL_CONTEXT || "3600"),            // 1 hour
  member_context: parseInt(process.env.AI_CACHE_TTL_MEMBER_CONTEXT || "30"),         // 30 seconds
  member_name: parseInt(process.env.AI_CACHE_TTL_MEMBER_NAME || "300"),              // 5 minutes
} as const;

/**
 * Maximum entries in in-memory LRU cache
 */
export const MEMORY_CACHE_SIZE = parseInt(process.env.AI_MEMORY_CACHE_SIZE || "500");

// =============================================================================
// PRICING CONFIGURATION (per 1M tokens)
// =============================================================================

/**
 * Model pricing - update quarterly when OpenAI adjusts prices
 * Prices as of January 2026
 */
export const MODEL_PRICING = {
  "gpt-5.2": {
    inputPer1M: parseFloat(process.env.AI_PRICE_GPT52_INPUT || "1.75"),
    outputPer1M: parseFloat(process.env.AI_PRICE_GPT52_OUTPUT || "14.0"),
    cachedInputPer1M: parseFloat(process.env.AI_PRICE_GPT52_CACHED || "0.175"),
  },
  "gpt-5.2-pro": {
    inputPer1M: parseFloat(process.env.AI_PRICE_GPT52PRO_INPUT || "5.0"),
    outputPer1M: parseFloat(process.env.AI_PRICE_GPT52PRO_OUTPUT || "40.0"),
    cachedInputPer1M: parseFloat(process.env.AI_PRICE_GPT52PRO_CACHED || "0.5"),
  },
  "gpt-5.2-chat-latest": {
    inputPer1M: parseFloat(process.env.AI_PRICE_GPT52CHAT_INPUT || "0.5"),
    outputPer1M: parseFloat(process.env.AI_PRICE_GPT52CHAT_OUTPUT || "2.0"),
    cachedInputPer1M: parseFloat(process.env.AI_PRICE_GPT52CHAT_CACHED || "0.05"),
  },
} as const;

// =============================================================================
// TOKEN CONFIGURATION
// =============================================================================

/**
 * Token multipliers for cost estimation at different reasoning levels
 */
export const REASONING_TOKEN_MULTIPLIERS = {
  none: 1.0,
  quick: 1.5,
  standard: 2.5,
  deep: 4.0,
  max: 6.0,
} as const;

/**
 * Maximum context tokens for prompts
 */
export const MAX_CONTEXT_TOKENS = parseInt(process.env.AI_MAX_CONTEXT_TOKENS || "128000");

/**
 * Target token budget for semantic context
 */
export const SEMANTIC_CONTEXT_TOKEN_BUDGET = parseInt(process.env.AI_SEMANTIC_TOKEN_BUDGET || "4000");

// =============================================================================
// RECOVERY WINDOWS
// =============================================================================

/**
 * Default muscle recovery hours
 * Used as fallback if YAML schema loading fails
 */
export const DEFAULT_RECOVERY_HOURS: Record<string, number> = {
  chest: 48,
  back: 48,
  shoulders: 48,
  biceps: 48,
  triceps: 48,
  quadriceps: 72,
  hamstrings: 72,
  glutes: 72,
  calves: 48,
  core: 24,
  forearms: 48,
  "full body": 72,
};

// =============================================================================
// WORKOUT GENERATION
// =============================================================================

/**
 * Default exercise duration estimate (minutes per exercise)
 */
export const MINUTES_PER_EXERCISE = parseInt(process.env.AI_MINUTES_PER_EXERCISE || "8");

/**
 * Default workout categories
 */
export const WORKOUT_CATEGORIES = [
  "strength",
  "cardio",
  "hiit",
  "crossfit",
  "flexibility",
  "mobility",
  "sport_specific",
] as const;

/**
 * Exercise structure types
 */
export const EXERCISE_STRUCTURES = [
  "standard",
  "superset",
  "circuit",
  "amrap",
  "emom",
  "interval",
  "tabata",
] as const;

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Rate limit configurations for AI operations
 */
export const AI_RATE_LIMITS = {
  chat: {
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_CHAT || "30"),
    windowMs: 60000, // 1 minute
  },
  generation: {
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_GENERATION || "10"),
    windowMs: 60000, // 1 minute
  },
  recommendations: {
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_RECOMMENDATIONS || "20"),
    windowMs: 60000, // 1 minute
  },
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags for AI capabilities
 */
export const AI_FEATURES = {
  /** Enable extended 24h prompt caching */
  extendedCaching: process.env.AI_FEATURE_EXTENDED_CACHE !== "false",
  /** Enable OpenAI Conversations API for persistent state */
  conversationState: process.env.AI_FEATURE_CONVERSATION_STATE !== "false",
  /** Enable semantic layer tools */
  semanticTools: process.env.AI_FEATURE_SEMANTIC_TOOLS !== "false",
  /** Enable deep thinking mode */
  deepThinking: process.env.AI_FEATURE_DEEP_THINKING !== "false",
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get pricing for a specific model
 */
export function getModelPricing(model: string) {
  return MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["gpt-5.2"];
}

/**
 * Calculate estimated cost for a request (legacy binary cache flag)
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  usedCache: boolean = false
): number {
  const pricing = getModelPricing(model);
  const inputCost = (inputTokens / 1_000_000) * (usedCache ? pricing.cachedInputPer1M : pricing.inputPer1M);
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

/**
 * Calculate cost with proportional cached/uncached input token pricing.
 * More accurate than estimateCost() when cache token counts are available.
 */
export function estimateCostDetailed(
  uncachedInputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = getModelPricing(model);
  const uncachedCost = (uncachedInputTokens / 1_000_000) * pricing.inputPer1M;
  const cachedCost = (cachedInputTokens / 1_000_000) * pricing.cachedInputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return uncachedCost + cachedCost + outputCost;
}

/**
 * Get timeout for a reasoning level
 */
export function getTimeoutForReasoning(level: keyof typeof AI_TIMEOUTS): number {
  return AI_TIMEOUTS[level];
}

/**
 * Get cache TTL for a cache type
 */
export function getCacheTTL(type: keyof typeof CACHE_TTL): number {
  return CACHE_TTL[type];
}
