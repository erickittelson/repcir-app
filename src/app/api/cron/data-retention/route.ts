/**
 * Cron Job: Data Retention Cleanup
 *
 * Runs daily to enforce data retention policies for GDPR/CCPA compliance
 * Vercel Cron: 0 4 * * * (4 AM daily)
 *
 * Retention policies:
 * - AI coaching conversations: 90 days (soft-delete messages, keep conversation metadata for analytics)
 * - Direct messages: 365 days (hard delete)
 * - Activity feed: 730 days (2 years, hard delete)
 * - Notifications: 90 days (hard delete)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  coachMessages,
  coachConversations,
  messages,
  activityFeed,
  notifications,
} from "@/lib/db/schema";
import { sql, lt, and, eq, isNull } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow more time for large datasets

// Retention periods in days
const RETENTION_PERIODS = {
  COACH_MESSAGES: 90,
  DIRECT_MESSAGES: 365,
  ACTIVITY_FEED: 730, // 2 years
  NOTIFICATIONS: 90,
} as const;

// Rate limiting for cron endpoint
const cronRateLimitStore = new Map<string, number>();
const CRON_RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour minimum between runs

function verifyCronRequest(request: Request): { valid: boolean; error?: string } {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return { valid: false, error: "CRON_SECRET not configured" };
    }
    console.warn("CRON_SECRET not set - cron endpoint accessible without auth in dev");
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return { valid: false, error: "Invalid authorization" };
  }

  // Rate limiting
  const endpoint = "data-retention";
  const now = Date.now();
  const lastCall = cronRateLimitStore.get(endpoint);
  if (lastCall && now - lastCall < CRON_RATE_LIMIT_MS) {
    return { valid: false, error: `Rate limited. Try again in ${Math.ceil((CRON_RATE_LIMIT_MS - (now - lastCall)) / 60000)} minutes` };
  }
  cronRateLimitStore.set(endpoint, now);

  return { valid: true };
}

function getRetentionDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function GET(request: Request) {
  const authResult = verifyCronRequest(request);
  if (!authResult.valid) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  const start = performance.now();
  const results: Record<string, { deleted: number; error?: string }> = {};

  // 1. Clean up old coach messages (keep conversation metadata)
  try {
    const cutoffDate = getRetentionDate(RETENTION_PERIODS.COACH_MESSAGES);
    const deleted = await db
      .delete(coachMessages)
      .where(lt(coachMessages.createdAt, cutoffDate))
      .returning({ id: coachMessages.id });
    results.coachMessages = { deleted: deleted.length };
  } catch (error) {
    results.coachMessages = { deleted: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }

  // 2. Clean up empty coach conversations (no remaining messages)
  try {
    // Find conversations with no messages and older than retention period
    const emptyConversations = await db.execute(sql`
      DELETE FROM coach_conversations c
      WHERE NOT EXISTS (
        SELECT 1 FROM coach_messages m WHERE m.conversation_id = c.id
      )
      AND c.updated_at < ${getRetentionDate(RETENTION_PERIODS.COACH_MESSAGES)}
      RETURNING c.id
    `);
    results.emptyConversations = { deleted: (emptyConversations as { rows: unknown[] }).rows?.length || 0 };
  } catch (error) {
    results.emptyConversations = { deleted: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }

  // 3. Hard delete old direct messages
  try {
    const cutoffDate = getRetentionDate(RETENTION_PERIODS.DIRECT_MESSAGES);
    const deleted = await db
      .delete(messages)
      .where(lt(messages.createdAt, cutoffDate))
      .returning({ id: messages.id });
    results.directMessages = { deleted: deleted.length };
  } catch (error) {
    results.directMessages = { deleted: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }

  // 4. Clean up old activity feed entries
  try {
    const cutoffDate = getRetentionDate(RETENTION_PERIODS.ACTIVITY_FEED);
    const deleted = await db
      .delete(activityFeed)
      .where(lt(activityFeed.createdAt, cutoffDate))
      .returning({ id: activityFeed.id });
    results.activityFeed = { deleted: deleted.length };
  } catch (error) {
    results.activityFeed = { deleted: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }

  // 5. Clean up old notifications
  try {
    const cutoffDate = getRetentionDate(RETENTION_PERIODS.NOTIFICATIONS);
    const deleted = await db
      .delete(notifications)
      .where(lt(notifications.createdAt, cutoffDate))
      .returning({ id: notifications.id });
    results.notifications = { deleted: deleted.length };
  } catch (error) {
    results.notifications = { deleted: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }

  const elapsed = Math.round(performance.now() - start);
  const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);

  return NextResponse.json({
    success: true,
    retentionPolicies: {
      coachMessages: `${RETENTION_PERIODS.COACH_MESSAGES} days`,
      directMessages: `${RETENTION_PERIODS.DIRECT_MESSAGES} days`,
      activityFeed: `${RETENTION_PERIODS.ACTIVITY_FEED} days`,
      notifications: `${RETENTION_PERIODS.NOTIFICATIONS} days`,
    },
    results,
    totalDeleted,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  });
}
