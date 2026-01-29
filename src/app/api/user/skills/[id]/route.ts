import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userSkills } from "@/lib/db/schema";
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

    const skill = await db.query.userSkills.findFirst({
      where: and(
        eq(userSkills.id, id),
        eq(userSkills.userId, session.user.id)
      ),
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("Error fetching skill:", error);
    return NextResponse.json({ error: "Failed to fetch skill" }, { status: 500 });
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
    const existing = await db.query.userSkills.findFirst({
      where: and(
        eq(userSkills.id, id),
        eq(userSkills.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.currentStatus !== undefined) {
      updateData.currentStatus = body.currentStatus;
      updateData.currentStatusDate = new Date();
      // Update all-time best if current is better
      const statusOrder = ["not_started", "learning", "achieved", "mastered"];
      const currentIdx = statusOrder.indexOf(body.currentStatus);
      const bestIdx = statusOrder.indexOf(existing.allTimeBestStatus || "not_started");
      if (currentIdx > bestIdx) {
        updateData.allTimeBestStatus = body.currentStatus;
        updateData.allTimeBestDate = new Date();
      }
    }

    const [skill] = await db
      .update(userSkills)
      .set(updateData)
      .where(eq(userSkills.id, id))
      .returning();

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("Error updating skill:", error);
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
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
    const existing = await db.query.userSkills.findFirst({
      where: and(
        eq(userSkills.id, id),
        eq(userSkills.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    await db.delete(userSkills).where(eq(userSkills.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 });
  }
}
