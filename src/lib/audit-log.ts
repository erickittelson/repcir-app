/**
 * Audit Logging Utility
 *
 * Tracks sensitive operations for security and GDPR compliance.
 * Logs are stored in the database and can be exported for compliance audits.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type AuditAction =
  | "data_export"
  | "data_deletion"
  | "profile_view"
  | "profile_update"
  | "health_data_access"
  | "ai_data_processing"
  | "admin_action"
  | "consent_change"
  | "login"
  | "logout"
  | "password_change"
  | "email_change"
  | "member_invite"
  | "member_remove";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a sensitive operation for audit purposes
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const severity = entry.severity || getSeverityForAction(entry.action);

  try {
    await db.execute(sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        severity,
        resource_type,
        resource_id,
        metadata,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        ${entry.userId},
        ${entry.action},
        ${severity},
        ${entry.resourceType || null},
        ${entry.resourceId || null},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb,
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        NOW()
      )
    `);
  } catch (error) {
    // Don't let audit logging failures break the main operation
    // But log to console for monitoring
    console.error("[Audit] Failed to log event:", {
      action: entry.action,
      userId: entry.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Log an audit event from a Next.js request (extracts IP and user agent)
 */
export async function logAuditEventFromRequest(
  entry: Omit<AuditLogEntry, "ipAddress" | "userAgent">,
  request: Request
): Promise<void> {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return logAuditEvent({
    ...entry,
    ipAddress,
    userAgent,
  });
}

/**
 * Get default severity for an action
 */
function getSeverityForAction(action: AuditAction): AuditSeverity {
  switch (action) {
    case "data_deletion":
    case "password_change":
    case "email_change":
      return "critical";

    case "data_export":
    case "admin_action":
    case "consent_change":
    case "member_remove":
      return "warning";

    default:
      return "info";
  }
}

/**
 * Get audit logs for a user (for GDPR data access requests)
 */
export async function getAuditLogsForUser(
  userId: string,
  limit = 100
): Promise<unknown[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        action,
        severity,
        resource_type,
        resource_id,
        metadata,
        ip_address,
        created_at
      FROM audit_logs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows;
  } catch (error) {
    console.error("[Audit] Failed to get logs for user:", error);
    return [];
  }
}

/**
 * Get recent critical audit events (for admin monitoring)
 */
export async function getRecentCriticalEvents(
  limit = 50
): Promise<unknown[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        ip_address,
        created_at
      FROM audit_logs
      WHERE severity = 'critical'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows;
  } catch (error) {
    console.error("[Audit] Failed to get critical events:", error);
    return [];
  }
}
