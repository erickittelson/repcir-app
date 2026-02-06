import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { eq, or, and, count } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/connections/count
 * Returns the count of accepted connections for the current user
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Count accepted connections where user is either requester or addressee
    const [result] = await db
      .select({ count: count() })
      .from(connections)
      .where(
        and(
          eq(connections.status, "accepted"),
          or(
            eq(connections.requesterId, userId),
            eq(connections.addresseeId, userId)
          )
        )
      );

    return NextResponse.json({
      count: result?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching connection count:", error);
    return NextResponse.json(
      { error: "Failed to fetch connection count" },
      { status: 500 }
    );
  }
}
