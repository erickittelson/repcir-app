import { PostHog } from "posthog-node";

// Server-side PostHog client (singleton)
let posthogClient: PostHog | null = null;

/**
 * Get the server-side PostHog client
 */
export function getPostHogClient(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1, // Flush immediately in serverless
      flushInterval: 0,
    });
  }

  return posthogClient;
}

/**
 * Track a server-side event
 */
export async function trackServerEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event: eventName,
    properties,
  });

  // Flush immediately for serverless
  await client.flush();
}

/**
 * Identify a user server-side
 */
export async function identifyServerUser(
  distinctId: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });

  await client.flush();
}

/**
 * Check if a feature flag is enabled for a user
 */
export async function isFeatureEnabled(
  distinctId: string,
  featureKey: string
): Promise<boolean> {
  const client = getPostHogClient();
  if (!client) return false;

  try {
    const result = await client.isFeatureEnabled(featureKey, distinctId);
    return result ?? false;
  } catch {
    return false;
  }
}

/**
 * Get feature flag value with payload
 */
export async function getFeatureFlag<T = unknown>(
  distinctId: string,
  featureKey: string
): Promise<T | null> {
  const client = getPostHogClient();
  if (!client) return null;

  try {
    const result = await client.getFeatureFlag(featureKey, distinctId);
    return result as T;
  } catch {
    return null;
  }
}

/**
 * Get all feature flags for a user
 */
export async function getAllFeatureFlags(
  distinctId: string
): Promise<Record<string, boolean | string>> {
  const client = getPostHogClient();
  if (!client) return {};

  try {
    const result = await client.getAllFlags(distinctId);
    return result;
  } catch {
    return {};
  }
}

/**
 * Shutdown PostHog client (for graceful shutdown)
 */
export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
