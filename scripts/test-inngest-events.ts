#!/usr/bin/env npx tsx
/**
 * Test Inngest Event Sending
 *
 * This script tests sending events to Inngest to verify the integration works.
 * Run with: npx tsx scripts/test-inngest-events.ts
 */

import { inngest } from "../src/inngest/client";

async function testEvents() {
  console.log("Testing Inngest event sending...\n");

  // Test 1: Send member snapshot update event
  console.log("1. Sending member/snapshot-update event...");
  const snapshotResult = await inngest.send({
    name: "member/snapshot-update",
    data: { memberId: "test-member-123" },
  });
  console.log("   ✓ Event sent:", snapshotResult.ids);

  // Test 2: Send goal achieved notification event
  console.log("2. Sending notification/goal-achieved event...");
  const goalResult = await inngest.send({
    name: "notification/goal-achieved",
    data: {
      userId: "test-user-123",
      memberId: "test-member-123",
      goalId: "test-goal-123",
      goalTitle: "Complete 100 pushups",
    },
  });
  console.log("   ✓ Event sent:", goalResult.ids);

  // Test 3: Send streak milestone notification event
  console.log("3. Sending notification/streak-milestone event...");
  const streakResult = await inngest.send({
    name: "notification/streak-milestone",
    data: {
      userId: "test-user-123",
      memberId: "test-member-123",
      streakDays: 30,
    },
  });
  console.log("   ✓ Event sent:", streakResult.ids);

  // Test 4: Send AI generate embeddings event
  console.log("4. Sending ai/generate-embeddings event...");
  const embeddingsResult = await inngest.send({
    name: "ai/generate-embeddings",
    data: {
      userId: "test-user-123",
      circleId: "test-circle-123",
      memberId: "test-member-123",
    },
  });
  console.log("   ✓ Event sent:", embeddingsResult.ids);

  console.log("\n✅ All test events sent successfully!");
  console.log("\nCheck the Inngest dev UI at http://localhost:8288 to see the function runs.");
}

testEvents().catch(console.error);
