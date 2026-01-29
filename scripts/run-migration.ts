/**
 * Run migration to add OpenAI conversation state columns
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  console.log("Running migration: Add OpenAI conversation state columns...\n");

  try {
    // Add openai_conversation_id column
    await sql`
      ALTER TABLE "coach_conversations"
      ADD COLUMN IF NOT EXISTS "openai_conversation_id" text
    `;
    console.log("✓ Added openai_conversation_id column");

    // Add last_openai_response_id column
    await sql`
      ALTER TABLE "coach_conversations"
      ADD COLUMN IF NOT EXISTS "last_openai_response_id" text
    `;
    console.log("✓ Added last_openai_response_id column");

    // Add openai_response_id to messages
    await sql`
      ALTER TABLE "coach_messages"
      ADD COLUMN IF NOT EXISTS "openai_response_id" text
    `;
    console.log("✓ Added openai_response_id column to messages");

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS "coach_conversations_openai_conv_idx"
      ON "coach_conversations" ("openai_conversation_id")
    `;
    console.log("✓ Created index on openai_conversation_id");

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
