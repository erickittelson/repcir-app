/**
 * Sentry utilities for error tracking
 *
 * Usage:
 * - Client-side: import { captureError } from "@/lib/sentry"
 * - Server-side: import * as Sentry from "@sentry/nextjs"
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id: string; email?: string };
    level?: "fatal" | "error" | "warning" | "info";
  }
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    if (context?.user) {
      scope.setUser(context.user);
    }

    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(errorObj);
  });
}

/**
 * Set user context for all subsequent errors
 */
export function setUser(user: { id: string; email?: string } | null) {
  if (user) {
    Sentry.setUser(user);
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    name?: string;
    tags?: Record<string, string>;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, {
        tags: {
          function: options?.name || fn.name || "anonymous",
          ...options?.tags,
        },
        extra: { args },
      });
      throw error;
    }
  }) as T;
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({
    name,
    op,
    forceTransaction: true,
  });
}

// Re-export Sentry for direct access when needed
export { Sentry };
