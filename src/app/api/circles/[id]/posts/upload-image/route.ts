import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validateImageFile, getSafeExtension } from "@/lib/file-validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: circleId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (MIME check)
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

    // Validate file content (magic number check to prevent spoofing)
    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Invalid image file" },
        { status: 400 }
      );
    }

    // Verify user is a member of the circle
    const membership = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this circle" },
        { status: 403 }
      );
    }

    // Generate unique filename with safe extension
    const ext = getSafeExtension(validation.detectedType || file.type);
    const filename = `circles/${circleId}/posts/${Date.now()}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Post image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
