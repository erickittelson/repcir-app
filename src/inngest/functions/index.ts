/**
 * Inngest Functions Registry
 *
 * Exports all Inngest functions for registration with the serve handler.
 */

import { cronFunctions } from "./cron";
import { aiFunctions } from "./ai";
import { scheduleFunctions } from "./schedule";
import { databaseEventFunctions } from "./database-events";

/**
 * All Inngest functions to be registered
 */
export const functions = [
  ...cronFunctions,
  ...aiFunctions,
  ...scheduleFunctions,
  ...databaseEventFunctions,
];

// Re-export individual function groups for testing
export { cronFunctions, aiFunctions, scheduleFunctions, databaseEventFunctions };
