import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userBadges } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

/**
 * PATCH /api/badges/user/[id]/featured - Toggle badge featured status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isFeatured } = body;

    // If featuring, check if user already has 6 featured badges
    if (isFeatured) {
      const featuredCount = await db
        .select({ count: count() })
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, session.user.id),
            eq(userBadges.isFeatured, true)
          )
        );

      if ((featuredCount[0]?.count || 0) >= 6) {
        return NextResponse.json(
          { error: "Maximum of 6 featured badges allowed" },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(userBadges)
      .set({ isFeatured })
      .where(
        and(
          eq(userBadges.id, id),
          eq(userBadges.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update badge:", error);
    return NextResponse.json(
      { error: "Failed to update badge" },
      { status: 500 }
    );
  }
}
