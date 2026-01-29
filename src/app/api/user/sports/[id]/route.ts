import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userSports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    // Ensure the sport belongs to the user
    const result = await db
      .delete(userSports)
      .where(
        and(
          eq(userSports.id, id),
          eq(userSports.userId, session.user.id)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sport:", error);
    return NextResponse.json(
      { error: "Failed to delete sport" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const [updated] = await db
      .update(userSports)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSports.id, id),
          eq(userSports.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update sport:", error);
    return NextResponse.json(
      { error: "Failed to update sport" },
      { status: 500 }
    );
  }
}
