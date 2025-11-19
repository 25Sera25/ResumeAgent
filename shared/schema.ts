import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const resumeSessions = pgTable("resume_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  baseResumeFile: text("base_resume_file"),
  baseResumeContent: json("base_resume_content"),
  profileJson: json("profile_json"),
  jobUrl: text("job_url"),
  jobDescription: text("job_description"),
  jobAnalysis: json("job_analysis"),
  tailoredContent: json("tailored_content"),
  interviewPrep: json("interview_prep"), // Interview questions and STAR examples
  status: text("status").default("draft"), // draft, analyzing, tailored, completed
  matchScore: integer("match_score"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull().unique(),
  title: text("title"),
  company: text("company"),
  description: text("description"),
  requirements: json("requirements"),
  keywords: json("keywords"),
  scraped: boolean("scraped").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const storedResumes = pgTable("stored_resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  originalFilename: text("original_filename").notNull(),
  content: text("content").notNull(),
  contactInfo: json("contact_info"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// New table for permanently saved tailored resumes
export const tailoredResumes = pgTable("tailored_resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  jobUrl: text("job_url"),
  // NEW: Save original job description for interview preparation
  originalJobDescription: text("original_job_description"), // Full job posting text
  tailoredContent: json("tailored_content").notNull(),
  atsScore: integer("ats_score"),
  filename: text("filename").notNull(), // e.g., "Ayele_DBA_Microsoft"
  appliedToJob: boolean("applied_to_job").default(false),
  applicationDate: timestamp("application_date"),
  notes: text("notes"), // User notes about the application
  tags: json("tags"), // Array of tags for organization
  // NEW: Save AI improvements permanently for future reference
  microEdits: json("micro_edits"), // Array of micro-edits applied automatically
  aiImprovements: json("ai_improvements"), // Array of AI improvements made
  // NEW: Performance tracking for A/B analytics
  responseReceived: boolean("response_received"),
  responseDate: timestamp("response_date"),
  source: text("source"), // LinkedIn, Indeed, company website, etc.
  referral: text("referral"), // Referral source if applicable
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Enhanced job application tracking
export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tailoredResumeId: varchar("tailored_resume_id").notNull(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  jobUrl: text("job_url"),
  applicationStatus: text("application_status").default("applied"), // applied, interview, rejected, offer
  appliedDate: timestamp("applied_date").default(sql`CURRENT_TIMESTAMP`),
  interviewDate: timestamp("interview_date"),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  priority: text("priority").default("medium"), // high, medium, low
  source: text("source"), // LinkedIn, Indeed, company website, etc.
  contactPerson: text("contact_person"),
  salary: text("salary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Follow-up reminders for job applications
export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobApplicationId: varchar("job_application_id").notNull().references(() => jobApplications.id),
  dueAt: timestamp("due_at").notNull(),
  type: text("type").notNull(), // '1w' (1 week), '2w' (2 weeks), 'thank_you' (post-interview)
  status: text("status").default("pending"), // pending, sent, skipped
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Interview preparation sessions - persistent storage for generated questions, skills analysis, and STAR stories
export const interviewSessions = pgTable("interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // User-provided name for the session (e.g., "Microsoft DBA Prep", "General SQL Prep")
  mode: text("mode").notNull(), // 'job', 'skill', 'general' - context mode for the session
  jobId: varchar("job_id"), // Optional reference to tailored resume or session if mode is 'job'
  skill: text("skill"), // Optional specific skill focus if mode is 'skill'
  companyName: text("company_name"), // Company name for job-specific prep
  jobTitle: text("job_title"), // Job title for job-specific prep
  jobDescription: text("job_description"), // Full job description for targeted question generation
  questions: json("questions"), // Array of generated interview questions with answers
  skillExplanations: json("skill_explanations"), // Array of skill explanations at different depth levels
  starStories: json("star_stories"), // Array of STAR format stories
  userAnswers: json("user_answers"), // Map of question IDs to user's practice answers
  practiceStatus: json("practice_status"), // Map of question IDs to practice status ('needs-practice' | 'confident')
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertResumeSessionSchema = createInsertSchema(resumeSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  createdAt: true,
});

export const insertStoredResumeSchema = createInsertSchema(storedResumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTailoredResumeSchema = createInsertSchema(tailoredResumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ResumeSession = typeof resumeSessions.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
export type StoredResume = typeof storedResumes.$inferSelect;
export type TailoredResume = typeof tailoredResumes.$inferSelect;
export type JobApplication = typeof jobApplications.$inferSelect;
export type FollowUp = typeof followUps.$inferSelect;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertResumeSession = z.infer<typeof insertResumeSessionSchema>;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type InsertStoredResume = z.infer<typeof insertStoredResumeSchema>;
export type InsertTailoredResume = z.infer<typeof insertTailoredResumeSchema>;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
