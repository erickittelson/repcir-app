import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { searchUsersForMention, searchCirclesForMention } from "@/lib/mentions";

/**
 * GET /api/mentions/search?q=query&type=user|circle
 * Search for users or circles to mention
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "user";
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    if (type === "circle") {
      const circles = await searchCirclesForMention(query, limit);
      return NextResponse.json({
        results: circles.map((c) => ({
          type: "circle",
          id: c.circleId,
          name: c.name,
          imageUrl: c.imageUrl,
          memberCount: c.memberCount,
        })),
      });
    }

    // Default to user search
    const users = await searchUsersForMention(query, session.user.id, limit);
    return NextResponse.json({
      results: users.map((u) => ({
        type: "user",
        id: u.userId,
        handle: u.handle,
        displayName: u.displayName,
        profilePicture: u.profilePicture,
      })),
    });
  } catch (error) {
    console.error("Mention search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
