-- Migration: Create interview_sessions table
-- Description: Adds a new table for persistent storage of interview preparation sessions
-- This enables users to save and reload their interview prep work across sessions

-- Create interview_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "interview_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "name" text NOT NULL,
  "mode" text NOT NULL,
  "job_id" varchar,
  "skill" text,
  "questions" json,
  "skill_explanations" json,
  "star_stories" json,
  "user_answers" json,
  "practice_status" json,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS "interview_sessions_user_id_idx" ON "interview_sessions" ("user_id");

-- Create index on updated_at for ordering
CREATE INDEX IF NOT EXISTS "interview_sessions_updated_at_idx" ON "interview_sessions" ("updated_at");
