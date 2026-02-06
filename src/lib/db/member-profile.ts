/**
 * Member Profile Helper - January 2026
 *
 * Unified profile data access that merges circleMembers with userProfiles.
 * Prefers userProfiles data, falls back to circleMembers for legacy/standalone members.
 *
 * This consolidates the data access pattern as we migrate from storing
 * profile data in circleMembers to userProfiles.
 */

import { db, dbRead } from "./index";
import { circleMembers, userProfiles } from "./schema";
import { eq, inArray } from "drizzle-orm";

export interface MemberProfileData {
  profilePicture: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  displayName: string | null;
}

/**
 * Get profile data for a single member
 * Fetches from userProfiles if userId exists, otherwise uses circleMembers data
 */
export async function getMemberProfile(
  member: {
    userId: string | null;
    profilePicture: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    name: string;
  }
): Promise<MemberProfileData> {
  if (!member.userId) {
    // Standalone member without user account - use circleMembers data
    return {
      profilePicture: member.profilePicture,
      dateOfBirth: member.dateOfBirth?.toISOString().split("T")[0] || null,
      gender: member.gender,
      displayName: member.name,
    };
  }

  // Fetch userProfile
  const profile = await dbRead.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, member.userId),
  });

  if (!profile) {
    // No userProfile exists, fall back to circleMembers
    return {
      profilePicture: member.profilePicture,
      dateOfBirth: member.dateOfBirth?.toISOString().split("T")[0] || null,
      gender: member.gender,
      displayName: member.name,
    };
  }

  // Calculate dateOfBirth from userProfile
  let dateOfBirth: string | null = null;
  if (profile.birthMonth && profile.birthYear) {
    dateOfBirth = `${profile.birthYear}-${String(profile.birthMonth).padStart(2, "0")}-15`;
  } else if (member.dateOfBirth) {
    dateOfBirth = member.dateOfBirth.toISOString().split("T")[0];
  }

  return {
    profilePicture: profile.profilePicture || member.profilePicture,
    dateOfBirth,
    gender: profile.gender || member.gender,
    displayName: profile.displayName || member.name,
  };
}

/**
 * Get profile data for multiple members efficiently
 * Batches the userProfiles query for performance
 */
export async function getMemberProfiles(
  members: Array<{
    id: string;
    userId: string | null;
    profilePicture: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    name: string;
  }>
): Promise<Map<string, MemberProfileData>> {
  const result = new Map<string, MemberProfileData>();

  // Get userIds for members that have them
  const userIds = members
    .filter((m) => m.userId)
    .map((m) => m.userId as string);

  // Batch fetch userProfiles
  const profiles = userIds.length > 0
    ? await dbRead.query.userProfiles.findMany({
        where: inArray(userProfiles.userId, userIds),
      })
    : [];

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Build result map
  for (const member of members) {
    const profile = member.userId ? profileMap.get(member.userId) : null;

    let dateOfBirth: string | null = null;
    if (profile?.birthMonth && profile?.birthYear) {
      dateOfBirth = `${profile.birthYear}-${String(profile.birthMonth).padStart(2, "0")}-15`;
    } else if (member.dateOfBirth) {
      dateOfBirth = member.dateOfBirth.toISOString().split("T")[0];
    }

    result.set(member.id, {
      profilePicture: profile?.profilePicture || member.profilePicture,
      dateOfBirth,
      gender: profile?.gender || member.gender,
      displayName: profile?.displayName || member.name,
    });
  }

  return result;
}

/**
 * Calculate age from date of birth string
 */
export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Update user profile data
 * Updates both userProfiles (primary) and circleMembers (for backward compatibility)
 */
export async function updateMemberProfile(
  memberId: string,
  userId: string | null,
  data: {
    profilePicture?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    name?: string;
  }
): Promise<void> {
  const birthDate = data.dateOfBirth ? new Date(data.dateOfBirth) : null;

  // Update circleMembers (for backward compatibility)
  await db
    .update(circleMembers)
    .set({
      profilePicture: data.profilePicture,
      dateOfBirth: birthDate,
      gender: data.gender,
      name: data.name,
      updatedAt: new Date(),
    })
    .where(eq(circleMembers.id, memberId));

  // Update userProfiles if userId exists
  if (userId) {
    await db
      .update(userProfiles)
      .set({
        profilePicture: data.profilePicture || undefined,
        birthMonth: birthDate ? birthDate.getMonth() + 1 : undefined,
        birthYear: birthDate ? birthDate.getFullYear() : undefined,
        gender: data.gender || undefined,
        displayName: data.name || undefined,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));
  }
}
