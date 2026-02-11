/**
 * Neon Auth Server - February 2026
 *
 * Unified auth instance using createNeonAuth (v0.2).
 * Provides server-side auth, route handler, and middleware.
 */

import { createNeonAuth } from "@neondatabase/auth/next/server";

// Lazy initialization to avoid build-time errors when env vars aren't available
let _auth: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    _auth = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      },
    });
  }
  return _auth;
}

// Proxy for convenient import: `import { auth } from "@/lib/neon-auth/server"`
export const auth = new Proxy({} as ReturnType<typeof createNeonAuth>, {
  get(_, prop) {
    return getAuth()[prop as keyof ReturnType<typeof createNeonAuth>];
  },
});
