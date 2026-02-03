import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const circleId = formData.get("circleId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!circleId) {
      return NextResponse.json(
        { error: "Circle ID is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Check if the circle exists
    const circle = await db.query.circles.findFirst({
      where: eq(circles.id, circleId),
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Verify user is owner or admin of the circle
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "Only circle owners and admins can update the circle image" },
        { status: 403 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `circles/${circleId}/${Date.now()}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // Update the circle's imageUrl in the database
    await db
      .update(circles)
      .set({
        imageUrl: blob.url,
        updatedAt: new Date(),
      })
      .where(eq(circles.id, circleId));

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Circle image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
