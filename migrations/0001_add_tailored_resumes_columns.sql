-- Migration: Add missing columns to tailored_resumes table
-- Description: Adds columns that may be missing from the tailored_resumes table
-- These columns are required for saving AI improvements and tracking performance

-- Add micro_edits column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tailored_resumes' AND column_name = 'micro_edits'
    ) THEN
        ALTER TABLE "tailored_resumes" ADD COLUMN "micro_edits" json;
    END IF;
END $$;

-- Add ai_improvements column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tailored_resumes' AND column_name = 'ai_improvements'
    ) THEN
        ALTER TABLE "tailored_resumes" ADD COLUMN "ai_improvements" json;
    END IF;
END $$;

-- Add response_received column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tailored_resumes' AND column_name = 'response_received'
    ) THEN
        ALTER TABLE "tailored_resumes" ADD COLUMN "response_received" boolean;
    END IF;
END $$;

-- Add response_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tailored_resumes' AND column_name = 'response_date'
    ) THEN
        ALTER TABLE "tailored_resumes" ADD COLUMN "response_date" timestamp;
    END IF;
END $$;

-- Add source column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tailored_resumes' AND column_name = 'source'
    ) THEN
        ALTER TABLE "tailored_resumes" ADD COLUMN "source" text;
    END IF;
END $$;

-- Add referral column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tailored_resumes' AND column_name = 'referral'
    ) THEN
        ALTER TABLE "tailored_resumes" ADD COLUMN "referral" text;
    END IF;
END $$;
