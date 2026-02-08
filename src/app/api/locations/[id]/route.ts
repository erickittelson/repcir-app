import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userLocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const location = await db.query.userLocations.findFirst({
      where: and(
        eq(userLocations.id, id),
        eq(userLocations.userId, session.user.id)
      ),
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Failed to fetch location:", error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, type, address, equipment, equipmentDetails } = body;

    // Check if location exists and belongs to user
    const existingLocation = await db.query.userLocations.findFirst({
      where: and(
        eq(userLocations.id, id),
        eq(userLocations.userId, session.user.id)
      ),
    });

    if (!existingLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(userLocations)
      .set({
        name: name ?? existingLocation.name,
        type: type ?? existingLocation.type,
        address: address !== undefined ? address : existingLocation.address,
        equipment: equipment ?? existingLocation.equipment,
        equipmentDetails: equipmentDetails !== undefined ? equipmentDetails : existingLocation.equipmentDetails,
        updatedAt: new Date(),
      })
      .where(eq(userLocations.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update location:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if location exists and belongs to user
    const existingLocation = await db.query.userLocations.findFirst({
      where: and(
        eq(userLocations.id, id),
        eq(userLocations.userId, session.user.id)
      ),
    });

    if (!existingLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    await db.delete(userLocations).where(eq(userLocations.id, id));

    // If deleted location was active, make another one active
    if (existingLocation.isActive) {
      const remainingLocations = await db.query.userLocations.findMany({
        where: eq(userLocations.userId, session.user.id),
        orderBy: (locations, { desc }) => [desc(locations.createdAt)],
        limit: 1,
      });

      if (remainingLocations.length > 0) {
        await db
          .update(userLocations)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(userLocations.id, remainingLocations[0].id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete location:", error);
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
