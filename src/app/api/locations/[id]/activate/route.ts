import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userLocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if location exists and belongs to user
    const location = await db.query.userLocations.findFirst({
      where: and(
        eq(userLocations.id, id),
        eq(userLocations.userId, session.user.id)
      ),
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Deactivate all other locations for this user
    await db
      .update(userLocations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(userLocations.userId, session.user.id));

    // Activate the selected location
    const [updated] = await db
      .update(userLocations)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(userLocations.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to activate location:", error);
    return NextResponse.json({ error: "Failed to activate location" }, { status: 500 });
  }
}
