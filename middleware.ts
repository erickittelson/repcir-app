import { auth } from "@/lib/neon-auth/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Neon Auth middleware handles session validation and route protection
const authMiddleware = auth.middleware({
  loginUrl: "/login",
});

// Public routes that don't need auth
const publicPatterns = [
  /^\/$/, // home
  /^\/login/,
  /^\/signup/,
  /^\/auth\//,
  /^\/privacy/,
  /^\/terms/,
  /^\/support/,
  /^\/invite\//,
  /^\/_next\//,
  /^\/favicon\.ico/,
  /^\/manifest\.json/,
  /^\/sw\.js/,
  /^\/icons\//,
  /^\/images\//,
];

function isPublicRoute(pathname: string): boolean {
  return publicPatterns.some((pattern) => pattern.test(pathname));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle @handle URLs - rewrite to /u/handle
  if (pathname.match(/^\/@[a-zA-Z][a-zA-Z0-9_]*$/)) {
    const handle = pathname.slice(2);
    const url = request.nextUrl.clone();
    url.pathname = `/u/${handle}`;
    return NextResponse.rewrite(url);
  }

  // Skip auth middleware for public routes and API routes
  // API routes handle their own auth (return 401 JSON, not redirects)
  if (isPublicRoute(pathname) || pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Run Neon Auth middleware for protected routes
  const response = await authMiddleware(request);

  // Add security headers
  if (response) {
    addSecurityHeaders(response);
  }

  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
