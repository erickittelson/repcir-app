import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all circles the user is a member of
    const memberships = await db.query.circleMembers.findMany({
      where: eq(circleMembers.userId, session.user.id),
    });

    if (memberships.length === 0) {
      return NextResponse.json({ circles: [] });
    }

    const circleIds = memberships.map((m) => m.circleId);

    // Get the circles
    const userCircles = await db.query.circles.findMany({
      where: inArray(circles.id, circleIds),
    });

    // Enhance with membership info
    const enhancedCircles = userCircles.map((circle) => {
      const membership = memberships.find((m) => m.circleId === circle.id);
      return {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        category: circle.category,
        visibility: circle.visibility,
        memberCount: circle.memberCount,
        imageUrl: circle.imageUrl,
        role: membership?.role,
      };
    });

    return NextResponse.json({ circles: enhancedCircles });
  } catch (error) {
    console.error("Error fetching circles:", error);
    return NextResponse.json(
      { error: "Failed to fetch circles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if circle name already exists
    const existing = await db.query.circles.findFirst({
      where: eq(circles.name, name),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A circle with this name already exists" },
        { status: 400 }
      );
    }

    // Create the circle
    const [circle] = await db
      .insert(circles)
      .values({
        name,
        description,
      })
      .returning();

    // Add the creator as owner
    await db.insert(circleMembers).values({
      circleId: circle.id,
      userId: session.user.id,
      name: session.user.name,
      role: "owner",
    });

    return NextResponse.json({ id: circle.id, name: circle.name });
  } catch (error) {
    console.error("Error creating circle:", error);
    return NextResponse.json(
      { error: "Failed to create circle" },
      { status: 500 }
    );
  }
}
