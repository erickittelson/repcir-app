import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy for the Family Workout App (Next.js 16+)
 *
 * Handles:
 * - API caching headers
 * - Security headers
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Add security headers to all responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // API route caching headers
  if (pathname.startsWith("/api/")) {
    // Default: no caching for API routes
    response.headers.set("Cache-Control", "no-store, max-age=0");

    // Static data endpoints can be cached
    if (pathname === "/api/exercises" && request.method === "GET") {
      // Exercises list can be cached for 5 minutes
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );
    }

    if (pathname === "/api/equipment" && request.method === "GET") {
      // Equipment list can be cached for 1 minute
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=120"
      );
    }

    if (pathname === "/api/health") {
      // Health check - cache for 10 seconds
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=10, stale-while-revalidate=30"
      );
    }

    // Analytics endpoints can be cached briefly
    if (pathname === "/api/analytics" && request.method === "GET") {
      response.headers.set(
        "Cache-Control",
        "private, s-maxage=60, stale-while-revalidate=120"
      );
    }
  }

  return response;
}

// Only run proxy on API routes and specific paths
export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
