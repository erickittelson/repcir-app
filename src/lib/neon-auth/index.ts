/**
 * Neon Auth - February 2026
 *
 * Unified exports for Neon Auth utilities.
 */

// Client-side exports (use in "use client" components)
export { authClient, useSession } from "./client";

// Server-side exports (use in Server Components and API routes)
export { auth } from "./server";

// Session helpers
export {
  getSession,
  requireAuth,
  requireCircle,
  getCurrentMemberId,
  switchCircle,
  type AppSession,
  // Legacy exports for backward compatibility
  getUnifiedSession,
  type UnifiedSession,
} from "./session";
