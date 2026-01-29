-- Add social links to user profiles
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "social_links" jsonb DEFAULT '{}';
