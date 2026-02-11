/**
 * Neon Auth Session Helper - January 2026
 *
 * Provides session management with Neon Auth.
 * Users can belong to multiple circles - session includes active circle context.
 * Active circle is stored in a cookie for persistence.
 */

import { auth } from "./server";
import { db } from "@/lib/db";
import { circleMembers, circles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const ACTIVE_CIRCLE_COOKIE = "active_circle";

// Session interface for the app
export interface AppSession {
  user: {
    id: string; // Neon Auth user ID
    name: string;
    email: string;
    image?: string;
  };
  // Active circle context (user's currently selected circle)
  activeCircle?: {
    id: string;
    name: string;
    role: string; // owner, admin, member
    memberId: string; // The circle_members.id for this user in this circle
    isSystemCircle: boolean; // true for "My Training" personal circle
  };
  // All circles the user belongs to
  circles: Array<{
    id: string;
    name: string;
    role: string;
    memberId: string;
    isSystemCircle: boolean;
  }>;
  // Backward compatibility - maps to activeCircle.id
  circleId: string;
}

/**
 * Get the current session from Neon Auth
 */
export async function getSession(): Promise<AppSession | null> {
  try {
    const neonSession = await auth.getSession();

    if (!neonSession?.data?.session?.userId) {
      return null;
    }

    const sessionData = neonSession.data;
    const neonUser = sessionData.user;
    const userId = sessionData.session.userId;

    // Get all circles this user belongs to
    const userCircles = await db
      .select({
        circleId: circles.id,
        circleName: circles.name,
        role: circleMembers.role,
        memberId: circleMembers.id,
        isSystemCircle: circles.isSystemCircle,
      })
      .from(circleMembers)
      .innerJoin(circles, eq(circleMembers.circleId, circles.id))
      .where(eq(circleMembers.userId, userId));

    const circlesList = userCircles.map((c) => ({
      id: c.circleId,
      name: c.circleName,
      role: c.role || "member",
      memberId: c.memberId,
      isSystemCircle: c.isSystemCircle,
    }));

    // Check for active circle in cookie
    const cookieStore = await cookies();
    const activeCircleCookie = cookieStore.get(ACTIVE_CIRCLE_COOKIE)?.value;

    // Find the active circle from cookie or default
    let activeCircle = circlesList.find((c) => c.id === activeCircleCookie);
    if (!activeCircle && circlesList.length > 0) {
      // Prefer a group circle over the system circle as default
      activeCircle = circlesList.find((c) => !c.isSystemCircle) || circlesList[0];
    }

    return {
      user: {
        id: userId,
        name: neonUser?.name || "User",
        email: neonUser?.email || "",
        image: neonUser?.image || undefined,
      },
      activeCircle,
      circles: circlesList,
      // Backward compatibility for API routes using session.circleId
      circleId: activeCircle?.id || "",
    };
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AppSession> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/**
 * Require a circle - redirects to circle selection if user has no circles
 */
export async function requireCircle(): Promise<AppSession & { activeCircle: NonNullable<AppSession["activeCircle"]> }> {
  const session = await requireAuth();

  if (!session.activeCircle) {
    redirect("/onboarding");
  }

  return session as AppSession & { activeCircle: NonNullable<AppSession["activeCircle"]> };
}

/**
 * Get member ID for the current user in the active circle
 */
export async function getCurrentMemberId(): Promise<string | null> {
  const session = await getSession();
  return session?.activeCircle?.memberId || null;
}

/**
 * Switch active circle for a user
 * Sets a cookie to persist the selection
 */
export async function switchCircle(circleId: string): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  // Verify user belongs to this circle
  const circle = session.circles.find((c) => c.id === circleId);
  if (!circle) {
    return false;
  }

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CIRCLE_COOKIE, circleId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return true;
}

// Legacy export for backward compatibility during migration
export { getSession as getUnifiedSession };
export type { AppSession as UnifiedSession };
