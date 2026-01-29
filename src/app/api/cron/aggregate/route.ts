/**
 * Cron Job: Refresh Materialized Views
 *
 * Runs daily at 1 AM to refresh analytics materialized views
 * Vercel Cron: 0 1 * * *
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 300;

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Require CRON_SECRET in production for security
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET not configured in production");
      return false;
    }
    // Allow in development for testing, but log warning
    console.warn("CRON_SECRET not set - cron endpoint accessible without auth in dev");
    return true;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = performance.now();
  const results = {
    dailyActivityView: { refreshed: false, error: null as string | null },
    weeklySummaryView: { refreshed: false, error: null as string | null },
  };

  // Refresh daily activity materialized view
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_daily_activity`);
    results.dailyActivityView.refreshed = true;
  } catch (error) {
    // If CONCURRENTLY fails (no unique index), try regular refresh
    try {
      await db.execute(sql`REFRESH MATERIALIZED VIEW mv_member_daily_activity`);
      results.dailyActivityView.refreshed = true;
    } catch (innerError) {
      results.dailyActivityView.error = innerError instanceof Error ? innerError.message : "Unknown error";
    }
  }

  // Refresh weekly summary materialized view
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_weekly_summary`);
    results.weeklySummaryView.refreshed = true;
  } catch (error) {
    // If CONCURRENTLY fails, try regular refresh
    try {
      await db.execute(sql`REFRESH MATERIALIZED VIEW mv_member_weekly_summary`);
      results.weeklySummaryView.refreshed = true;
    } catch (innerError) {
      results.weeklySummaryView.error = innerError instanceof Error ? innerError.message : "Unknown error";
    }
  }

  const elapsed = Math.round(performance.now() - start);

  return NextResponse.json({
    success: results.dailyActivityView.refreshed || results.weeklySummaryView.refreshed,
    results,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  });
}
