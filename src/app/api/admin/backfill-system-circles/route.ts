/**
 * One-time backfill: Mark existing personal circles as isSystemCircle=true.
 *
 * Personal circles created during onboarding are named "X's Circle" and
 * have exactly 1 member who is the owner. This identifies and marks them.
 *
 * Also renames them to "My Training" for consistency.
 *
 * Run once via: POST /api/admin/backfill-system-circles
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find circles with exactly 1 member where that member is the owner
    // and the circle name matches the "X's Circle" pattern or is a solo circle
    const soloCircles = await db.execute(sql`
      SELECT c.id, c.name, cm.user_id
      FROM circles c
      INNER JOIN circle_members cm ON cm.circle_id = c.id
      WHERE c.is_system_circle = false
        AND cm.role = 'owner'
        AND (
          SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id
        ) = 1
        AND (
          c.name LIKE '%''s Circle'
          OR c.description = 'Your personal workout space'
        )
    `);

    let updated = 0;
    for (const row of soloCircles.rows) {
      const circleRow = row as { id: string; name: string; user_id: string };
      await db
        .update(circles)
        .set({
          isSystemCircle: true,
          name: "My Training",
          visibility: "private",
          joinType: "invite_only",
        })
        .where(eq(circles.id, circleRow.id));
      updated++;
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} circles as system circles`,
      updated,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json(
      { error: "Failed to backfill" },
      { status: 500 }
    );
  }
}
