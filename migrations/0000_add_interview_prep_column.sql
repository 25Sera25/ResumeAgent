-- Migration: Add interview_prep column to resume_sessions table
-- Description: Adds the interview_prep JSON column to support interview preparation features
-- This column was added to the schema but missing from the database, causing 500 errors

ALTER TABLE "resume_sessions" ADD COLUMN "interview_prep" json;
