/**
 * User Data Export API - GDPR/CCPA Compliance
 * 
 * Provides users the right to access their personal data (data portability)
 * Exports all user data in JSON format
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  userProfiles,
  userMetrics,
  userSkills,
  userLimitations,
  userLocations,
  userBadges,
  userSports,
  circleMembers,
  workoutSessions,
  personalRecords,
  goals,
  challengeParticipants,
  programEnrollments,
  notifications,
  messages,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow more time for large exports

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all user data in parallel
    const [
      profile,
      metrics,
      skills,
      limitations,
      locations,
      badges,
      sports,
      memberships,
      workouts,
      prs,
      userGoals,
      challenges,
      programs,
      userNotifications,
      userMessages,
    ] = await Promise.all([
      // Profile data
      db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, userId),
      }),

      // Health metrics
      db
        .select()
        .from(userMetrics)
        .where(eq(userMetrics.userId, userId))
        .orderBy(desc(userMetrics.date)),

      // Skills
      db
        .select()
        .from(userSkills)
        .where(eq(userSkills.userId, userId)),

      // Limitations
      db
        .select()
        .from(userLimitations)
        .where(eq(userLimitations.userId, userId)),

      // Locations
      db
        .select()
        .from(userLocations)
        .where(eq(userLocations.userId, userId)),

      // Badges/achievements
      db.query.userBadges.findMany({
        where: eq(userBadges.userId, userId),
        with: {
          badge: true,
        },
      }),

      // Sports
      db
        .select()
        .from(userSports)
        .where(eq(userSports.userId, userId)),

      // Circle memberships
      db.query.circleMembers.findMany({
        where: eq(circleMembers.userId, userId),
        with: {
          circle: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Workout history (limit to last 2 years for performance)
      db.query.workoutSessions.findMany({
        where: eq(workoutSessions.memberId, session.activeCircle?.memberId || ""),
        orderBy: desc(workoutSessions.date),
        limit: 1000,
      }),

      // Personal records
      db.query.personalRecords.findMany({
        where: eq(personalRecords.memberId, session.activeCircle?.memberId || ""),
        with: {
          exercise: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Goals
      db
        .select()
        .from(goals)
        .where(eq(goals.memberId, session.activeCircle?.memberId || "")),

      // Challenge participation
      db.query.challengeParticipants.findMany({
        where: eq(challengeParticipants.userId, userId),
        with: {
          challenge: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Program enrollments
      db.query.programEnrollments.findMany({
        where: eq(programEnrollments.userId, userId),
        with: {
          program: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Notifications (last 6 months)
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(500),

      // Messages (last 6 months)
      db
        .select()
        .from(messages)
        .where(eq(messages.senderId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(500),
    ]);

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: "1.0",
      dataRetentionNotice: "Data retained per our privacy policy. Request deletion at /settings/privacy",
      
      account: {
        userId,
        email: session.user.email,
        name: session.user.name,
        createdAt: profile?.createdAt,
      },

      profile: profile ? {
        handle: profile.handle,
        displayName: profile.displayName,
        birthMonth: profile.birthMonth,
        birthYear: profile.birthYear,
        city: profile.city,
        country: profile.country,
        profilePicture: profile.profilePicture ? "[URL REDACTED]" : null,
        bio: profile.bio,
        visibility: profile.visibility,
        socialLinks: profile.socialLinks,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      } : null,

      healthMetrics: metrics.map(m => ({
        date: m.date,
        weight: m.weight,
        height: m.height,
        bodyFatPercentage: m.bodyFatPercentage,
        fitnessLevel: m.fitnessLevel,
        notes: m.notes,
      })),

      skills: skills.map(s => ({
        name: s.name,
        category: s.category,
        currentStatus: s.currentStatus,
        currentStatusDate: s.currentStatusDate,
        allTimeBestStatus: s.allTimeBestStatus,
        notes: s.notes,
      })),

      limitations: limitations.map(l => ({
        type: l.type,
        bodyPart: l.bodyPart,
        condition: l.condition,
        description: l.description,
        severity: l.severity,
        isHealed: l.isHealed,
        isChronicPermanent: l.isChronicPermanent,
        notes: l.notes,
        active: l.active,
      })),

      locations: locations.map(l => ({
        name: l.name,
        type: l.type,
        address: l.address,
        isActive: l.isActive,
        equipment: l.equipment,
        createdAt: l.createdAt,
      })),

      achievements: badges.map(b => ({
        badgeName: b.badge?.name,
        category: b.badge?.category,
        tier: b.badge?.tier,
        earnedAt: b.earnedAt,
        metadata: b.metadata,
      })),

      sports: sports.map(s => ({
        sport: s.sport,
        level: s.level,
        yearsPlaying: s.yearsPlaying,
        position: s.position,
        currentlyActive: s.currentlyActive,
        notes: s.notes,
      })),

      circleMemberships: memberships.map(m => ({
        circleName: m.circle?.name,
        role: m.role,
        joinedAt: m.createdAt,
      })),

      workoutHistory: workouts.map(w => ({
        name: w.name,
        date: w.date,
        status: w.status,
        startTime: w.startTime,
        endTime: w.endTime,
        rating: w.rating,
        notes: w.notes,
      })),

      personalRecords: prs.map(pr => ({
        exerciseName: pr.exercise?.name,
        value: pr.value,
        unit: pr.unit,
        date: pr.date,
        notes: pr.notes,
      })),

      goals: userGoals.map(g => ({
        title: g.title,
        description: g.description,
        category: g.category,
        targetValue: g.targetValue,
        targetUnit: g.targetUnit,
        currentValue: g.currentValue,
        targetDate: g.targetDate,
        status: g.status,
        createdAt: g.createdAt,
      })),

      challengeParticipation: challenges.map(c => ({
        challengeName: c.challenge?.name,
        status: c.status,
        startDate: c.startDate,
        currentDay: c.currentDay,
        currentStreak: c.currentStreak,
        longestStreak: c.longestStreak,
        daysCompleted: c.daysCompleted,
      })),

      programEnrollments: programs.map(p => ({
        programName: p.program?.name,
        status: p.status,
        startDate: p.startDate,
        currentWeek: p.currentWeek,
        currentDay: p.currentDay,
        workoutsCompleted: p.workoutsCompleted,
      })),

      notifications: userNotifications.map(n => ({
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        readAt: n.readAt,
      })),

      messagesSent: userMessages.map(m => ({
        recipientId: "[REDACTED]",
        content: m.content,
        createdAt: m.createdAt,
      })),
    };

    // Set headers for file download
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set(
      "Content-Disposition",
      `attachment; filename="data-export-${new Date().toISOString().split("T")[0]}.json"`
    );

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers,
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
