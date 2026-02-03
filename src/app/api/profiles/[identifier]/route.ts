/**
 * Public Profile API
 * 
 * Fetches public profile data by handle or user ID.
 * Respects privacy settings and field visibility controls.
 * 
 * GET /api/profiles/[identifier]
 * - identifier can be a handle (e.g., "fitjohn") or a user ID (UUID)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  userProfiles,
  userMetrics,
  userSports,
  userSkills,
  personalRecords,
  userBadges,
  badgeDefinitions,
  circleMembers,
  circles,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

interface Params {
  params: Promise<{ identifier: string }>;
}

// Calculate age from birth year (never expose exact birth date)
function calculateAge(birthYear?: number | null): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { identifier } = await params;
    const session = await getSession();
    const viewerId = session?.user?.id;

    // Determine if identifier is a handle or UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    // Fetch the profile
    let profile;
    if (isUUID) {
      profile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, identifier),
      });
    } else {
      // Handle lookup (case-insensitive)
      profile = await db.query.userProfiles.findFirst({
        where: eq(sql`LOWER(${userProfiles.handle})`, identifier.toLowerCase()),
      });
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const profileUserId = profile.userId;
    const isOwnProfile = viewerId === profileUserId;

    // Check visibility settings
    const visibility = profile.visibility || "private";
    const fieldVisibility = (profile.fieldVisibility as Record<string, string>) || {};

    // If private, check if viewer is in the same circle
    let canViewProfile = visibility === "public" || isOwnProfile;
    let isInSameCircle = false;

    if (!canViewProfile && viewerId) {
      // Check if viewer shares a circle with the profile owner
      const viewerCircles = await db
        .select({ circleId: circleMembers.circleId })
        .from(circleMembers)
        .where(eq(circleMembers.userId, viewerId));

      const profileCircles = await db
        .select({ circleId: circleMembers.circleId })
        .from(circleMembers)
        .where(eq(circleMembers.userId, profileUserId));

      const viewerCircleIds = new Set(viewerCircles.map((c) => c.circleId));
      isInSameCircle = profileCircles.some((c) => viewerCircleIds.has(c.circleId));
      canViewProfile = isInSameCircle;
    }

    if (!canViewProfile) {
      // Return limited data for private profiles
      return NextResponse.json({
        profile: {
          displayName: profile.displayName || "User",
          handle: profile.handle,
          profilePicture: profile.profilePicture,
          isPrivate: true,
        },
        canMessage: false,
        canInvite: false,
        canFollow: !!viewerId,
      });
    }

    // Helper to check field visibility
    const canShowField = (field: string): boolean => {
      if (isOwnProfile) return true;
      const fieldVis = fieldVisibility[field] || "public";
      if (fieldVis === "public") return true;
      if (fieldVis === "circles" && isInSameCircle) return true;
      return false;
    };

    // Fetch additional data based on field visibility

    // Sports
    let sports: { sport: string; level?: string | null }[] = [];
    if (canShowField("sports")) {
      const sportsData = await db
        .select({
          sport: userSports.sport,
          level: userSports.level,
        })
        .from(userSports)
        .where(eq(userSports.userId, profileUserId));
      sports = sportsData;
    }

    // Skills
    let skills: { name: string; currentStatus: string }[] = [];
    if (canShowField("skills")) {
      const skillsData = await db
        .select({
          name: userSkills.name,
          currentStatus: userSkills.currentStatus,
        })
        .from(userSkills)
        .where(eq(userSkills.userId, profileUserId));
      skills = skillsData;
    }

    // Personal Records
    let prs: { exercise: string; value: number; unit: string }[] = [];
    if (canShowField("prs")) {
      // Get member ID for this user
      const member = await db.query.circleMembers.findFirst({
        where: eq(circleMembers.userId, profileUserId),
      });

      if (member) {
        const prsData = await db.query.personalRecords.findMany({
          where: eq(personalRecords.memberId, member.id),
          with: { exercise: true },
          orderBy: desc(personalRecords.createdAt),
          limit: 10,
        });
        
        prs = prsData.map((pr) => ({
          exercise: pr.exercise?.name || "Unknown",
          value: pr.value,
          unit: pr.unit,
        }));
      }
    }

    // Badges
    let badges: { name: string; icon: string; tier: string }[] = [];
    if (canShowField("badges")) {
      const badgesData = await db
        .select({
          name: badgeDefinitions.name,
          icon: badgeDefinitions.icon,
          tier: badgeDefinitions.tier,
        })
        .from(userBadges)
        .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
        .where(eq(userBadges.userId, profileUserId))
        .limit(10);
      badges = badgesData.map((b) => ({
        name: b.name,
        icon: b.icon || "",
        tier: b.tier,
      }));
    }

    // Metrics (age calculated, not raw birthYear)
    let age: number | null = null;
    let fitnessLevel: string | null = null;
    if (canShowField("metrics")) {
      age = calculateAge(profile.birthYear);
      
      const latestMetrics = await db
        .select({ fitnessLevel: userMetrics.fitnessLevel })
        .from(userMetrics)
        .where(eq(userMetrics.userId, profileUserId))
        .orderBy(desc(userMetrics.date))
        .limit(1);
      
      fitnessLevel = latestMetrics[0]?.fitnessLevel || null;
    }

    // Social links
    let socialLinks = {};
    if (canShowField("socialLinks")) {
      socialLinks = profile.socialLinks || {};
    }

    // City
    let city: string | null = null;
    if (canShowField("city")) {
      city = profile.city || null;
    }

    // Check if viewer can interact
    const canMessage = !!viewerId && !isOwnProfile;
    const canFollow = !!viewerId && !isOwnProfile;
    
    // Check if viewer owns any circles (for invite capability)
    let canInvite = false;
    if (viewerId && !isOwnProfile) {
      const ownedCircles = await db
        .select({ id: circleMembers.id })
        .from(circleMembers)
        .where(
          and(
            eq(circleMembers.userId, viewerId),
            eq(circleMembers.role, "owner")
          )
        )
        .limit(1);
      canInvite = ownedCircles.length > 0;
    }

    return NextResponse.json({
      profile: {
        userId: profileUserId,
        displayName: profile.displayName || "User",
        handle: profile.handle,
        profilePicture: profile.profilePicture,
        bio: profile.bio,
        age,
        fitnessLevel,
        city,
        socialLinks,
        isPrivate: false,
      },
      sports,
      skills,
      prs,
      badges,
      canMessage,
      canInvite,
      canFollow,
      isOwnProfile,
      isLoggedIn: !!viewerId,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
