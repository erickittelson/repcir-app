import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userLimitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const limitation = await db.query.userLimitations.findFirst({
      where: and(
        eq(userLimitations.id, id),
        eq(userLimitations.userId, session.user.id)
      ),
    });

    if (!limitation) {
      return NextResponse.json({ error: "Limitation not found" }, { status: 404 });
    }

    return NextResponse.json({ limitation });
  } catch (error) {
    console.error("Error fetching limitation:", error);
    return NextResponse.json({ error: "Failed to fetch limitation" }, { status: 500 });
  }
}

export async function PUT(
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

    // Verify ownership
    const existing = await db.query.userLimitations.findFirst({
      where: and(
        eq(userLimitations.id, id),
        eq(userLimitations.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Limitation not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.type !== undefined) updateData.type = body.type;
    if (body.bodyPart !== undefined) updateData.bodyPart = body.bodyPart;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.active !== undefined) updateData.active = body.active;

    const [limitation] = await db
      .update(userLimitations)
      .set(updateData)
      .where(eq(userLimitations.id, id))
      .returning();

    return NextResponse.json({ limitation });
  } catch (error) {
    console.error("Error updating limitation:", error);
    return NextResponse.json({ error: "Failed to update limitation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.query.userLimitations.findFirst({
      where: and(
        eq(userLimitations.id, id),
        eq(userLimitations.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Limitation not found" }, { status: 404 });
    }

    // Soft delete by setting active to false
    await db
      .update(userLimitations)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(userLimitations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting limitation:", error);
    return NextResponse.json({ error: "Failed to delete limitation" }, { status: 500 });
  }
}
