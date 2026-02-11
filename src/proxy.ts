import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy for the Repcir App (Next.js 16+)
 *
 * Handles:
 * - URL rewrites (e.g., /@handle -> /u/handle)
 * - API caching headers
 * - Security headers
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle @handle URLs - rewrite to /u/handle
  // Match paths like /@username (but not /@ alone)
  if (pathname.match(/^\/@[a-zA-Z][a-zA-Z0-9_]*$/)) {
    const handle = pathname.slice(2); // Remove "/@" prefix
    const url = request.nextUrl.clone();
    url.pathname = `/u/${handle}`;
    return NextResponse.rewrite(url);
  }

  const response = NextResponse.next();

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

// Only run proxy on API routes, @handle routes, and specific paths
export const config = {
  matcher: [
    "/api/:path*",
    "/@:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
