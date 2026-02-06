/**
 * PostHog Analytics & Feature Flags
 *
 * Client-side usage:
 *   import { trackEvent, identifyUser } from "@/lib/posthog/client"
 *
 * Server-side usage:
 *   import { trackServerEvent, isFeatureEnabled } from "@/lib/posthog/server"
 *
 * Feature flags:
 *   - Use isFeatureEnabled() for boolean flags
 *   - Use getFeatureFlag() for flags with payloads
 *   - Create flags in PostHog dashboard
 */

// Re-export client functions (for "use client" components)
export {
  PostHogProvider,
  trackEvent,
  identifyUser,
  resetUser,
  trackPageView,
  posthog,
} from "./client";

// Re-export server functions
export {
  getPostHogClient,
  trackServerEvent,
  identifyServerUser,
  isFeatureEnabled,
  getFeatureFlag,
  getAllFeatureFlags,
  shutdownPostHog,
} from "./server";
