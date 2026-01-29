import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { badgeDefinitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/badges - List all badge definitions
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    const whereConditions = [eq(badgeDefinitions.isActive, true)];
    if (category) {
      whereConditions.push(eq(badgeDefinitions.category, category));
    }

    const badges = await db
      .select()
      .from(badgeDefinitions)
      .where(and(...whereConditions))
      .orderBy(badgeDefinitions.displayOrder);

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}
