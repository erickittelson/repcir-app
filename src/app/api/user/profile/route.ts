import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { moderateText } from "@/lib/moderation";
import { patchUserProfileSchema, updateUserProfileSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
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

    // Validate request body with schema
    const validation = await validateBody(request, patchUserProfileSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Check if profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    // Build profile data from validated fields only
    const profileData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only include fields that were provided in the validated data
    if (data.displayName !== undefined) profileData.displayName = data.displayName;
    if (data.birthMonth !== undefined) profileData.birthMonth = data.birthMonth;
    if (data.birthYear !== undefined) profileData.birthYear = data.birthYear;
    if (data.city !== undefined) profileData.city = data.city;
    if (data.state !== undefined) profileData.state = data.state;
    if (data.country !== undefined) profileData.country = data.country;
    if (data.workoutLocation !== undefined) profileData.workoutLocation = data.workoutLocation;
    if (data.workoutLocationAddress !== undefined) profileData.workoutLocationAddress = data.workoutLocationAddress;
    if (data.workoutLocationType !== undefined) profileData.workoutLocationType = data.workoutLocationType;
    if (data.locationVisibility !== undefined) profileData.locationVisibility = data.locationVisibility;

    if (existingProfile) {
      await db
        .update(userProfiles)
        .set(profileData)
        .where(eq(userProfiles.userId, session.user.id));
    } else {
      await db.insert(userProfiles).values({
        userId: session.user.id,
        ...profileData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body with schema (validates types, lengths, and prevents mass assignment)
    const validation = await validateBody(request, updateUserProfileSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Check if profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    // Moderate bio content if provided
    if (data.bio && data.bio.length > 0) {
      const bioModeration = moderateText(data.bio);
      if (!bioModeration.isClean && bioModeration.severity !== "mild") {
        return NextResponse.json(
          { error: "Bio contains inappropriate content. Please revise." },
          { status: 400 }
        );
      }
    }

    // Build profile data from validated fields only
    const profileData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided in the validated data
    if (data.handle !== undefined) profileData.handle = data.handle;
    if (data.displayName !== undefined) profileData.displayName = data.displayName;
    if (data.birthMonth !== undefined) profileData.birthMonth = data.birthMonth;
    if (data.birthYear !== undefined) profileData.birthYear = data.birthYear;
    if (data.city !== undefined) profileData.city = data.city;
    if (data.state !== undefined) profileData.state = data.state;
    if (data.country !== undefined) profileData.country = data.country;
    if (data.profilePicture !== undefined) profileData.profilePicture = data.profilePicture;
    if (data.galleryPhotos !== undefined) profileData.galleryPhotos = data.galleryPhotos;
    if (data.visibility !== undefined) profileData.visibility = data.visibility;
    if (data.socialLinks !== undefined) profileData.socialLinks = data.socialLinks;
    if (data.bio !== undefined) profileData.bio = data.bio;
    if (data.fieldVisibility !== undefined) profileData.fieldVisibility = data.fieldVisibility;
    if (data.featuredGoals !== undefined) profileData.featuredGoals = data.featuredGoals;
    if (data.featuredAchievements !== undefined) profileData.featuredAchievements = data.featuredAchievements;
    if (data.workoutLocation !== undefined) profileData.workoutLocation = data.workoutLocation;
    if (data.workoutLocationAddress !== undefined) profileData.workoutLocationAddress = data.workoutLocationAddress;
    if (data.workoutLocationLat !== undefined) profileData.workoutLocationLat = data.workoutLocationLat;
    if (data.workoutLocationLng !== undefined) profileData.workoutLocationLng = data.workoutLocationLng;
    if (data.workoutLocationType !== undefined) profileData.workoutLocationType = data.workoutLocationType;
    if (data.locationVisibility !== undefined) profileData.locationVisibility = data.locationVisibility;
    if (data.gender !== undefined) profileData.gender = data.gender;

    if (existingProfile) {
      await db
        .update(userProfiles)
        .set(profileData)
        .where(eq(userProfiles.userId, session.user.id));
    } else {
      await db.insert(userProfiles).values({
        userId: session.user.id,
        ...profileData,
      });
    }

    // Fetch and return updated profile
    const updatedProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
