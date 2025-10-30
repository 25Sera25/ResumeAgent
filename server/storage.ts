import { type User, type InsertUser, type ResumeSession, type InsertResumeSession, type JobPosting, type InsertJobPosting, type StoredResume, type InsertStoredResume, type TailoredResume, type InsertTailoredResume, type JobApplication, type InsertJobApplication, type FollowUp, type InsertFollowUp } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, resumeSessions, jobPostings, storedResumes, tailoredResumes, jobApplications, followUps } from "@shared/schema";
import { eq, desc, sql, and, lte, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createResumeSession(session: InsertResumeSession): Promise<ResumeSession>;
  getResumeSession(id: string): Promise<ResumeSession | undefined>;
  updateResumeSession(id: string, updates: Partial<ResumeSession>): Promise<ResumeSession | undefined>;
  getUserResumeSessions(userId?: string): Promise<ResumeSession[]>;
  
  createJobPosting(posting: InsertJobPosting): Promise<JobPosting>;
  getJobPosting(url: string): Promise<JobPosting | undefined>;
  getJobPostingById(id: string): Promise<JobPosting | undefined>;
  updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined>;
  
  // Stored resume operations
  createStoredResume(resume: InsertStoredResume): Promise<StoredResume>;
  getStoredResumes(): Promise<StoredResume[]>;
  getStoredResume(id: string): Promise<StoredResume | undefined>;
  getDefaultResume(): Promise<StoredResume | undefined>;
  updateStoredResume(id: string, updates: Partial<StoredResume>): Promise<StoredResume | undefined>;
  deleteStoredResume(id: string): Promise<boolean>;
  setDefaultResume(id: string): Promise<boolean>;
  
  // Tailored resume operations (permanent storage)
  saveTailoredResume(resume: InsertTailoredResume): Promise<TailoredResume>;
  getTailoredResumes(): Promise<TailoredResume[]>;
  getTailoredResume(id: string): Promise<TailoredResume | undefined>;
  updateTailoredResume(id: string, updates: Partial<TailoredResume>): Promise<TailoredResume | undefined>;
  deleteTailoredResume(id: string): Promise<boolean>;
  markAsApplied(id: string, notes?: string): Promise<TailoredResume | undefined>;
  
  // Job application tracking
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  getJobApplications(): Promise<JobApplication[]>;
  getJobApplication(id: string): Promise<JobApplication | undefined>;
  updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined>;
  deleteJobApplication(id: string): Promise<boolean>;
  getApplicationStats(): Promise<{
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
  }>;
  
  // Follow-up tracking
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  getFollowUps(jobApplicationId?: string): Promise<FollowUp[]>;
  getFollowUp(id: string): Promise<FollowUp | undefined>;
  getPendingFollowUps(): Promise<FollowUp[]>;
  updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: string): Promise<boolean>;
  getFollowUpStats(): Promise<{
    pending: number;
    sent: number;
    total: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private resumeSessions: Map<string, ResumeSession>;
  private jobPostings: Map<string, JobPosting>;
  private storedResumes: Map<string, StoredResume>;
  private tailoredResumes: Map<string, TailoredResume>;
  private jobApplications: Map<string, JobApplication>;
  private followUps: Map<string, FollowUp>;

  constructor() {
    this.users = new Map();
    this.resumeSessions = new Map();
    this.jobPostings = new Map();
    this.storedResumes = new Map();
    this.tailoredResumes = new Map();
    this.jobApplications = new Map();
    this.followUps = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createResumeSession(insertSession: InsertResumeSession): Promise<ResumeSession> {
    const id = randomUUID();
    const now = new Date();
    const session: ResumeSession = { 
      ...insertSession, 
      userId: insertSession.userId || null,
      baseResumeFile: insertSession.baseResumeFile || null,
      baseResumeContent: insertSession.baseResumeContent || null,
      profileJson: insertSession.profileJson || null,
      jobUrl: insertSession.jobUrl || null,
      jobDescription: insertSession.jobDescription || null,
      jobAnalysis: insertSession.jobAnalysis || null,
      tailoredContent: insertSession.tailoredContent || null,
      status: insertSession.status || "draft",
      matchScore: insertSession.matchScore || null,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.resumeSessions.set(id, session);
    return session;
  }

  async getResumeSession(id: string): Promise<ResumeSession | undefined> {
    return this.resumeSessions.get(id);
  }

  async updateResumeSession(id: string, updates: Partial<ResumeSession>): Promise<ResumeSession | undefined> {
    const session = this.resumeSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { 
      ...session, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.resumeSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getUserResumeSessions(userId?: string): Promise<ResumeSession[]> {
    return Array.from(this.resumeSessions.values()).filter(
      session => !userId || session.userId === userId
    );
  }

  async createJobPosting(insertPosting: InsertJobPosting): Promise<JobPosting> {
    const id = randomUUID();
    const now = new Date();
    const posting: JobPosting = { 
      ...insertPosting,
      title: insertPosting.title || null,
      company: insertPosting.company || null,
      description: insertPosting.description || null,
      requirements: insertPosting.requirements || null,
      keywords: insertPosting.keywords || null,
      scraped: insertPosting.scraped || false,
      id, 
      createdAt: now 
    };
    this.jobPostings.set(id, posting);
    return posting;
  }

  async getJobPosting(url: string): Promise<JobPosting | undefined> {
    return Array.from(this.jobPostings.values()).find(
      posting => posting.url === url
    );
  }

  async getJobPostingById(id: string): Promise<JobPosting | undefined> {
    return this.jobPostings.get(id);
  }

  async updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const posting = this.jobPostings.get(id);
    if (!posting) return undefined;
    
    const updatedPosting = { ...posting, ...updates };
    this.jobPostings.set(id, updatedPosting);
    return updatedPosting;
  }

  // Stored Resume operations
  async createStoredResume(insertResume: InsertStoredResume): Promise<StoredResume> {
    const id = randomUUID();
    const now = new Date();
    
    // If this is set as default, unset all other defaults
    if (insertResume.isDefault) {
      for (const [key, resume] of Array.from(this.storedResumes.entries())) {
        if (resume.isDefault) {
          this.storedResumes.set(key, { ...resume, isDefault: false });
        }
      }
    }
    
    const resume: StoredResume = {
      ...insertResume,
      name: insertResume.name,
      originalFilename: insertResume.originalFilename,
      content: insertResume.content,
      contactInfo: insertResume.contactInfo || null,
      isDefault: insertResume.isDefault || false,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.storedResumes.set(id, resume);
    return resume;
  }

  async getStoredResumes(): Promise<StoredResume[]> {
    return Array.from(this.storedResumes.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getStoredResume(id: string): Promise<StoredResume | undefined> {
    return this.storedResumes.get(id);
  }

  async getDefaultResume(): Promise<StoredResume | undefined> {
    return Array.from(this.storedResumes.values()).find(resume => resume.isDefault);
  }

  async updateStoredResume(id: string, updates: Partial<StoredResume>): Promise<StoredResume | undefined> {
    const resume = this.storedResumes.get(id);
    if (!resume) return undefined;

    // If setting as default, unset all other defaults
    if (updates.isDefault) {
      for (const [key, r] of Array.from(this.storedResumes.entries())) {
        if (r.isDefault && key !== id) {
          this.storedResumes.set(key, { ...r, isDefault: false });
        }
      }
    }

    const updatedResume = {
      ...resume,
      ...updates,
      updatedAt: new Date()
    };
    this.storedResumes.set(id, updatedResume);
    return updatedResume;
  }

  async deleteStoredResume(id: string): Promise<boolean> {
    return this.storedResumes.delete(id);
  }

  async setDefaultResume(id: string): Promise<boolean> {
    const resume = this.storedResumes.get(id);
    if (!resume) return false;

    // Unset all other defaults
    for (const [key, r] of Array.from(this.storedResumes.entries())) {
      if (r.isDefault) {
        this.storedResumes.set(key, { ...r, isDefault: false });
      }
    }

    // Set this one as default
    this.storedResumes.set(id, { ...resume, isDefault: true, updatedAt: new Date() });
    return true;
  }

  // Tailored resume operations (permanent storage)
  async saveTailoredResume(insertResume: InsertTailoredResume): Promise<TailoredResume> {
    const id = randomUUID();
    const now = new Date();
    const resume: TailoredResume = {
      ...insertResume,
      id,
      jobUrl: insertResume.jobUrl || null,
      originalJobDescription: insertResume.originalJobDescription || null,
      appliedToJob: insertResume.appliedToJob || false,
      applicationDate: insertResume.applicationDate || null,
      notes: insertResume.notes || null,
      tags: insertResume.tags || null,
      atsScore: insertResume.atsScore || null,
      microEdits: insertResume.microEdits || null,
      aiImprovements: insertResume.aiImprovements || null,
      createdAt: now,
      updatedAt: now,
    };
    this.tailoredResumes.set(id, resume);
    return resume;
  }

  async getTailoredResumes(): Promise<TailoredResume[]> {
    return Array.from(this.tailoredResumes.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getTailoredResume(id: string): Promise<TailoredResume | undefined> {
    return this.tailoredResumes.get(id);
  }

  async updateTailoredResume(id: string, updates: Partial<TailoredResume>): Promise<TailoredResume | undefined> {
    const resume = this.tailoredResumes.get(id);
    if (!resume) return undefined;

    const updatedResume = { ...resume, ...updates, updatedAt: new Date() };
    this.tailoredResumes.set(id, updatedResume);
    return updatedResume;
  }

  async deleteTailoredResume(id: string): Promise<boolean> {
    return this.tailoredResumes.delete(id);
  }

  async markAsApplied(id: string, notes?: string): Promise<TailoredResume | undefined> {
    return this.updateTailoredResume(id, {
      appliedToJob: true,
      applicationDate: new Date(),
      notes: notes || null,
    });
  }

  // Job application tracking
  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplication> {
    const id = randomUUID();
    const now = new Date();
    const application: JobApplication = {
      ...insertApplication,
      id,
      jobUrl: insertApplication.jobUrl || null,
      applicationStatus: insertApplication.applicationStatus || "applied",
      appliedDate: insertApplication.appliedDate || now,
      interviewDate: insertApplication.interviewDate || null,
      followUpDate: insertApplication.followUpDate || null,
      notes: insertApplication.notes || null,
      priority: insertApplication.priority || "medium",
      source: insertApplication.source || null,
      contactPerson: insertApplication.contactPerson || null,
      salary: insertApplication.salary || null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobApplications.set(id, application);
    return application;
  }

  async getJobApplications(): Promise<JobApplication[]> {
    return Array.from(this.jobApplications.values()).sort(
      (a, b) => new Date(b.appliedDate!).getTime() - new Date(a.appliedDate!).getTime()
    );
  }

  async getJobApplication(id: string): Promise<JobApplication | undefined> {
    return this.jobApplications.get(id);
  }

  async updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined> {
    const application = this.jobApplications.get(id);
    if (!application) return undefined;

    const updatedApplication = { ...application, ...updates, updatedAt: new Date() };
    this.jobApplications.set(id, updatedApplication);
    return updatedApplication;
  }

  async deleteJobApplication(id: string): Promise<boolean> {
    return this.jobApplications.delete(id);
  }

  async getApplicationStats(): Promise<{
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
  }> {
    const applications = Array.from(this.jobApplications.values());
    return {
      total: applications.length,
      applied: applications.filter(app => app.applicationStatus === "applied").length,
      interviews: applications.filter(app => app.applicationStatus === "interview").length,
      offers: applications.filter(app => app.applicationStatus === "offer").length,
      rejected: applications.filter(app => app.applicationStatus === "rejected").length,
    };
  }

  // Follow-up tracking
  async createFollowUp(insertFollowUp: InsertFollowUp): Promise<FollowUp> {
    const id = randomUUID();
    const now = new Date();
    const followUp: FollowUp = {
      ...insertFollowUp,
      id,
      status: insertFollowUp.status || "pending",
      emailSubject: insertFollowUp.emailSubject || null,
      emailBody: insertFollowUp.emailBody || null,
      sentAt: insertFollowUp.sentAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.followUps.set(id, followUp);
    return followUp;
  }

  async getFollowUps(jobApplicationId?: string): Promise<FollowUp[]> {
    const allFollowUps = Array.from(this.followUps.values());
    if (jobApplicationId) {
      return allFollowUps
        .filter(f => f.jobApplicationId === jobApplicationId)
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    }
    return allFollowUps.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }

  async getFollowUp(id: string): Promise<FollowUp | undefined> {
    return this.followUps.get(id);
  }

  async getPendingFollowUps(): Promise<FollowUp[]> {
    return Array.from(this.followUps.values())
      .filter(f => f.status === "pending")
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }

  async updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<FollowUp | undefined> {
    const followUp = this.followUps.get(id);
    if (!followUp) return undefined;

    const updatedFollowUp = { ...followUp, ...updates, updatedAt: new Date() };
    this.followUps.set(id, updatedFollowUp);
    return updatedFollowUp;
  }

  async deleteFollowUp(id: string): Promise<boolean> {
    return this.followUps.delete(id);
  }

  async getFollowUpStats(): Promise<{
    pending: number;
    sent: number;
    total: number;
  }> {
    const allFollowUps = Array.from(this.followUps.values());
    return {
      pending: allFollowUps.filter(f => f.status === "pending").length,
      sent: allFollowUps.filter(f => f.status === "sent").length,
      total: allFollowUps.length,
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createResumeSession(insertSession: InsertResumeSession): Promise<ResumeSession> {
    const [session] = await db.insert(resumeSessions).values(insertSession).returning();
    return session;
  }

  async getResumeSession(id: string): Promise<ResumeSession | undefined> {
    const [session] = await db.select().from(resumeSessions).where(eq(resumeSessions.id, id));
    return session || undefined;
  }

  async updateResumeSession(id: string, updates: Partial<ResumeSession>): Promise<ResumeSession | undefined> {
    const [session] = await db
      .update(resumeSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resumeSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getUserResumeSessions(userId?: string): Promise<ResumeSession[]> {
    if (userId) {
      return await db.select().from(resumeSessions).where(eq(resumeSessions.userId, userId)).orderBy(desc(resumeSessions.createdAt));
    }
    return await db.select().from(resumeSessions).orderBy(desc(resumeSessions.createdAt));
  }

  async createJobPosting(insertPosting: InsertJobPosting): Promise<JobPosting> {
    const [posting] = await db.insert(jobPostings).values(insertPosting).returning();
    return posting;
  }

  async getJobPosting(url: string): Promise<JobPosting | undefined> {
    const [posting] = await db.select().from(jobPostings).where(eq(jobPostings.url, url));
    return posting || undefined;
  }

  async getJobPostingById(id: string): Promise<JobPosting | undefined> {
    const [posting] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
    return posting || undefined;
  }

  async updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const [posting] = await db
      .update(jobPostings)
      .set(updates)
      .where(eq(jobPostings.id, id))
      .returning();
    return posting || undefined;
  }

  // Stored resume operations
  async createStoredResume(insertResume: InsertStoredResume): Promise<StoredResume> {
    const [resume] = await db.insert(storedResumes).values(insertResume).returning();
    return resume;
  }

  async getStoredResumes(): Promise<StoredResume[]> {
    return await db.select().from(storedResumes).orderBy(desc(storedResumes.createdAt));
  }

  async getStoredResume(id: string): Promise<StoredResume | undefined> {
    const [resume] = await db.select().from(storedResumes).where(eq(storedResumes.id, id));
    return resume || undefined;
  }

  async getDefaultResume(): Promise<StoredResume | undefined> {
    const [resume] = await db.select().from(storedResumes).where(eq(storedResumes.isDefault, true));
    return resume || undefined;
  }

  async updateStoredResume(id: string, updates: Partial<StoredResume>): Promise<StoredResume | undefined> {
    const [resume] = await db
      .update(storedResumes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(storedResumes.id, id))
      .returning();
    return resume || undefined;
  }

  async deleteStoredResume(id: string): Promise<boolean> {
    const result = await db.delete(storedResumes).where(eq(storedResumes.id, id));
    return result.rowCount! > 0;
  }

  async setDefaultResume(id: string): Promise<boolean> {
    // First, unset all defaults
    await db.update(storedResumes).set({ isDefault: false });
    // Then set the new default
    const result = await db.update(storedResumes).set({ isDefault: true }).where(eq(storedResumes.id, id));
    return result.rowCount! > 0;
  }

  // CRITICAL: Tailored resume operations for PERMANENT storage
  async saveTailoredResume(insertResume: InsertTailoredResume): Promise<TailoredResume> {
    const [resume] = await db.insert(tailoredResumes).values(insertResume).returning();
    return resume;
  }

  async getTailoredResumes(): Promise<TailoredResume[]> {
    return await db.select().from(tailoredResumes).orderBy(desc(tailoredResumes.createdAt));
  }

  async getTailoredResume(id: string): Promise<TailoredResume | undefined> {
    const [resume] = await db.select().from(tailoredResumes).where(eq(tailoredResumes.id, id));
    return resume || undefined;
  }

  async updateTailoredResume(id: string, updates: Partial<TailoredResume>): Promise<TailoredResume | undefined> {
    const [resume] = await db
      .update(tailoredResumes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tailoredResumes.id, id))
      .returning();
    return resume || undefined;
  }

  async deleteTailoredResume(id: string): Promise<boolean> {
    const result = await db.delete(tailoredResumes).where(eq(tailoredResumes.id, id));
    return result.rowCount! > 0;
  }

  async markAsApplied(id: string, notes?: string): Promise<TailoredResume | undefined> {
    return this.updateTailoredResume(id, {
      appliedToJob: true,
      applicationDate: new Date(),
      notes: notes || null,
    });
  }

  // Job application tracking for PERMANENT storage
  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplication> {
    const [application] = await db.insert(jobApplications).values(insertApplication).returning();
    return application;
  }

  async getJobApplications(): Promise<JobApplication[]> {
    return await db.select().from(jobApplications).orderBy(desc(jobApplications.appliedDate));
  }

  async getJobApplication(id: string): Promise<JobApplication | undefined> {
    const [application] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
    return application || undefined;
  }

  async updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined> {
    const [application] = await db
      .update(jobApplications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobApplications.id, id))
      .returning();
    return application || undefined;
  }

  async deleteJobApplication(id: string): Promise<boolean> {
    const result = await db.delete(jobApplications).where(eq(jobApplications.id, id));
    return result.rowCount! > 0;
  }

  async getApplicationStats(): Promise<{
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
  }> {
    const applications = await db.select().from(jobApplications);
    return {
      total: applications.length,
      applied: applications.filter(app => app.applicationStatus === "applied").length,
      interviews: applications.filter(app => app.applicationStatus === "interview").length,
      offers: applications.filter(app => app.applicationStatus === "offer").length,
      rejected: applications.filter(app => app.applicationStatus === "rejected").length,
    };
  }

  // NEW: Get overall statistics for homepage
  async getOverallStats(): Promise<{
    jobsAnalyzed: number;
    resumesGenerated: number;
    applicationsSent: number;
    followUpsScheduled: number;
  }> {
    const [sessions, resumes, applications, followUpsList] = await Promise.all([
      db.select().from(resumeSessions).where(sql`job_analysis IS NOT NULL`),
      db.select().from(tailoredResumes),
      db.select().from(jobApplications),
      db.select().from(followUps)
    ]);

    return {
      jobsAnalyzed: sessions.length,
      resumesGenerated: resumes.length,
      applicationsSent: applications.length,
      followUpsScheduled: followUpsList.length,
    };
  }

  // Follow-up tracking for PERMANENT storage
  async createFollowUp(insertFollowUp: InsertFollowUp): Promise<FollowUp> {
    const [followUp] = await db.insert(followUps).values(insertFollowUp).returning();
    return followUp;
  }

  async getFollowUps(jobApplicationId?: string): Promise<FollowUp[]> {
    if (jobApplicationId) {
      return await db.select().from(followUps)
        .where(eq(followUps.jobApplicationId, jobApplicationId))
        .orderBy(followUps.dueAt);
    }
    return await db.select().from(followUps).orderBy(followUps.dueAt);
  }

  async getFollowUp(id: string): Promise<FollowUp | undefined> {
    const [followUp] = await db.select().from(followUps).where(eq(followUps.id, id));
    return followUp || undefined;
  }

  async getPendingFollowUps(): Promise<FollowUp[]> {
    return await db.select().from(followUps)
      .where(eq(followUps.status, "pending"))
      .orderBy(followUps.dueAt);
  }

  async updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<FollowUp | undefined> {
    const [followUp] = await db
      .update(followUps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(followUps.id, id))
      .returning();
    return followUp || undefined;
  }

  async deleteFollowUp(id: string): Promise<boolean> {
    const result = await db.delete(followUps).where(eq(followUps.id, id));
    return result.rowCount! > 0;
  }

  async getFollowUpStats(): Promise<{
    pending: number;
    sent: number;
    total: number;
  }> {
    const allFollowUps = await db.select().from(followUps);
    return {
      pending: allFollowUps.filter(f => f.status === "pending").length,
      sent: allFollowUps.filter(f => f.status === "sent").length,
      total: allFollowUps.length,
    };
  }
}

// CRITICAL FIX: Switch to DatabaseStorage for PERMANENT storage
export const storage = new DatabaseStorage();
