-- Migration: Add job-specific fields to interview_sessions table
-- Description: Adds company, job title, and job description fields to enable job-centric interview preparation

-- Add new columns for job-specific interview preparation
ALTER TABLE "interview_sessions" 
ADD COLUMN IF NOT EXISTS "company_name" text,
ADD COLUMN IF NOT EXISTS "job_title" text,
ADD COLUMN IF NOT EXISTS "job_description" text;

-- Create index on company_name for filtering and search
CREATE INDEX IF NOT EXISTS "interview_sessions_company_name_idx" ON "interview_sessions" ("company_name");
