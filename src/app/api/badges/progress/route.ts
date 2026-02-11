import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { getUserBadgeProgress } from "@/lib/badges/award-service";

/**
 * GET /api/badges/progress - Get badge progress for current user
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await getUserBadgeProgress(session.user.id);

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Failed to fetch badge progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch badge progress" },
      { status: 500 }
    );
  }
}
