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
    console.error("Error fetching circle:", error);
    return NextResponse.json(
      { error: "Failed to fetch circle" },
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

    const userRole = session.activeCircle?.role;
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, passkey } = body;

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name) {
      updates.name = name;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (passkey) {
      if (passkey.length < 4) {
        return NextResponse.json(
          { error: "Passkey must be at least 4 characters" },
          { status: 400 }
        );
      }
      // Note: hashPasskey is deprecated as app now uses Neon Auth
      updates.passkey = await hashPasskey(passkey);
    }

    await db
      .update(circles)
      .set(updates)
      .where(eq(circles.id, session.circleId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating circle:", error);
    return NextResponse.json(
      { error: "Failed to update circle" },
      { status: 500 }
    );
  }
}
