/**
 * Inngest Functions Registry
 *
 * Exports all Inngest functions for registration with the serve handler.
 */

import { cronFunctions } from "./cron";
import { aiFunctions } from "./ai";
import { scheduleFunctions } from "./schedule";
import { databaseEventFunctions } from "./database-events";
import { aiCoachingFunctions } from "./ai-coaching";
import { backgroundWorkoutFunctions } from "./generate-workout";
import { billingFunctions } from "./billing";
import { exerciseCleanupFunctions } from "./exercise-cleanup";

/**
 * All Inngest functions to be registered
 */
export const functions = [
  ...cronFunctions,
  ...aiFunctions,
  ...scheduleFunctions,
  ...databaseEventFunctions,
  ...aiCoachingFunctions,
  ...backgroundWorkoutFunctions,
  ...billingFunctions,
  ...exerciseCleanupFunctions,
];

// Re-export individual function groups for testing
export { cronFunctions, aiFunctions, scheduleFunctions, databaseEventFunctions, aiCoachingFunctions, backgroundWorkoutFunctions, billingFunctions, exerciseCleanupFunctions };
