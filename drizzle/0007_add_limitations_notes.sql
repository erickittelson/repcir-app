-- Add notes and updatedAt columns to member_limitations table
ALTER TABLE "member_limitations" ADD COLUMN "notes" text;
ALTER TABLE "member_limitations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
