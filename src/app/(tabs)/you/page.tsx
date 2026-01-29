import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  userProfiles,
  userMetrics,
  userLimitations,
  userSkills,
  userLocations,
  userSports,
  circleMembers,
  circles,
  goals,
  workoutPlans,
  personalRecords,
  userBadges,
  badgeDefinitions,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ProfilePage } from "./profile-client";
import { calculateCompleteness } from "@/lib/profile/completeness";

// Revalidate profile page every 5 minutes (user data changes less frequently)
export const revalidate = 300;

export default async function YouPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = session.user.id;
  const memberId = session.activeCircle?.memberId;

  // Helper function to safely fetch badges (tables may not exist yet)
  async function fetchBadges() {
    try {
      return await db
        .select({
          id: userBadges.id,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
          isFeatured: userBadges.isFeatured,
          displayOrder: userBadges.displayOrder,
          badge: {
            name: badgeDefinitions.name,
            description: badgeDefinitions.description,
            icon: badgeDefinitions.icon,
            imageUrl: badgeDefinitions.imageUrl,
            category: badgeDefinitions.category,
            tier: badgeDefinitions.tier,
            criteriaDescription: badgeDefinitions.criteriaDescription,
          },
        })
        .from(userBadges)
        .innerJoin(badgeDefinitions, eq(userBadges.badgeId, badgeDefinitions.id))
        .where(eq(userBadges.userId, userId))
        .orderBy(userBadges.displayOrder);
    } catch {
      // Tables may not exist yet - return empty array
      return [];
    }
  }

  // Helper function to safely fetch limitations (columns may not exist yet)
  async function fetchLimitations() {
    try {
      return await db.query.userLimitations.findMany({
        where: and(
          eq(userLimitations.userId, userId),
          eq(userLimitations.active, true)
        ),
      });
    } catch {
      // New columns may not exist yet - try a simpler query
      try {
        const results = await db
          .select({
            id: userLimitations.id,
            type: userLimitations.type,
            bodyPart: userLimitations.bodyPart,
            condition: userLimitations.condition,
            description: userLimitations.description,
            severity: userLimitations.severity,
          })
          .from(userLimitations)
          .where(and(
            eq(userLimitations.userId, userId),
            eq(userLimitations.active, true)
          ));
        return results;
      } catch {
        return [];
      }
    }
  }

  // Fetch all user data in parallel
  const [
    profile,
    metrics,
    limitations,
    skills,
    locations,
    sports,
    userCircles,
    activeGoals,
    savedPlans,
    prs,
    badges,
    completeness,
  ] = await Promise.all([
    // User profile
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    }),

    // Latest metrics
    db.query.userMetrics.findFirst({
      where: eq(userMetrics.userId, userId),
      orderBy: [desc(userMetrics.date)],
    }),

    // Limitations (safe - columns may not exist yet)
    fetchLimitations(),

    // Skills
    db.query.userSkills.findMany({
      where: eq(userSkills.userId, userId),
      orderBy: [desc(userSkills.currentStatusDate)],
    }),

    // Locations/Equipment
    db.query.userLocations.findMany({
      where: eq(userLocations.userId, userId),
    }),

    // Sports
    db.query.userSports.findMany({
      where: eq(userSports.userId, userId),
    }),

    // User's circles
    db
      .select({
        id: circles.id,
        name: circles.name,
        role: circleMembers.role,
        memberCount: circles.memberCount,
        imageUrl: circles.imageUrl,
      })
      .from(circleMembers)
      .innerJoin(circles, eq(circleMembers.circleId, circles.id))
      .where(eq(circleMembers.userId, userId)),

    // Active goals (if member exists)
    memberId
      ? db.query.goals.findMany({
          where: and(eq(goals.memberId, memberId), eq(goals.status, "active")),
        })
      : [],

    // Saved workout plans (by circle)
    session.activeCircle
      ? db.query.workoutPlans.findMany({
          where: eq(workoutPlans.circleId, session.activeCircle.id),
          limit: 5,
        })
      : [],

    // Personal records (if member exists) - fetch all to deduplicate
    memberId
      ? db.query.personalRecords.findMany({
          where: eq(personalRecords.memberId, memberId),
          orderBy: [desc(personalRecords.date)],
          with: {
            exercise: true,
          },
        })
      : [],

    // User badges (safe - tables may not exist)
    fetchBadges(),

    // Profile completeness
    calculateCompleteness(userId),
  ]);

  // Separate featured badges
  const featuredBadges = badges.filter((b) => b.isFeatured);

  // Deduplicate PRs - keep only the best value per exercise (case-insensitive)
  const deduplicatedPRs = (() => {
    const prMap = new Map<string, typeof prs[0]>();
    for (const pr of prs) {
      const key = (pr.exercise?.name || "unknown").toLowerCase();
      const existing = prMap.get(key);
      // Keep the PR with the higher value, or most recent if same value
      if (!existing || pr.value > existing.value || 
          (pr.value === existing.value && new Date(pr.date) > new Date(existing.date))) {
        prMap.set(key, pr);
      }
    }
    return Array.from(prMap.values());
  })();

  return (
    <ProfilePage
      user={{
        id: userId,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      profile={
        profile
          ? {
              handle: (profile as any).handle || undefined,
              displayName: profile.displayName || undefined,
              profilePicture: profile.profilePicture || undefined,
              bio: (profile as any).bio || undefined,
              birthMonth: profile.birthMonth || undefined,
              birthYear: profile.birthYear || undefined,
              city: profile.city || undefined,
              country: profile.country || undefined,
              visibility: profile.visibility,
              socialLinks: profile.socialLinks || {},
              notificationPreferences: {
                messages: profile.notificationPreferences?.messages ?? true,
                workouts: profile.notificationPreferences?.workouts ?? true,
                goals: profile.notificationPreferences?.goals ?? true,
                circles: profile.notificationPreferences?.circles ?? true,
              },
              galleryPhotos: (profile.galleryPhotos as Array<{
                id: string;
                url: string;
                visibility: "public" | "circles" | "private";
                visibleToCircles?: string[];
                caption?: string;
                uploadedAt: string;
              }>) || [],
            }
          : null
      }
      metrics={
        metrics
          ? {
              weight: metrics.weight || undefined,
              height: metrics.height || undefined,
              bodyFat: metrics.bodyFatPercentage || undefined,
              fitnessLevel: metrics.fitnessLevel || undefined,
            }
          : null
      }
      limitations={limitations.map((l) => ({
        id: l.id,
        type: l.type,
        bodyPart: l.bodyPart || undefined,
        condition: l.condition || undefined,
        description: l.description || undefined,
        severity: l.severity || undefined,
      }))}
      skills={skills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        currentStatus: s.currentStatus,
        allTimeBestStatus: s.allTimeBestStatus || undefined,
      }))}
      locations={locations.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        isActive: l.isActive ?? false,
      }))}
      sports={sports.map((s) => ({
        id: s.id,
        sport: s.sport,
        level: s.level || undefined,
        yearsPlaying: s.yearsPlaying || undefined,
        position: s.position || undefined,
        currentlyActive: s.currentlyActive,
      }))}
      circles={userCircles.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role || "member",
        memberCount: c.memberCount || 0,
        imageUrl: c.imageUrl || undefined,
      }))}
      goals={activeGoals.map((g) => ({
        id: g.id,
        title: g.title,
        targetValue: g.targetValue || undefined,
        currentValue: g.currentValue || undefined,
        unit: g.targetUnit || undefined,
        category: g.category || undefined,
      }))}
      workoutPlans={savedPlans.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || undefined,
      }))}
      personalRecords={deduplicatedPRs.map((pr) => ({
        id: pr.id,
        exerciseName: pr.exercise?.name || "Unknown",
        value: pr.value,
        unit: pr.unit,
      }))}
      badges={badges.map((b) => ({
        id: b.id,
        badgeId: b.badgeId,
        earnedAt: b.earnedAt.toISOString(),
        isFeatured: b.isFeatured,
        badge: {
          name: b.badge.name,
          description: b.badge.description || undefined,
          icon: b.badge.icon || undefined,
          imageUrl: b.badge.imageUrl || undefined,
          category: b.badge.category,
          tier: b.badge.tier,
          criteriaDescription: b.badge.criteriaDescription || undefined,
        },
      }))}
      featuredBadges={featuredBadges.map((b) => ({
        id: b.id,
        badgeId: b.badgeId,
        earnedAt: b.earnedAt.toISOString(),
        isFeatured: b.isFeatured,
        badge: {
          name: b.badge.name,
          description: b.badge.description || undefined,
          icon: b.badge.icon || undefined,
          imageUrl: b.badge.imageUrl || undefined,
          category: b.badge.category,
          tier: b.badge.tier,
          criteriaDescription: b.badge.criteriaDescription || undefined,
        },
      }))}
      completeness={{
        overallPercent: completeness.overallPercent,
        sections: completeness.sections,
        sectionStatuses: completeness.sectionStatuses,
        recommendations: completeness.recommendations,
      }}
    />
  );
}
