/**
 * Neon Auth API Route Handler
 *
 * Routes all authentication requests through Neon Auth.
 * All auth APIs will be available at /api/neon-auth/*
 */

import { authApiHandler } from "@neondatabase/auth/next/server";

export const { GET, POST } = authApiHandler();
