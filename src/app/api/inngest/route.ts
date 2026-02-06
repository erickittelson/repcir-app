/**
 * Inngest API Route
 *
 * This is the webhook endpoint that Inngest uses to:
 * - Discover and sync functions
 * - Execute function steps
 * - Handle event routing
 *
 * Setup:
 * 1. Run `npx inngest-cli@latest dev` for local development
 * 2. Add INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY to production env
 * 3. Deploy and Inngest will auto-sync functions
 */

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

// Create the serve handler with all functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
