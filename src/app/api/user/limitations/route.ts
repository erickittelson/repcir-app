import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userLimitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitations = await db.query.userLimitations.findMany({
      where: and(
        eq(userLimitations.userId, session.user.id),
        eq(userLimitations.active, true)
      ),
    });

    return NextResponse.json({ limitations });
  } catch (error) {
    console.error("Error fetching limitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch limitations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Create the limitation directly with user_id
    const [limitation] = await db
      .insert(userLimitations)
      .values({
        userId: session.user.id,
        type: body.type || "injury",
        bodyPart: body.bodyPart || undefined,
        condition: body.condition || undefined,
        description: body.description || undefined,
        severity: body.severity || "moderate",
        painLevel: body.painLevel || undefined,
        duration: body.duration || undefined,
        affectedAreas: body.bodyPart ? [body.bodyPart] : [],
        avoidsMovements: body.avoidsMovements || [],
        notes: body.notes || undefined,
        active: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      id: limitation.id,
      limitation,
    });
  } catch (error) {
    console.error("Error creating limitation:", error);
    return NextResponse.json(
      { error: "Failed to create limitation" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Limitation ID required" },
        { status: 400 }
      );
    }

    // Verify the limitation belongs to this user
    const existing = await db.query.userLimitations.findFirst({
      where: and(
        eq(userLimitations.id, body.id),
        eq(userLimitations.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Limitation not found" },
        { status: 404 }
      );
    }

    // Update the limitation
    const [updated] = await db
      .update(userLimitations)
      .set({
        bodyPart: body.bodyPart !== undefined ? body.bodyPart : existing.bodyPart,
        condition: body.condition !== undefined ? body.condition : existing.condition,
        description: body.description !== undefined ? body.description : existing.description,
        severity: body.severity !== undefined ? body.severity : existing.severity,
        painLevel: body.painLevel !== undefined ? body.painLevel : existing.painLevel,
        duration: body.duration !== undefined ? body.duration : existing.duration,
        affectedAreas: body.bodyPart ? [body.bodyPart] : existing.affectedAreas,
        avoidsMovements: body.avoidsMovements !== undefined ? body.avoidsMovements : existing.avoidsMovements,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(userLimitations.id, body.id))
      .returning();

    return NextResponse.json({
      success: true,
      id: updated.id,
      limitation: updated,
    });
  } catch (error) {
    console.error("Error updating limitation:", error);
    return NextResponse.json(
      { error: "Failed to update limitation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Limitation ID required" },
        { status: 400 }
      );
    }

    // Soft delete by setting active to false
    await db
      .update(userLimitations)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(userLimitations.id, id),
          eq(userLimitations.userId, session.user.id)
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
