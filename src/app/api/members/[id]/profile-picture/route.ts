import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { moderateImageBase64 } from "@/lib/moderation";
import { validateImageFile } from "@/lib/file-validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Validate file content (magic number check)
    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Invalid image file" },
        { status: 400 }
      );
    }

    // Read file for moderation
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64 data URL for moderation
    const base64 = buffer.toString("base64");
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Moderate image for inappropriate content (NSFW, violence, etc.)
    const moderationResult = await moderateImageBase64(dataUrl);
    if (!moderationResult.isClean) {
      const flaggedCategories = Object.entries(moderationResult.categories)
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);

      console.warn(`[Moderation] Member profile picture rejected for member ${id}: ${flaggedCategories.join(", ")}`);

      return NextResponse.json(
        {
          error: "This image cannot be used as a profile picture. Please upload an appropriate image.",
          code: "CONTENT_MODERATION_FAILED",
        },
        { status: 400 }
      );
    }

    // Generate unique filename for Vercel Blob
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `member-profile-pictures/${session.circleId}/${id}/${Date.now()}.${ext}`;

    // Delete old profile picture from Blob if exists
    if (member.profilePicture && member.profilePicture.includes("blob.vercel-storage.com")) {
      try {
        await del(member.profilePicture);
      } catch (error) {
        // Ignore deletion errors - file may not exist
        console.warn("Failed to delete old profile picture:", error);
      }
    }

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    // Update member with profile picture URL
    await db
      .update(circleMembers)
      .set({
        profilePicture: blob.url,
        updatedAt: new Date(),
      })
      .where(eq(circleMembers.id, id));

    return NextResponse.json({
      success: true,
      profilePicture: blob.url,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Delete from Vercel Blob if exists
    if (member.profilePicture && member.profilePicture.includes("blob.vercel-storage.com")) {
      try {
        await del(member.profilePicture);
      } catch (error) {
        // Ignore deletion errors - file may not exist
        console.warn("Failed to delete profile picture from blob:", error);
      }
    }

    // Remove profile picture URL from member
    await db
      .update(circleMembers)
      .set({
        profilePicture: null,
        updatedAt: new Date(),
      })
      .where(eq(circleMembers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing profile picture:", error);
    return NextResponse.json(
      { error: "Failed to remove profile picture" },
      { status: 500 }
    );
  }
}
