import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";

export interface AuthenticatedSession {
  user: {
    id: string;
    email?: string;
  };
  activeCircle?: {
    id: string;
    name: string;
    role: string;
    memberId: string;
  };
}

type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  session: AuthenticatedSession,
  context?: T
) => Promise<NextResponse>;

/**
 * Higher-order function to wrap API routes with authentication
 * 
 * Usage:
 * ```ts
 * export const GET = withAuth(async (req, session) => {
 *   // session is guaranteed to be valid
 *   return NextResponse.json({ userId: session.user.id });
 * });
 * ```
 */
export function withAuth<T = unknown>(handler: AuthenticatedHandler<T>) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    return handler(request, session, context);
  };
}

/**
 * Wrapper that also requires an active circle membership
 */
export function withCircleMembership<T = unknown>(handler: AuthenticatedHandler<T>) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!session.activeCircle?.memberId) {
      return NextResponse.json(
        { error: "No active circle", message: "Please select a circle" },
        { status: 403 }
      );
    }

    return handler(request, session, context);
  };
}

/**
 * Check if user has admin role in the active circle
 */
export async function checkCircleAdmin(session: AuthenticatedSession): Promise<boolean> {
  // This would need to be implemented based on your circleMembers schema
  // For now, return false as a placeholder
  return false;
}

/**
 * Rate limiting wrapper (simple in-memory, use Redis for production)
 */
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function withRateLimit(
  handler: AuthenticatedHandler,
  options: { limit: number; windowMs: number } = { limit: 60, windowMs: 60000 }
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const key = session.user.id;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    const record = rateLimitMap.get(key);
    
    if (!record || record.timestamp < windowStart) {
      rateLimitMap.set(key, { count: 1, timestamp: now });
    } else if (record.count >= options.limit) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: Math.ceil((record.timestamp + options.windowMs - now) / 1000) },
        { status: 429 }
      );
    } else {
      record.count++;
    }

    return handler(request, session, context);
  };
}
