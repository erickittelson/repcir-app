/**
 * Neon Auth API Route Handler
 *
 * Routes all authentication requests through Neon Auth.
 * All auth APIs are available at /api/auth/*
 */

import { auth } from "@/lib/neon-auth/server";

export const { GET, POST } = auth.handler();
