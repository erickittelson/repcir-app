import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, userLimitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.userId) {
      return NextResponse.json([]);
    }

    const limitations = await db.query.userLimitations.findMany({
      where: eq(userLimitations.userId, member.userId),
      orderBy: (limitations: any, { desc }: any) => [desc(limitations.createdAt)],
    });

    return NextResponse.json(limitations);
  } catch (error) {
    console.error("Error fetching limitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch limitations" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, description, affectedAreas, severity, startDate, endDate } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: "Type and description are required" },
        { status: 400 }
      );
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.userId) {
      return NextResponse.json({ error: "Member has no user account" }, { status: 400 });
    }

    const [limitation] = await db
      .insert(userLimitations)
      .values({
        userId: member.userId,
        type,
        description,
        affectedAreas: affectedAreas || [],
        severity,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        active: true,
      })
      .returning();

    return NextResponse.json(limitation);
  } catch (error) {
    console.error("Error creating limitation:", error);
    return NextResponse.json(
      { error: "Failed to create limitation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { limitationId, type, description, affectedAreas, severity, active, endDate } = body;

    if (!limitationId) {
      return NextResponse.json({ error: "Limitation ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.userId) {
      return NextResponse.json({ error: "Member has no user account" }, { status: 400 });
    }

    await db
      .update(userLimitations)
      .set({
        type,
        description,
        affectedAreas,
        severity,
        active,
        endDate: endDate ? new Date(endDate) : null,
      })
      .where(
        and(
          eq(userLimitations.id, limitationId),
          eq(userLimitations.userId, member.userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating limitation:", error);
    return NextResponse.json(
      { error: "Failed to update limitation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limitationId = searchParams.get("limitationId");

    if (!limitationId) {
      return NextResponse.json({ error: "Limitation ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.userId) {
      return NextResponse.json({ error: "Member has no user account" }, { status: 400 });
    }

    await db
      .delete(userLimitations)
      .where(
        and(
          eq(userLimitations.id, limitationId),
          eq(userLimitations.userId, member.userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting limitation:", error);
    return NextResponse.json(
      { error: "Failed to delete limitation" },
      { status: 500 }
    );
  }
}
