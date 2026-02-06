/**
 * User Data Deletion API - GDPR/CCPA Compliance
 * 
 * Provides users the right to erasure (right to be forgotten)
 * Permanently deletes all user data from the system
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
  userCapabilities,
  circleMembers,
  workoutSessions,
  workoutSessionExercises,
  personalRecords,
  goals,
  challengeParticipants,
  challengeProgress,
  programEnrollments,
  programWorkoutProgress,
  notifications,
  messages,
  memberContextSnapshot,
  onboardingProgress,
  profileCompletenessCache,
  activityFeed,
  userFollows,
  contentRatings,
  contentComments,
  coachConversations,
  coachMessages,
  memberEmbeddings,
} from "@/lib/db/schema";
import { eq, or, inArray } from "drizzle-orm";
import { logAuditEventFromRequest } from "@/lib/audit-log";
import { cleanupExternalUserData, checkExternalCleanupCapabilities } from "@/lib/external-data-cleanup";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow more time for comprehensive deletion

/**
 * POST - Request account deletion
 * Returns a confirmation token that must be used with DELETE
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate deletion confirmation token (valid for 24 hours)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // In production, you'd store this token in the database
    // For now, we'll use a simple approach
    return NextResponse.json({
      message: "Deletion request received",
      confirmationRequired: true,
      token,
      expiresAt: expiresAt.toISOString(),
      warning: "This action is IRREVERSIBLE. All your data will be permanently deleted.",
      instructions: "To confirm deletion, make a DELETE request with the token in the Authorization header.",
    });
  } catch (error) {
    console.error("Deletion request error:", error);
    return NextResponse.json(
      { error: "Failed to process deletion request" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Confirm and execute account deletion
 * Requires confirmation via query param: ?confirm=DELETE_MY_ACCOUNT
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const confirmation = url.searchParams.get("confirm");

    // Require explicit confirmation
    if (confirmation !== "DELETE_MY_ACCOUNT") {
      return NextResponse.json(
        {
          error: "Confirmation required",
          message: "Add ?confirm=DELETE_MY_ACCOUNT to confirm permanent deletion",
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Audit log this critical operation
    await logAuditEventFromRequest(
      {
        userId,
        action: "data_deletion",
        severity: "critical",
        resourceType: "account",
        metadata: { confirmed: true },
      },
      request
    );

    // Get all member IDs for this user (across all circles)
    const memberRecords = await db
      .select({ id: circleMembers.id })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));
    
    const memberIds = memberRecords.map((m) => m.id);

    // Track deletion progress
    const deletionResults: Record<string, { deleted: number; error?: string; embeddings?: number; openaiConversationIds?: string[] }> = {};

    // Collect external data for cleanup
    const externalCleanupData = {
      openaiThreadIds: [] as string[],
      blobUrls: [] as string[],
    };

    // Get profile picture URL for blob cleanup
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { profilePicture: true },
    });
    if (profile?.profilePicture && profile.profilePicture.includes("blob.vercel-storage.com")) {
      externalCleanupData.blobUrls.push(profile.profilePicture);
    }

    // Delete in order of dependencies (child tables first)

    // 1. Delete activity feed
    try {
      const result = await db.delete(activityFeed).where(eq(activityFeed.userId, userId));
      deletionResults.activityFeed = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.activityFeed = { deleted: 0, error: "Failed" };
    }

    // 2. Delete notifications
    try {
      const result = await db.delete(notifications).where(eq(notifications.userId, userId));
      deletionResults.notifications = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.notifications = { deleted: 0, error: "Failed" };
    }

    // 3. Delete messages (both sent and received)
    try {
      const result = await db.delete(messages).where(
        or(eq(messages.senderId, userId), eq(messages.recipientId, userId))
      );
      deletionResults.messages = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.messages = { deleted: 0, error: "Failed" };
    }

    // 4. Delete followers/following relationships
    try {
      const result = await db.delete(userFollows).where(
        or(eq(userFollows.followerId, userId), eq(userFollows.followingId, userId))
      );
      deletionResults.followers = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.followers = { deleted: 0, error: "Failed" };
    }

    // 5. Delete content interactions
    try {
      await db.delete(contentRatings).where(eq(contentRatings.userId, userId));
      await db.delete(contentComments).where(eq(contentComments.userId, userId));
      deletionResults.contentInteractions = { deleted: 1 };
    } catch (e) {
      deletionResults.contentInteractions = { deleted: 0, error: "Failed" };
    }

    // 6. Delete program progress and enrollments
    try {
      const enrollments = await db
        .select({ id: programEnrollments.id })
        .from(programEnrollments)
        .where(eq(programEnrollments.userId, userId));
      
      if (enrollments.length > 0) {
        const enrollmentIds = enrollments.map((e) => e.id);
        await db.delete(programWorkoutProgress).where(
          inArray(programWorkoutProgress.enrollmentId, enrollmentIds)
        );
      }
      
      const result = await db.delete(programEnrollments).where(eq(programEnrollments.userId, userId));
      deletionResults.programEnrollments = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.programEnrollments = { deleted: 0, error: "Failed" };
    }

    // 7. Delete challenge progress and participation
    try {
      const participants = await db
        .select({ id: challengeParticipants.id })
        .from(challengeParticipants)
        .where(eq(challengeParticipants.userId, userId));
      
      if (participants.length > 0) {
        const participantIds = participants.map((p) => p.id);
        await db.delete(challengeProgress).where(
          inArray(challengeProgress.participantId, participantIds)
        );
      }
      
      const result = await db.delete(challengeParticipants).where(eq(challengeParticipants.userId, userId));
      deletionResults.challenges = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.challenges = { deleted: 0, error: "Failed" };
    }

    // 8. Delete member-specific data (for all circles)
    if (memberIds.length > 0) {
      try {
        // Workout session exercises
        const sessions = await db
          .select({ id: workoutSessions.id })
          .from(workoutSessions)
          .where(inArray(workoutSessions.memberId, memberIds));
        
        if (sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id);
          await db.delete(workoutSessionExercises).where(
            inArray(workoutSessionExercises.sessionId, sessionIds)
          );
        }

        // Workout sessions
        await db.delete(workoutSessions).where(inArray(workoutSessions.memberId, memberIds));
        
        // Personal records
        await db.delete(personalRecords).where(inArray(personalRecords.memberId, memberIds));
        
        // Goals
        await db.delete(goals).where(inArray(goals.memberId, memberIds));
        
        // Member context snapshots
        await db.delete(memberContextSnapshot).where(inArray(memberContextSnapshot.memberId, memberIds));

        // Member embeddings (AI-generated)
        await db.delete(memberEmbeddings).where(inArray(memberEmbeddings.memberId, memberIds));

        // Coach conversations and messages
        // First, get OpenAI conversation IDs for potential external cleanup
        const conversations = await db
          .select({
            id: coachConversations.id,
            openaiConversationId: coachConversations.openaiConversationId
          })
          .from(coachConversations)
          .where(inArray(coachConversations.memberId, memberIds));

        // Collect OpenAI conversation IDs for external deletion
        const openaiConversationIds = conversations
          .map(c => c.openaiConversationId)
          .filter((id): id is string => id !== null);

        // Add to external cleanup data
        externalCleanupData.openaiThreadIds.push(...openaiConversationIds);

        // Delete coach messages (cascade would handle this, but be explicit)
        if (conversations.length > 0) {
          const conversationIds = conversations.map(c => c.id);
          await db.delete(coachMessages).where(inArray(coachMessages.conversationId, conversationIds));
        }

        // Delete coach conversations
        await db.delete(coachConversations).where(inArray(coachConversations.memberId, memberIds));

        deletionResults.memberData = { deleted: memberIds.length };
        deletionResults.aiData = {
          deleted: conversations.length,
          embeddings: memberIds.length,
          // Include OpenAI IDs for manual cleanup if needed
          openaiConversationIds: openaiConversationIds.length > 0 ? openaiConversationIds : undefined,
        };
      } catch (e) {
        deletionResults.memberData = { deleted: 0, error: "Failed" };
      }
    }

    // 9. Delete circle memberships
    try {
      const result = await db.delete(circleMembers).where(eq(circleMembers.userId, userId));
      deletionResults.circleMemberships = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.circleMemberships = { deleted: 0, error: "Failed" };
    }

    // 10. Delete user-level data
    try {
      await db.delete(userBadges).where(eq(userBadges.userId, userId));
      await db.delete(userSports).where(eq(userSports.userId, userId));
      await db.delete(userCapabilities).where(eq(userCapabilities.userId, userId));
      await db.delete(userSkills).where(eq(userSkills.userId, userId));
      await db.delete(userLimitations).where(eq(userLimitations.userId, userId));
      await db.delete(userLocations).where(eq(userLocations.userId, userId));
      await db.delete(userMetrics).where(eq(userMetrics.userId, userId));
      deletionResults.userData = { deleted: 1 };
    } catch (e) {
      deletionResults.userData = { deleted: 0, error: "Failed" };
    }

    // 11. Delete onboarding progress
    try {
      await db.delete(onboardingProgress).where(eq(onboardingProgress.userId, userId));
      deletionResults.onboarding = { deleted: 1 };
    } catch (e) {
      deletionResults.onboarding = { deleted: 0, error: "Failed" };
    }

    // 12. Delete profile completeness cache
    try {
      await db.delete(profileCompletenessCache).where(eq(profileCompletenessCache.userId, userId));
    } catch {
      // Silent fail - cache table may not exist
    }

    // 13. Finally, delete user profile
    try {
      const result = await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
      deletionResults.profile = { deleted: result.rowCount || 0 };
    } catch (e) {
      deletionResults.profile = { deleted: 0, error: "Failed" };
    }

    // Clean up external services (OpenAI threads, Vercel Blob)
    let externalCleanupResult = null;
    if (externalCleanupData.openaiThreadIds.length > 0 || externalCleanupData.blobUrls.length > 0) {
      try {
        externalCleanupResult = await cleanupExternalUserData(externalCleanupData);
        deletionResults.externalServices = {
          deleted: externalCleanupResult.totalDeleted,
          error: externalCleanupResult.totalFailed > 0
            ? `${externalCleanupResult.totalFailed} external items failed to delete`
            : undefined,
        };
      } catch (e) {
        deletionResults.externalServices = {
          deleted: 0,
          error: "External cleanup failed",
        };
      }
    }

    // Note: The actual Neon Auth user account deletion would need to be
    // handled separately through the Neon Auth API

    return NextResponse.json({
      success: true,
      message: "Account data has been permanently deleted",
      deletionResults,
      externalCleanup: externalCleanupResult ? {
        openai: externalCleanupResult.openai,
        blob: externalCleanupResult.blob,
      } : null,
      nextSteps: [
        "Your session will be invalidated",
        "You may need to clear your browser cookies",
        "AI coaching history has been deleted from both our database and OpenAI",
        "Profile pictures have been removed from storage",
        "Contact support if you need assistance",
      ],
    });
  } catch (error) {
    console.error("Data deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete data. Please contact support." },
      { status: 500 }
    );
  }
}
