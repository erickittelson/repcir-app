import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, userMetrics } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PUT - Update a specific metric entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const body = await request.json();
    const { metricId, date, weight, height, bodyFatPercentage, fitnessLevel, notes } = body;

    if (!metricId) {
      return NextResponse.json({ error: "Metric ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.userId) {
      return NextResponse.json({ error: "Member has no user account" }, { status: 400 });
    }

    // Verify metric belongs to this user
    const metric = await db.query.userMetrics.findFirst({
      where: and(
        eq(userMetrics.id, metricId),
        eq(userMetrics.userId, member.userId)
      ),
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    // Update the metric
    await db
      .update(userMetrics)
      .set({
        date: date ? new Date(date) : undefined,
        weight: weight !== undefined ? weight : undefined,
        height: height !== undefined ? height : undefined,
        bodyFatPercentage: bodyFatPercentage !== undefined ? bodyFatPercentage : undefined,
        fitnessLevel: fitnessLevel !== undefined ? fitnessLevel : undefined,
        notes: notes !== undefined ? notes : undefined,
      })
      .where(eq(userMetrics.id, metricId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating metric:", error);
    return NextResponse.json(
      { error: "Failed to update metric" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific metric entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const { searchParams } = new URL(request.url);
    const metricId = searchParams.get("metricId");

    if (!metricId) {
      return NextResponse.json({ error: "Metric ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.userId) {
      return NextResponse.json({ error: "Member has no user account" }, { status: 400 });
    }

    // Verify metric belongs to this user
    const metric = await db.query.userMetrics.findFirst({
      where: and(
        eq(userMetrics.id, metricId),
        eq(userMetrics.userId, member.userId)
      ),
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    // Delete the metric
    await db.delete(userMetrics).where(eq(userMetrics.id, metricId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting metric:", error);
    return NextResponse.json(
      { error: "Failed to delete metric" },
      { status: 500 }
    );
  }
}
