/**
 * Mention Parser Utility
 *
 * Parses @username and #circle mentions from text content.
 * Used for tagging users and circles in posts and comments.
 */

import { db } from "@/lib/db";
import { userProfiles, circles, circleMembers } from "@/lib/db/schema";
import { eq, ilike, inArray } from "drizzle-orm";

// Regex patterns for mentions
// @username - matches word characters, numbers, underscores (standard handle format)
const USER_MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
// #circle or @circle: - matches circle names (word characters, numbers, spaces within quotes or simple names)
const CIRCLE_MENTION_REGEX = /#([a-zA-Z0-9_]+)/g;

export interface ParsedMention {
  type: "user" | "circle";
  raw: string; // The full match including @ or #
  handle: string; // The handle/name without the @ or #
  startIndex: number;
  endIndex: number;
}

export interface ResolvedUserMention {
  type: "user";
  raw: string;
  handle: string;
  userId: string;
  displayName: string | null;
  profilePicture: string | null;
}

export interface ResolvedCircleMention {
  type: "circle";
  raw: string;
  handle: string;
  circleId: string;
  circleName: string;
  memberUserIds: string[];
}

export type ResolvedMention = ResolvedUserMention | ResolvedCircleMention;

/**
 * Parse mentions from text content
 * Returns array of parsed mentions with their positions
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];

  // Find user mentions
  let match;
  const userRegex = new RegExp(USER_MENTION_REGEX);
  while ((match = userRegex.exec(text)) !== null) {
    mentions.push({
      type: "user",
      raw: match[0],
      handle: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Find circle mentions
  const circleRegex = new RegExp(CIRCLE_MENTION_REGEX);
  while ((match = circleRegex.exec(text)) !== null) {
    mentions.push({
      type: "circle",
      raw: match[0],
      handle: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Sort by position
  return mentions.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Resolve parsed mentions to actual users and circles
 * Returns only mentions that match real users/circles
 */
export async function resolveMentions(
  parsedMentions: ParsedMention[]
): Promise<ResolvedMention[]> {
  const resolved: ResolvedMention[] = [];

  // Separate user and circle mentions
  const userHandles = parsedMentions
    .filter((m) => m.type === "user")
    .map((m) => m.handle.toLowerCase());

  const circleHandles = parsedMentions
    .filter((m) => m.type === "circle")
    .map((m) => m.handle.toLowerCase());

  // Resolve user mentions
  if (userHandles.length > 0) {
    const users = await db
      .select({
        userId: userProfiles.userId,
        handle: userProfiles.handle,
        displayName: userProfiles.displayName,
        profilePicture: userProfiles.profilePicture,
      })
      .from(userProfiles)
      .where(
        // Check each handle case-insensitively
        inArray(
          userProfiles.handle,
          userHandles
        )
      );

    // Map users to their mentions
    for (const mention of parsedMentions.filter((m) => m.type === "user")) {
      const user = users.find(
        (u) => u.handle?.toLowerCase() === mention.handle.toLowerCase()
      );
      if (user && user.handle) {
        resolved.push({
          type: "user",
          raw: mention.raw,
          handle: user.handle,
          userId: user.userId,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
        });
      }
    }
  }

  // Resolve circle mentions (by name or handle-like identifier)
  if (circleHandles.length > 0) {
    // Search circles by name matching the handle
    const matchedCircles = await db
      .select({
        id: circles.id,
        name: circles.name,
      })
      .from(circles)
      .where(
        // Match circle name case-insensitively
        inArray(
          circles.name,
          circleHandles
        )
      );

    // For each matched circle, get members
    for (const mention of parsedMentions.filter((m) => m.type === "circle")) {
      const circle = matchedCircles.find(
        (c) => c.name.toLowerCase() === mention.handle.toLowerCase()
      );

      if (circle) {
        // Get all member user IDs for this circle
        const members = await db
          .select({ userId: circleMembers.userId })
          .from(circleMembers)
          .where(eq(circleMembers.circleId, circle.id));

        resolved.push({
          type: "circle",
          raw: mention.raw,
          handle: mention.handle,
          circleId: circle.id,
          circleName: circle.name,
          memberUserIds: members.map((m) => m.userId).filter((id): id is string => id !== null),
        });
      }
    }
  }

  return resolved;
}

/**
 * Parse and resolve mentions in one step
 */
export async function parseAndResolveMentions(
  text: string
): Promise<ResolvedMention[]> {
  const parsed = parseMentions(text);
  if (parsed.length === 0) return [];
  return resolveMentions(parsed);
}

/**
 * Search for users to mention (for autocomplete)
 */
export async function searchUsersForMention(
  query: string,
  currentUserId: string,
  limit: number = 5
): Promise<Array<{
  userId: string;
  handle: string;
  displayName: string | null;
  profilePicture: string | null;
}>> {
  if (!query || query.length < 1) return [];

  const searchPattern = `${query}%`;

  const users = await db
    .select({
      userId: userProfiles.userId,
      handle: userProfiles.handle,
      displayName: userProfiles.displayName,
      profilePicture: userProfiles.profilePicture,
    })
    .from(userProfiles)
    .where(ilike(userProfiles.handle, searchPattern))
    .limit(limit);

  // Filter out current user and users without handles
  return users.filter(
    (u) => u.handle && u.userId !== currentUserId
  ) as Array<{
    userId: string;
    handle: string;
    displayName: string | null;
    profilePicture: string | null;
  }>;
}

/**
 * Search for circles to mention (for autocomplete)
 */
export async function searchCirclesForMention(
  query: string,
  limit: number = 5
): Promise<Array<{
  circleId: string;
  name: string;
  imageUrl: string | null;
  memberCount: number;
}>> {
  if (!query || query.length < 1) return [];

  const searchPattern = `${query}%`;

  const matchedCircles = await db
    .select({
      id: circles.id,
      name: circles.name,
      imageUrl: circles.imageUrl,
      memberCount: circles.memberCount,
    })
    .from(circles)
    .where(ilike(circles.name, searchPattern))
    .limit(limit);

  return matchedCircles.map((c) => ({
    circleId: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    memberCount: c.memberCount || 0,
  }));
}

/**
 * Highlight mentions in text for display
 * Returns text with mention markers that can be styled
 */
export function highlightMentions(text: string): string {
  // Replace user mentions with styled spans
  let highlighted = text.replace(
    USER_MENTION_REGEX,
    '<span class="mention mention-user">@$1</span>'
  );

  // Replace circle mentions with styled spans
  highlighted = highlighted.replace(
    CIRCLE_MENTION_REGEX,
    '<span class="mention mention-circle">#$1</span>'
  );

  return highlighted;
}

/**
 * Check if text contains any mentions
 */
export function hasMentions(text: string): boolean {
  return USER_MENTION_REGEX.test(text) || CIRCLE_MENTION_REGEX.test(text);
}
