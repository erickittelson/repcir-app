/**
 * User Data Export API - GDPR/CCPA Compliance
 * 
 * Provides users the right to access their personal data (data portability)
 * Exports all user data in JSON format
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAuditEventFromRequest } from "@/lib/audit-log";
import {
  userProfiles,
  userMetrics,
  userSkills,
  userLimitations,
  userLocations,
  userBadges,
  userSports,
  userCapabilities,
  userPrivacySettings,
  userFollows,
  circleMembers,
  workoutSessions,
  personalRecords,
  goals,
  challengeParticipants,
  programEnrollments,
  notifications,
  messages,
  activityFeed,
  contentRatings,
  contentComments,
  coachConversations,
  coachMessages,
  onboardingProgress,
  connections,
  circlePosts,
  circlePostComments,
  circlePostLikes,
  posts,
  postLikes,
  postComments,
} from "@/lib/db/schema";
import { eq, desc, or, inArray } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow more time for large exports

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Audit log this data export operation
    await logAuditEventFromRequest(
      {
        userId,
        action: "data_export",
        severity: "warning",
        resourceType: "account",
      },
      request
    );

    // Get member IDs for this user (across all circles)
    const memberRecords = await db
      .select({ id: circleMembers.id })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));
    const memberIds = memberRecords.map((m) => m.id);

    // Fetch all user data in parallel
    const [
      profile,
      metrics,
      skills,
      limitations,
      locations,
      badges,
      sports,
      capabilities,
      privacySettings,
      followers,
      following,
      memberships,
      workouts,
      prs,
      userGoals,
      challenges,
      programs,
      userNotifications,
      userMessages,
      activity,
      ratings,
      comments,
      aiConversations,
      onboarding,
      userConnections,
      userCirclePosts,
      userCirclePostLikes,
      userCirclePostComments,
      userIndividualPosts,
      userPostLikes,
      userPostComments,
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

      // Capabilities
      db
        .select()
        .from(userCapabilities)
        .where(eq(userCapabilities.userId, userId)),

      // Privacy settings
      db.query.userPrivacySettings.findFirst({
        where: eq(userPrivacySettings.userId, userId),
      }),

      // Followers
      db
        .select()
        .from(userFollows)
        .where(eq(userFollows.followingId, userId)),

      // Following
      db
        .select()
        .from(userFollows)
        .where(eq(userFollows.followerId, userId)),

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

      // Workout history (all members, limit for performance)
      memberIds.length > 0
        ? db.query.workoutSessions.findMany({
            where: inArray(workoutSessions.memberId, memberIds),
            orderBy: desc(workoutSessions.date),
            limit: 1000,
          })
        : [],

      // Personal records (all members)
      memberIds.length > 0
        ? db.query.personalRecords.findMany({
            where: inArray(personalRecords.memberId, memberIds),
            with: {
              exercise: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        : [],

      // Goals (all members)
      memberIds.length > 0
        ? db
            .select()
            .from(goals)
            .where(inArray(goals.memberId, memberIds))
        : [],

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

      // Messages (sent and received)
      db
        .select()
        .from(messages)
        .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
        .orderBy(desc(messages.createdAt))
        .limit(1000),

      // Activity feed
      db
        .select()
        .from(activityFeed)
        .where(eq(activityFeed.userId, userId))
        .orderBy(desc(activityFeed.createdAt))
        .limit(500),

      // Content ratings
      db
        .select()
        .from(contentRatings)
        .where(eq(contentRatings.userId, userId)),

      // Content comments
      db
        .select()
        .from(contentComments)
        .where(eq(contentComments.userId, userId)),

      // AI coach conversations with messages (important for GDPR)
      memberIds.length > 0
        ? (async () => {
            const conversations = await db.query.coachConversations.findMany({
              where: inArray(coachConversations.memberId, memberIds),
            });
            if (conversations.length === 0) return [];
            const conversationIds = conversations.map((c) => c.id);
            const msgs = await db
              .select()
              .from(coachMessages)
              .where(inArray(coachMessages.conversationId, conversationIds))
              .orderBy(desc(coachMessages.createdAt));
            return conversations.map((c) => ({
              ...c,
              messages: msgs.filter((m) => m.conversationId === c.id),
            }));
          })()
        : [],

      // Onboarding progress
      db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.userId, userId),
      }),

      // Connections (all directions)
      db
        .select()
        .from(connections)
        .where(or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId))),

      // Circle posts authored by user
      db.query.circlePosts.findMany({
        where: eq(circlePosts.authorId, userId),
        orderBy: desc(circlePosts.createdAt),
        limit: 1000,
      }),

      // Circle post likes by user
      db
        .select()
        .from(circlePostLikes)
        .where(eq(circlePostLikes.userId, userId)),

      // Circle post comments by user
      db
        .select()
        .from(circlePostComments)
        .where(eq(circlePostComments.authorId, userId)),

      // Individual posts authored by user
      db.query.posts.findMany({
        where: eq(posts.authorId, userId),
        orderBy: desc(posts.createdAt),
        limit: 1000,
      }),

      // Individual post likes by user
      db
        .select()
        .from(postLikes)
        .where(eq(postLikes.userId, userId)),

      // Individual post comments by user
      db
        .select()
        .from(postComments)
        .where(eq(postComments.authorId, userId)),
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

      messages: userMessages.map(m => ({
        direction: m.senderId === userId ? "sent" : "received",
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),

      capabilities: capabilities.map(c => ({
        assessedAt: c.assessedAt,
        mobility: {
          canTouchToes: c.canTouchToes,
          canDeepSquat: c.canDeepSquat,
          canChildsPose: c.canChildsPose,
          canOverheadReach: c.canOverheadReach,
          canLungeDeep: c.canLungeDeep,
        },
        stability: {
          canSingleLegStand: c.canSingleLegStand,
          canPlankHold: c.canPlankHold,
        },
        power: {
          canBoxJump: c.canBoxJump,
          canJumpRope: c.canJumpRope,
        },
      })),

      privacySettings: privacySettings ? {
        nameVisibility: privacySettings.nameVisibility,
        profilePictureVisibility: privacySettings.profilePictureVisibility,
        cityVisibility: privacySettings.cityVisibility,
        fitnessLevelVisibility: privacySettings.fitnessLevelVisibility,
        goalsVisibility: privacySettings.goalsVisibility,
        workoutHistoryVisibility: privacySettings.workoutHistoryVisibility,
        personalRecordsVisibility: privacySettings.personalRecordsVisibility,
        updatedAt: privacySettings.updatedAt,
      } : null,

      socialConnections: {
        followers: followers.map(f => ({
          followerId: f.followerId,
          createdAt: f.createdAt,
        })),
        following: following.map(f => ({
          followingId: f.followingId,
          createdAt: f.createdAt,
        })),
        connections: userConnections.map(c => ({
          otherUserId: c.requesterId === userId ? c.addresseeId : c.requesterId,
          direction: c.requesterId === userId ? "outgoing" : "incoming",
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      },

      activityFeed: activity.map(a => ({
        type: a.activityType,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),

      contentInteractions: {
        ratings: ratings.map(r => ({
          contentType: r.contentType,
          rating: r.rating,
          createdAt: r.createdAt,
        })),
        comments: comments.map(c => ({
          contentType: c.contentType,
          content: c.content,
          createdAt: c.createdAt,
        })),
      },

      aiCoachingHistory: aiConversations.map(c => ({
        title: c.title,
        mode: c.mode,
        messageCount: c.messages?.length || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages?.map((m: { role: string; content: string; createdAt: Date }) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })) || [],
      })),

      circlePosts: userCirclePosts.map(p => ({
        circleId: p.circleId,
        content: p.content,
        imageUrl: p.imageUrl ? "[URL REDACTED]" : null,
        visibility: p.visibility,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      })),

      circlePostInteractions: {
        likes: userCirclePostLikes.map(l => ({
          postId: l.postId,
          createdAt: l.createdAt,
        })),
        comments: userCirclePostComments.map(c => ({
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt,
        })),
      },

      individualPosts: userIndividualPosts.map(p => ({
        content: p.content,
        imageUrl: p.imageUrl ? "[URL REDACTED]" : null,
        visibility: p.visibility,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      })),

      individualPostInteractions: {
        likes: userPostLikes.map(l => ({
          postId: l.postId,
          createdAt: l.createdAt,
        })),
        comments: userPostComments.map(c => ({
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt,
        })),
      },

      onboardingData: onboarding ? {
        currentPhase: onboarding.currentPhase,
        extractedData: onboarding.extractedData,
        completedAt: onboarding.completedAt,
        createdAt: onboarding.createdAt,
      } : null,
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
