/**
 * Neon Auth API Route Handler (alternate path)
 *
 * Routes all authentication requests through Neon Auth.
 * All auth APIs will be available at /api/neon-auth/*
 */

import { auth } from "@/lib/neon-auth/server";

export const { GET, POST } = auth.handler();
