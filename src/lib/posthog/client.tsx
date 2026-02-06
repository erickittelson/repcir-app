"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

/**
 * Initialize PostHog on the client side
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false, // We capture manually for better control
        capture_pageleave: true,
        autocapture: {
          dom_event_allowlist: ["click", "submit"],
          element_allowlist: ["button", "a", "input", "form"],
        },
        // Respect Do Not Track
        respect_dnt: true,
        // Disable in development unless explicitly enabled
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development") {
            // Uncomment to debug in dev:
            // posthog.debug();
          }
        },
      });
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  }
}

/**
 * Identify a user for tracking
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.identify(userId, properties);
  }
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.reset();
  }
}

/**
 * Track page view manually
 */
export function trackPageView(url?: string) {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture("$pageview", {
      $current_url: url || window.location.href,
    });
  }
}

// Re-export posthog for direct access
export { posthog };
