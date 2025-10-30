import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { upload } from "./services/fileProcessor";
import { validateProfileJSON } from "./services/fileProcessor";
import { 
  createTailoringSession, 
  uploadResumeToSession, 
  uploadProfileToSession,
  analyzeJobForSession,
  tailorResumeForSession,
  generateResumeDocuments 
} from "./services/resumeTailor";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new tailoring session
  app.post("/api/sessions", async (req, res) => {
    try {
      const session = await createTailoringSession(req.body.userId);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get session details
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getResumeSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get user's sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getUserResumeSessions(req.query.userId as string);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Upload resume file
  app.post("/api/sessions/:id/resume", upload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const session = await uploadResumeToSession(req.params.id, req.file);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Upload profile JSON
  app.post("/api/sessions/:id/profile", async (req, res) => {
    try {
      const { profileJson } = req.body;
      
      if (!profileJson) {
        return res.status(400).json({ error: "Profile JSON required" });
      }

      const validatedProfile = validateProfileJSON(JSON.stringify(profileJson));
      const session = await uploadProfileToSession(req.params.id, validatedProfile);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Analyze job posting
  app.post("/api/sessions/:id/analyze-job", async (req, res) => {
    try {
      const { jobUrl, jobDescription } = req.body;
      
      if (!jobUrl && !jobDescription) {
        return res.status(400).json({ error: "Either job URL or job description is required" });
      }

      const session = await analyzeJobForSession(req.params.id, { jobUrl, jobDescription });
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Tailor resume
  app.post("/api/sessions/:id/tailor", async (req, res) => {
    try {
      const result = await tailorResumeForSession(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Download tailored resume
  app.get("/api/sessions/:id/download/:format", async (req, res) => {
    try {
      const { format } = req.params;
      
      if (!['pdf', 'docx'].includes(format)) {
        return res.status(400).json({ error: "Format must be pdf or docx" });
      }

      const documents = await generateResumeDocuments(req.params.id);
      const buffer = format === 'pdf' ? documents.pdf : documents.docx;
      
      const session = await storage.getResumeSession(req.params.id);
      
      // Create filename in format: Name_DBA_Resume_CompanyName (e.g. Ayele_DBA_Resume_Microsoft)
      let filename = 'tailored_resume';
      
      const tailoredContent = session?.tailoredContent;
      const jobAnalysis = session?.jobAnalysis;
      
      if (tailoredContent && typeof tailoredContent === 'object' && jobAnalysis && typeof jobAnalysis === 'object') {
        const contact = (tailoredContent as any).contact;
        const targetCompany = (jobAnalysis as any).company;
        
        if (contact?.name && targetCompany) {
          // Extract first name from full name (e.g., "Ayele Tesfaye" -> "Ayele")
          const firstName = contact.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
          // Clean company name and limit length to avoid truncation issues
          const cleanCompany = targetCompany
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .substring(0, 20); // Limit to 20 chars to avoid filename issues
          filename = `${firstName}_DBA_Resume_${cleanCompany}`;
        } else if (contact?.name) {
          // Fallback to just name_DBA_Resume if no company
          const firstName = contact.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
          filename = `${firstName}_DBA_Resume`;
        }
      }
      
      filename += `.${format}`;

      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get job posting analysis
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobPosting = await storage.getJobPostingById(req.params.id);
      if (!jobPosting) {
        return res.status(404).json({ error: "Job posting not found" });
      }
      res.json(jobPosting);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // =====================
  // STORED RESUME ROUTES
  // =====================

  // Get all stored resumes
  app.get("/api/resumes", async (req, res) => {
    try {
      const resumes = await storage.getStoredResumes();
      res.json(resumes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Upload and store a resume
  app.post("/api/resumes", upload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { name, setAsDefault } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Resume name is required" });
      }

      // Process the file to extract content
      const { processResumeFile, extractContactInformation } = await import("./services/fileProcessor");
      const processed = await processResumeFile(req.file);
      const contactInfo = await extractContactInformation(processed.text);

      // Store the resume
      const storedResume = await storage.createStoredResume({
        name,
        originalFilename: req.file.originalname,
        content: processed.text,
        contactInfo,
        isDefault: setAsDefault === 'true' || setAsDefault === true
      });

      res.json(storedResume);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get stored resume by ID
  app.get("/api/resumes/:id", async (req, res) => {
    try {
      const resume = await storage.getStoredResume(req.params.id);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json(resume);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Update stored resume (name, default status)
  app.patch("/api/resumes/:id", async (req, res) => {
    try {
      const resume = await storage.updateStoredResume(req.params.id, req.body);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json(resume);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Delete stored resume
  app.delete("/api/resumes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStoredResume(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Set resume as default
  app.post("/api/resumes/:id/set-default", async (req, res) => {
    try {
      const success = await storage.setDefaultResume(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Use stored resume for session
  app.post("/api/sessions/:sessionId/use-resume/:resumeId", async (req, res) => {
    try {
      const storedResume = await storage.getStoredResume(req.params.resumeId);
      if (!storedResume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const session = await storage.updateResumeSession(req.params.sessionId, {
        baseResumeFile: storedResume.originalFilename,
        baseResumeContent: storedResume.content,
        profileJson: storedResume.contactInfo
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ===========================================
  // POWERFUL NEW FEATURES - PERMANENT STORAGE & JOB TRACKING
  // ===========================================

  // Save tailored resume permanently
  app.post('/api/sessions/:sessionId/save', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getResumeSession(sessionId);
      
      if (!session || !session.tailoredContent || !session.jobAnalysis) {
        return res.status(400).json({ error: 'Session not found or tailored content not available' });
      }

      const jobAnalysis = session.jobAnalysis as any;
      const tailoredContent = session.tailoredContent as any;
      
      // Generate filename like "Ayele_DBA_Resume_Microsoft"
      const contactName = tailoredContent.contact?.name || 'Resume';
      const cleanName = contactName.split(' ')[0]; // First name only
      const company = jobAnalysis.company || 'Company';
      
      // Clean company name and limit length to avoid truncation issues
      const cleanCompany = company
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .substring(0, 20);
      
      const filename = `${cleanName}_DBA_Resume_${cleanCompany}`;

      const savedResume = await storage.saveTailoredResume({
        sessionId,
        jobTitle: jobAnalysis.title || 'Unknown Position',
        company: jobAnalysis.company || 'Unknown Company',
        jobUrl: session.jobUrl,
        // SAVE ORIGINAL JOB DESCRIPTION for interview preparation
        originalJobDescription: session.jobDescription || jobAnalysis.description || null,
        tailoredContent: session.tailoredContent,
        atsScore: tailoredContent.atsScore || tailoredContent.coreScore || 85,
        filename,
        appliedToJob: false,
        applicationDate: null,
        notes: null,
        tags: ['DBA', cleanCompany, 'Generated'].filter(Boolean),
        // SAVE AI IMPROVEMENTS PERMANENTLY for future reference
        microEdits: tailoredContent.appliedMicroEdits || [],
        aiImprovements: tailoredContent.improvements || [],
      });

      res.json({ id: savedResume.id, filename: savedResume.filename, message: 'Resume saved permanently!' });
    } catch (error) {
      console.error('Error saving tailored resume:', error);
      res.status(500).json({ error: 'Failed to save tailored resume' });
    }
  });

  // Get all saved tailored resumes
  app.get('/api/tailored-resumes', async (req, res) => {
    try {
      const resumes = await storage.getTailoredResumes();
      res.json(resumes);
    } catch (error) {
      console.error('Error fetching tailored resumes:', error);
      res.status(500).json({ error: 'Failed to fetch tailored resumes' });
    }
  });

  // Get specific tailored resume
  app.get('/api/tailored-resumes/:id', async (req, res) => {
    try {
      const resume = await storage.getTailoredResume(req.params.id);
      if (!resume) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }
      res.json(resume);
    } catch (error) {
      console.error('Error fetching tailored resume:', error);
      res.status(500).json({ error: 'Failed to fetch tailored resume' });
    }
  });

  // Mark as applied with job tracking
  app.post('/api/tailored-resumes/:id/mark-applied', async (req, res) => {
    try {
      const { notes, priority = 'medium', source } = req.body;
      const resumeId = req.params.id;
      
      const resume = await storage.getTailoredResume(resumeId);
      if (!resume) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }

      // Mark resume as applied
      const updatedResume = await storage.markAsApplied(resumeId, notes);
      
      // Create job application tracking entry
      const application = await storage.createJobApplication({
        tailoredResumeId: resumeId,
        jobTitle: resume.jobTitle,
        company: resume.company,
        jobUrl: resume.jobUrl,
        applicationStatus: 'applied',
        appliedDate: new Date(),
        notes,
        priority,
        source,
        interviewDate: null,
        followUpDate: null,
        contactPerson: null,
        salary: null,
      });

      res.json({ 
        resume: updatedResume, 
        application: application,
        message: `Marked as applied to ${resume.company}!` 
      });
    } catch (error) {
      console.error('Error marking as applied:', error);
      res.status(500).json({ error: 'Failed to mark as applied' });
    }
  });

  // Update tailored resume
  app.put('/api/tailored-resumes/:id', async (req, res) => {
    try {
      const updates = req.body;
      const updatedResume = await storage.updateTailoredResume(req.params.id, updates);
      if (!updatedResume) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }
      res.json(updatedResume);
    } catch (error) {
      console.error('Error updating tailored resume:', error);
      res.status(500).json({ error: 'Failed to update tailored resume' });
    }
  });

  // Delete tailored resume
  app.delete('/api/tailored-resumes/:id', async (req, res) => {
    try {
      const success = await storage.deleteTailoredResume(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }
      res.json({ message: 'Tailored resume deleted successfully' });
    } catch (error) {
      console.error('Error deleting tailored resume:', error);
      res.status(500).json({ error: 'Failed to delete tailored resume' });
    }
  });

  // ===========================================
  // JOB APPLICATION TRACKING
  // ===========================================

  // Get all job applications
  app.get('/api/job-applications', async (req, res) => {
    try {
      const applications = await storage.getJobApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching job applications:', error);
      res.status(500).json({ error: 'Failed to fetch job applications' });
    }
  });

  // Get application statistics
  app.get('/api/job-applications/stats', async (req, res) => {
    try {
      const stats = await storage.getApplicationStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching application stats:', error);
      res.status(500).json({ error: 'Failed to fetch application stats' });
    }
  });

  // Get overall session statistics (for homepage)
  app.get('/api/session-stats', async (req, res) => {
    try {
      const stats = await storage.getOverallStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching session stats:', error);
      res.status(500).json({ error: 'Failed to fetch session stats' });
    }
  });

  // Update job application status
  app.put('/api/job-applications/:id', async (req, res) => {
    try {
      const updates = req.body;
      const updatedApplication = await storage.updateJobApplication(req.params.id, updates);
      if (!updatedApplication) {
        return res.status(404).json({ error: 'Job application not found' });
      }
      res.json(updatedApplication);
    } catch (error) {
      console.error('Error updating job application:', error);
      res.status(500).json({ error: 'Failed to update job application' });
    }
  });

  // Delete job application
  app.delete('/api/job-applications/:id', async (req, res) => {
    try {
      const success = await storage.deleteJobApplication(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Job application not found' });
      }
      res.json({ message: 'Job application deleted successfully' });
    } catch (error) {
      console.error('Error deleting job application:', error);
      res.status(500).json({ error: 'Failed to delete job application' });
    }
  });

  // Download tailored resume from saved library
  app.get('/api/tailored-resumes/:id/download/:format', async (req, res) => {
    try {
      const { id, format } = req.params;
      const resume = await storage.getTailoredResume(id);
      
      if (!resume) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }

      const tailoredContent = resume.tailoredContent as any;
      
      if (format === 'pdf' || format === 'docx') {
        const { generateResumeDocumentFromContent } = await import('./services/resumeTailor');
        const buffer = await generateResumeDocumentFromContent(tailoredContent, format as 'pdf' | 'docx');
        
        // Always generate proper filename format: Name_DBA_Resume_CompanyName
        const contact = tailoredContent?.contact;
        const company = resume.company;
        
        let filename = `tailored_resume.${format}`; // fallback
        
        if (contact?.name && company) {
          const firstName = contact.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
          const cleanCompany = company
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .substring(0, 20);
          filename = `${firstName}_DBA_Resume_${cleanCompany}.${format}`;
        } else if (contact?.name) {
          const firstName = contact.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
          filename = `${firstName}_DBA_Resume.${format}`;
        }
        
        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
      } else {
        res.status(400).json({ error: 'Invalid format. Use pdf or docx.' });
      }
    } catch (error) {
      console.error('Error downloading tailored resume:', error);
      res.status(500).json({ error: 'Failed to download tailored resume' });
    }
  });

  // Follow-up Management Routes

  // Schedule follow-ups for a job application
  app.post('/api/followups/schedule', async (req, res) => {
    try {
      const { jobApplicationId, types } = req.body;
      
      if (!jobApplicationId) {
        return res.status(400).json({ error: 'jobApplicationId is required' });
      }

      const application = await storage.getJobApplication(jobApplicationId);
      if (!application) {
        return res.status(404).json({ error: 'Job application not found' });
      }

      // Default types: 1-week and 2-week follow-ups
      const followUpTypes = types || ['1w', '2w'];
      const appliedDate = application.appliedDate || new Date();
      const createdFollowUps = [];

      for (const type of followUpTypes) {
        let dueAt: Date;
        if (type === '1w') {
          dueAt = new Date(appliedDate);
          dueAt.setDate(dueAt.getDate() + 7);
        } else if (type === '2w') {
          dueAt = new Date(appliedDate);
          dueAt.setDate(dueAt.getDate() + 14);
        } else if (type === 'thank_you') {
          // Thank you follow-ups are due 1 day after interview
          if (application.interviewDate) {
            dueAt = new Date(application.interviewDate);
            dueAt.setDate(dueAt.getDate() + 1);
          } else {
            continue; // Skip if no interview date
          }
        } else {
          continue; // Skip unknown types
        }

        const followUp = await storage.createFollowUp({
          jobApplicationId,
          dueAt,
          type,
          status: 'pending',
          emailSubject: null,
          emailBody: null,
          sentAt: null,
        });

        createdFollowUps.push(followUp);
      }

      res.json({ 
        message: 'Follow-ups scheduled successfully',
        followUps: createdFollowUps 
      });
    } catch (error) {
      console.error('Error scheduling follow-ups:', error);
      res.status(500).json({ error: 'Failed to schedule follow-ups' });
    }
  });

  // Get all follow-ups or filter by job application
  app.get('/api/followups', async (req, res) => {
    try {
      const { jobApplicationId } = req.query;
      const followUps = await storage.getFollowUps(jobApplicationId as string);
      res.json(followUps);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
  });

  // Get pending follow-ups
  app.get('/api/followups/pending', async (req, res) => {
    try {
      const followUps = await storage.getPendingFollowUps();
      res.json(followUps);
    } catch (error) {
      console.error('Error fetching pending follow-ups:', error);
      res.status(500).json({ error: 'Failed to fetch pending follow-ups' });
    }
  });

  // Get follow-up statistics
  app.get('/api/followups/stats', async (req, res) => {
    try {
      const stats = await storage.getFollowUpStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching follow-up stats:', error);
      res.status(500).json({ error: 'Failed to fetch follow-up stats' });
    }
  });

  // Update a follow-up (mark as sent, skip, etc.)
  app.patch('/api/followups/:id', async (req, res) => {
    try {
      const updates = req.body;
      
      // Convert ISO string sentAt to Date object for Drizzle
      if (updates.sentAt && typeof updates.sentAt === 'string') {
        updates.sentAt = new Date(updates.sentAt);
      }
      
      // If marking as sent without sentAt, add current timestamp
      if (updates.status === 'sent' && !updates.sentAt) {
        updates.sentAt = new Date();
      }

      const updatedFollowUp = await storage.updateFollowUp(req.params.id, updates);
      if (!updatedFollowUp) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }
      res.json(updatedFollowUp);
    } catch (error) {
      console.error('Error updating follow-up:', error);
      res.status(500).json({ error: 'Failed to update follow-up' });
    }
  });

  // Delete a follow-up
  app.delete('/api/followups/:id', async (req, res) => {
    try {
      const success = await storage.deleteFollowUp(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }
      res.json({ message: 'Follow-up deleted successfully' });
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      res.status(500).json({ error: 'Failed to delete follow-up' });
    }
  });

  // Generate email content for a follow-up
  app.post('/api/followups/:id/generate-email', async (req, res) => {
    try {
      const followUp = await storage.getFollowUp(req.params.id);
      if (!followUp) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }

      const application = await storage.getJobApplication(followUp.jobApplicationId);
      if (!application) {
        return res.status(404).json({ error: 'Job application not found' });
      }

      // Get tailored resume for additional context
      const resume = await storage.getTailoredResume(application.tailoredResumeId);
      const tailoredContent = resume?.tailoredContent as any;
      const contactInfo = tailoredContent?.contact;

      const { generateFollowUpEmail } = await import('./services/openai');
      
      const emailTemplate = await generateFollowUpEmail(
        followUp.type as '1w' | '2w' | 'thank_you',
        application.jobTitle,
        application.company,
        contactInfo,
        resume?.originalJobDescription || undefined,
        tailoredContent
      );

      // Update the follow-up with generated email content
      const updatedFollowUp = await storage.updateFollowUp(req.params.id, {
        emailSubject: emailTemplate.subject,
        emailBody: emailTemplate.body
      });

      res.json({
        followUp: updatedFollowUp,
        email: emailTemplate
      });
    } catch (error) {
      console.error('Error generating follow-up email:', error);
      res.status(500).json({ error: 'Failed to generate follow-up email' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
