import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    const body = await request.json();

    // Check if profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    const profileData = {
      displayName: body.displayName,
      birthMonth: body.birthMonth,
      birthYear: body.birthYear,
      city: body.city,
      country: body.country,
      updatedAt: new Date(),
    };

    if (existingProfile) {
      // Update existing profile
      await db
        .update(userProfiles)
        .set(profileData)
        .where(eq(userProfiles.userId, session.user.id));
    } else {
      // Create new profile
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

    const body = await request.json();

    // Check if profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    // Validate gallery photos (max 5)
    if (body.galleryPhotos && body.galleryPhotos.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 gallery photos allowed" },
        { status: 400 }
      );
    }

    const profileData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (body.handle !== undefined) profileData.handle = body.handle;
    if (body.displayName !== undefined) profileData.displayName = body.displayName;
    if (body.birthMonth !== undefined) profileData.birthMonth = body.birthMonth;
    if (body.birthYear !== undefined) profileData.birthYear = body.birthYear;
    if (body.city !== undefined) profileData.city = body.city;
    if (body.country !== undefined) profileData.country = body.country;
    if (body.profilePicture !== undefined) profileData.profilePicture = body.profilePicture;
    if (body.galleryPhotos !== undefined) profileData.galleryPhotos = body.galleryPhotos;
    if (body.visibility !== undefined) profileData.visibility = body.visibility;
    if (body.socialLinks !== undefined) profileData.socialLinks = body.socialLinks;
    // New fields for profile customization
    if (body.bio !== undefined) profileData.bio = body.bio;
    if (body.fieldVisibility !== undefined) profileData.fieldVisibility = body.fieldVisibility;
    if (body.featuredGoals !== undefined) profileData.featuredGoals = body.featuredGoals;
    if (body.featuredAchievements !== undefined) profileData.featuredAchievements = body.featuredAchievements;

    if (existingProfile) {
      // Update existing profile
      await db
        .update(userProfiles)
        .set(profileData)
        .where(eq(userProfiles.userId, session.user.id));
    } else {
      // Create new profile
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
