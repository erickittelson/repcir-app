import { NextResponse } from "next/server";
import { auth, hashPasskey } from "@/lib/auth";
import { db } from "@/lib/db";
import { circles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, session.circleId),
      columns: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    return NextResponse.json(circle);
  } catch (error) {
    console.error("Error fetching family info:", error);
    return NextResponse.json(
      { error: "Failed to fetch family info" },
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

    // Check that user has admin or owner role for this circle
    const userRole = session.activeCircle?.role;
    if (userRole !== "owner" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Only circle owners and admins can modify circle settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, passkey } = body;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Family name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (passkey !== undefined && passkey.length > 0) {
      if (passkey.length < 4) {
        return NextResponse.json(
          { error: "Passkey must be at least 4 characters" },
          { status: 400 }
        );
      }
      updates.passkey = await hashPasskey(passkey);
    }

    await db.update(circles).set(updates).where(eq(circles.id, session.circleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating family info:", error);
    return NextResponse.json(
      { error: "Failed to update family info" },
      { status: 500 }
    );
  }
}
