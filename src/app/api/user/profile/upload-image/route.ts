import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateImageFile, getSafeExtension } from "@/lib/file-validation";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Generate unique filename with safe extension
    const ext = getSafeExtension(validation.detectedType || file.type);
    const filename = `profiles/${session.user.id}/${Date.now()}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // Update the user's profile picture in the database
    await db
      .update(userProfiles)
      .set({
        profilePicture: blob.url,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, session.user.id));

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
