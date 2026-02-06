/**
 * Notifications Service
 *
 * Handles creating in-app notifications and sending push notifications.
 * Respects user preferences per category.
 */

import webpush, { PushSubscription } from "web-push";
import { db } from "@/lib/db";
import { notifications, userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Configure web-push with VAPID keys
// In production, these should be in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@rallyproof.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Notification types
export type NotificationType =
  | "message"
  | "workout_reminder"
  | "goal_achieved"
  | "circle_invite"
  | "circle_request"
  | "streak_milestone"
  | "mention"
  | "circle_mention"
  | "system";

// Notification category mapping (for user preferences)
const TYPE_TO_CATEGORY: Record<NotificationType, string> = {
  message: "messages",
  workout_reminder: "workouts",
  goal_achieved: "goals",
  circle_invite: "circles",
  circle_request: "circles",
  streak_milestone: "goals",
  mention: "messages",
  circle_mention: "circles",
  system: "messages", // System notifications always go through
};

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  /** Skip user preference check (for critical notifications) */
  force?: boolean;
}

interface NotificationPreferences {
  messages?: boolean;
  workouts?: boolean;
  goals?: boolean;
  circles?: boolean;
}

/**
 * Create a notification for a user
 * Checks user preferences before creating
 */
export async function createNotification(
  options: CreateNotificationOptions
): Promise<{ id: string; pushSent: boolean } | null> {
  const { userId, type, title, body, data, actionUrl, force = false } = options;

  try {
    // Get user profile to check preferences
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    // Check if notification category is enabled (unless forced)
    if (!force && userProfile?.notificationPreferences) {
      const prefs = userProfile.notificationPreferences as NotificationPreferences;
      const category = TYPE_TO_CATEGORY[type];
      if (prefs[category as keyof NotificationPreferences] === false) {
        // User has disabled this notification category
        return null;
      }
    }

    // Create the notification in database
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        body,
        data: data as Record<string, unknown>,
        actionUrl,
      })
      .returning();

    // Send push notification if user has a subscription
    let pushSent = false;
    if (userProfile?.pushSubscription && VAPID_PRIVATE_KEY) {
      try {
        const subscription = userProfile.pushSubscription as PushSubscription;
        await sendPushNotification(subscription, {
          title,
          body: body || "",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          data: {
            notificationId: notification.id,
            actionUrl,
            ...data,
          },
        });
        pushSent = true;
      } catch (pushError) {
        // Handle invalid subscription (user unsubscribed)
        if (
          pushError instanceof Error &&
          (pushError.message.includes("410") || pushError.message.includes("404"))
        ) {
          // Remove invalid subscription
          await db
            .update(userProfiles)
            .set({ pushSubscription: null })
            .where(eq(userProfiles.userId, userId));
        }
        console.error("Push notification failed:", pushError);
      }
    }

    return { id: notification.id, pushSent };
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

/**
 * Send a push notification
 */
async function sendPushNotification(
  subscription: PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        eq(notifications.id, notificationId)
      );
    return true;
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.userId, userId));
    return true;
  } catch (error) {
    console.error("Failed to mark all notifications read:", error);
    return false;
  }
}

/**
 * Dismiss a notification (hide without marking read)
 */
export async function dismissNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ dismissedAt: new Date() })
      .where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("Failed to dismiss notification:", error);
    return false;
  }
}

/**
 * Send notification for a new message
 */
export async function notifyNewMessage(
  recipientId: string,
  senderId: string,
  senderName: string,
  messagePreview: string
): Promise<void> {
  await createNotification({
    userId: recipientId,
    type: "message",
    title: `New message from ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + "..." : messagePreview,
    data: { senderId },
    actionUrl: `/messages/${senderId}`,
  });
}

/**
 * Send notification for a circle request
 */
export async function notifyCircleRequest(
  targetUserId: string,
  requesterName: string,
  circleName: string,
  requestId: string
): Promise<void> {
  await createNotification({
    userId: targetUserId,
    type: "circle_request",
    title: `${requesterName} wants to add you to ${circleName}`,
    body: "Tap to view and respond to the request",
    data: { requestId },
    actionUrl: `/circles/requests/${requestId}`,
  });
}

/**
 * Send notification for goal achievement
 */
export async function notifyGoalAchieved(
  userId: string,
  goalName: string,
  goalId: string
): Promise<void> {
  await createNotification({
    userId,
    type: "goal_achieved",
    title: "Goal achieved!",
    body: `Congratulations! You've reached your goal: ${goalName}`,
    data: { goalId },
    actionUrl: `/goals/${goalId}`,
  });
}

/**
 * Send workout reminder notification
 */
export async function notifyWorkoutReminder(
  userId: string,
  workoutName: string
): Promise<void> {
  await createNotification({
    userId,
    type: "workout_reminder",
    title: "Time to workout!",
    body: workoutName ? `Your scheduled workout: ${workoutName}` : "Don't forget to get your workout in today!",
    actionUrl: "/workouts",
  });
}

/**
 * Send notification when a user is mentioned in a post
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionerName: string,
  postId: string,
  circleId: string,
  contentPreview: string
): Promise<void> {
  await createNotification({
    userId: mentionedUserId,
    type: "mention",
    title: `${mentionerName} mentioned you`,
    body: contentPreview.length > 100 ? contentPreview.slice(0, 97) + "..." : contentPreview,
    data: { postId, circleId },
    actionUrl: `/circle/${circleId}?post=${postId}`,
  });
}

/**
 * Send notification to all members of a circle when the circle is mentioned
 */
export async function notifyCircleMention(
  memberUserIds: string[],
  mentionerUserId: string,
  mentionerName: string,
  circleName: string,
  postId: string,
  sourceCircleId: string,
  contentPreview: string
): Promise<void> {
  // Don't notify the person who made the post
  const recipientIds = memberUserIds.filter(id => id !== mentionerUserId);

  await Promise.all(
    recipientIds.map(userId =>
      createNotification({
        userId,
        type: "circle_mention",
        title: `${circleName} was mentioned by ${mentionerName}`,
        body: contentPreview.length > 100 ? contentPreview.slice(0, 97) + "..." : contentPreview,
        data: { postId, circleId: sourceCircleId, mentionedCircle: circleName },
        actionUrl: `/circle/${sourceCircleId}?post=${postId}`,
      })
    )
  );
}

// Export VAPID public key for client-side subscription
export { VAPID_PUBLIC_KEY };
