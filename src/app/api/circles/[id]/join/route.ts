import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circles, circleMembers, circleJoinRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;

  try {
    // Check if circle exists
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, circleId),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMembership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (existingMembership) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Check if there's already a pending request
    const existingRequest = await db.query.circleJoinRequests.findFirst({
      where: and(
        eq(circleJoinRequests.circleId, circleId),
        eq(circleJoinRequests.userId, session.user.id),
        eq(circleJoinRequests.status, "pending")
      ),
    });

    if (existingRequest) {
      return NextResponse.json({ error: "Request already pending" }, { status: 400 });
    }

    // Get message from request body if provided
    let message: string | null = null;
    try {
      const body = await request.json();
      message = body.message || null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Create join request
    const [joinRequest] = await db
      .insert(circleJoinRequests)
      .values({
        circleId,
        userId: session.user.id,
        message,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, request: joinRequest });
  } catch (error) {
    console.error("Failed to request to join circle:", error);
    return NextResponse.json({ error: "Failed to request to join" }, { status: 500 });
  }
}
