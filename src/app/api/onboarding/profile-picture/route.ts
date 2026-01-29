/**
 * Profile Picture Upload API
 *
 * Handles profile picture uploads during onboarding using Vercel Blob Storage.
 * - Validates file type and size
 * - Moderates image for inappropriate content (NSFW detection)
 * - Uploads to Vercel Blob
 * - Updates onboarding progress extractedData with URL
 */

import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { moderateImage } from "@/lib/moderation";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Get existing onboarding progress to check for old profile picture
    const existingProgress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId),
    });

    // Delete old profile picture if it exists in extractedData
    const oldProfilePicture = (existingProgress?.extractedData as Record<string, unknown>)?.profile_picture as string | undefined;
    if (oldProfilePicture) {
      try {
        await del(oldProfilePicture);
      } catch {
        // Ignore deletion errors - file might not exist
        console.warn("Could not delete old profile picture");
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `profile-pictures/${userId}/${timestamp}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false, // We already have timestamp for uniqueness
    });

    // Moderate image for inappropriate content (NSFW, violence, etc.)
    const moderationResult = await moderateImage(blob.url);
    if (!moderationResult.isClean) {
      // Delete the uploaded image if it fails moderation
      try {
        await del(blob.url);
      } catch {
        console.error("Failed to delete moderated image");
      }

      // Determine what category was flagged
      const flaggedCategories = Object.entries(moderationResult.categories)
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);

      console.warn(`[Moderation] Profile picture rejected for user ${userId}: ${flaggedCategories.join(", ")}`);

      return NextResponse.json(
        {
          error: "This image cannot be used as a profile picture. Please upload an appropriate image.",
          code: "CONTENT_MODERATION_FAILED",
        },
        { status: 400 }
      );
    }

    // Update onboarding progress with new profile picture URL in extractedData
    if (existingProgress) {
      const updatedData = {
        ...(existingProgress.extractedData as Record<string, unknown>),
        profile_picture: blob.url,
      };
      await db
        .update(onboardingProgress)
        .set({
          extractedData: updatedData,
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.userId, userId));
    } else {
      // Create new progress record if none exists
      await db.insert(onboardingProgress).values({
        userId: userId,
        currentPhase: "profile_setup",
        phaseIndex: 1,
        extractedData: { profile_picture: blob.url },
        conversationHistory: [],
      });
    }

    return NextResponse.json({
      url: blob.url,
      message: "Profile picture uploaded successfully",
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture" },
      { status: 500 }
    );
  }
}

// Delete profile picture
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get existing onboarding progress
    const existingProgress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId),
    });

    const profilePictureUrl = (existingProgress?.extractedData as Record<string, unknown>)?.profile_picture as string | undefined;

    if (!profilePictureUrl) {
      return NextResponse.json(
        { error: "No profile picture to delete" },
        { status: 404 }
      );
    }

    // Delete from Vercel Blob
    try {
      await del(profilePictureUrl);
    } catch {
      console.warn("Could not delete profile picture from blob storage");
    }

    // Update database - remove profile_picture from extractedData
    const updatedData = { ...(existingProgress?.extractedData as Record<string, unknown>) };
    delete updatedData.profile_picture;

    await db
      .update(onboardingProgress)
      .set({
        extractedData: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.userId, userId));

    return NextResponse.json({
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    console.error("Profile picture delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete profile picture" },
      { status: 500 }
    );
  }
}
