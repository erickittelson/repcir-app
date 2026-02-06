/**
 * Row Level Security (RLS) Context Helper
 *
 * Sets the current user context for PostgreSQL RLS policies.
 * Must be called at the start of each request that uses RLS-protected tables.
 *
 * Note: RLS is optional and provides defense-in-depth. The application
 * already enforces access control at the API level.
 */

import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Set the current user ID for RLS policies
 *
 * Usage in API routes:
 * ```typescript
 * await setRLSContext(session.user.id);
 * // ... rest of handler
 * ```
 */
export async function setRLSContext(userId: string): Promise<void> {
  try {
    // Set the application-level user context
    await db.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
  } catch (error) {
    // RLS context setting is optional - log but don't fail
    console.warn("[RLS] Failed to set context:", error);
  }
}

/**
 * Clear the RLS context (for admin operations)
 *
 * Usage:
 * ```typescript
 * await clearRLSContext(); // Enables admin bypass
 * ```
 */
export async function clearRLSContext(): Promise<void> {
  try {
    await db.execute(sql`SET LOCAL app.current_user_id = ''`);
  } catch (error) {
    console.warn("[RLS] Failed to clear context:", error);
  }
}

/**
 * Execute a function with RLS context set
 *
 * Usage:
 * ```typescript
 * const result = await withRLSContext(userId, async () => {
 *   return db.query.userProfiles.findFirst({ where: ... });
 * });
 * ```
 */
export async function withRLSContext<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  await setRLSContext(userId);
  try {
    return await fn();
  } finally {
    // Context automatically cleared at end of transaction/connection
  }
}

/**
 * Execute a function with admin bypass (empty user context)
 *
 * Usage:
 * ```typescript
 * const result = await withAdminBypass(async () => {
 *   // Can access all rows regardless of RLS
 *   return db.query.auditLogs.findMany({ limit: 100 });
 * });
 * ```
 */
export async function withAdminBypass<T>(fn: () => Promise<T>): Promise<T> {
  await clearRLSContext();
  try {
    return await fn();
  } finally {
    // Context automatically cleared at end of transaction/connection
  }
}

/**
 * Middleware to set RLS context from session
 *
 * Usage in API middleware:
 * ```typescript
 * export async function middleware(request: NextRequest) {
 *   const session = await getSession();
 *   if (session?.user?.id) {
 *     await setRLSContextFromSession(session.user.id);
 *   }
 * }
 * ```
 */
export async function setRLSContextFromSession(
  userId: string | undefined
): Promise<void> {
  if (userId) {
    await setRLSContext(userId);
  } else {
    await clearRLSContext();
  }
}

/**
 * Check if RLS is enabled for a table
 *
 * Usage:
 * ```typescript
 * const isEnabled = await isRLSEnabled('user_profiles');
 * ```
 */
export async function isRLSEnabled(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = ${tableName}
    `);

    const row = result.rows[0] as { relrowsecurity?: boolean } | undefined;
    return row?.relrowsecurity === true;
  } catch (error) {
    console.warn("[RLS] Failed to check RLS status:", error);
    return false;
  }
}

/**
 * Get current RLS context user ID
 */
export async function getCurrentRLSUser(): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT current_setting('app.current_user_id', true) as user_id
    `);

    const row = result.rows[0] as { user_id?: string } | undefined;
    return row?.user_id || null;
  } catch (error) {
    return null;
  }
}
