import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userLocations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const locations = await db.query.userLocations.findMany({
      where: eq(userLocations.userId, session.user.id),
      orderBy: (locations, { desc }) => [desc(locations.isActive), desc(locations.createdAt)],
      limit: 50, // Prevent unbounded queries
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type, address, lat, lng, equipment, equipmentDetails, visibility, isActive: requestedActive } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    // Check if this is the user's first location - if so, make it active
    const existingLocations = await db.query.userLocations.findMany({
      where: eq(userLocations.userId, session.user.id),
    });

    const isFirst = existingLocations.length === 0;

    const [location] = await db
      .insert(userLocations)
      .values({
        userId: session.user.id,
        name,
        type,
        address: type === "home" ? null : (address || null),
        lat: type === "home" ? null : (lat ?? null),
        lng: type === "home" ? null : (lng ?? null),
        equipment: equipment || [],
        equipmentDetails: equipmentDetails || null,
        visibility: visibility || "private",
        isActive: requestedActive ?? isFirst,
      })
      .returning();

    return NextResponse.json(location);
  } catch (error) {
    console.error("Failed to create location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
