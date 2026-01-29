-- Add OpenAI conversation state columns for persistent conversation management
-- Items in OpenAI conversations are NOT subject to 30-day TTL

-- Add OpenAI conversation ID to coach_conversations
ALTER TABLE "coach_conversations" ADD COLUMN IF NOT EXISTS "openai_conversation_id" text;

-- Add last OpenAI response ID for response chaining
ALTER TABLE "coach_conversations" ADD COLUMN IF NOT EXISTS "last_openai_response_id" text;

-- Add OpenAI response ID to coach_messages for tracking individual responses
ALTER TABLE "coach_messages" ADD COLUMN IF NOT EXISTS "openai_response_id" text;

-- Create index on openai_conversation_id for faster lookups
CREATE INDEX IF NOT EXISTS "coach_conversations_openai_conv_idx" ON "coach_conversations" ("openai_conversation_id");
