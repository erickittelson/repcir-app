/**
 * Neon Auth Server - January 2026
 *
 * Server-side auth utilities for API routes and Server Components.
 */

import { createAuthServer } from "@neondatabase/auth/next/server";

// Lazy initialization to avoid build-time errors when env vars aren't available
let _authServer: ReturnType<typeof createAuthServer> | null = null;

export function getAuthServer() {
  if (!_authServer) {
    _authServer = createAuthServer();
  }
  return _authServer;
}

// Legacy export for backward compatibility - uses getter
export const authServer = new Proxy({} as ReturnType<typeof createAuthServer>, {
  get(_, prop) {
    return getAuthServer()[prop as keyof ReturnType<typeof createAuthServer>];
  },
});

// Re-export the neonAuth utility for quick access in server components
export { neonAuth } from "@neondatabase/auth/next/server";
