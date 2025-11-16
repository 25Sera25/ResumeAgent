import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import passport from "./auth";
import { requireAuth } from "./middleware/requireAuth";
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
  // ===================
  // AUTHENTICATION ROUTES
  // ===================
  
  // Register new user (admin-only, except first user)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check if this is the first user
      const userCount = await storage.getUserCount();
      const isFirstUser = userCount === 0;

      // If not first user, require admin authentication
      if (!isFirstUser) {
        if (!req.isAuthenticated() || !req.user?.isAdmin) {
          return res.status(403).json({ error: "Admin access required to create users" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user - first user is admin
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        isAdmin: isFirstUser,
      });

      // Only auto-login if it's the first user
      if (isFirstUser) {
        req.login(user, (err) => {
          if (err) {
            console.error("[AUTH] Login error after registration:", err);
            return res.status(500).json({ error: "Failed to log in after registration" });
          }
          // CRITICAL FIX: Force session save to database before responding
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[AUTH] Session save error after registration:", saveErr);
              return res.status(500).json({ error: "Failed to save session" });
            }
            console.log(`[AUTH] First user registered and logged in. SessionID: ${req.sessionID}, User: ${user.username}`);
            res.json({ 
              id: user.id, 
              username: user.username,
              isAdmin: user.isAdmin,
              message: "First admin user created successfully"
            });
          });
        });
      } else {
        // Admin created a new user - don't auto-login
        res.json({ 
          id: user.id, 
          username: user.username,
          message: "User created successfully"
        });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("[AUTH] Login error:", err);
          return res.status(500).json({ error: "Failed to log in" });
        }
        // CRITICAL FIX: Force session save to database before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[AUTH] Session save error:", saveErr);
            return res.status(500).json({ error: "Failed to save session" });
          }
          console.log(`[AUTH] Login successful - SessionID: ${req.sessionID}, User: ${user.username}, UserID: ${user.id}`);
          console.log(`[AUTH] Session authenticated: ${req.isAuthenticated()}`);
          res.json({ 
            id: user.id, 
            username: user.username,
            isAdmin: user.isAdmin
          });
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    const isAuth = req.isAuthenticated();
    const sessionId = req.sessionID;
    const username = req.user?.username || 'none';
    
    console.log(`[AUTH] GET /api/auth/user - SessionID: ${sessionId}, Authenticated: ${isAuth}, User: ${username}`);
    
    if (isAuth && req.user) {
      res.json({ 
        user: {
          id: req.user.id, 
          username: req.user.username,
          isAdmin: req.user.isAdmin
        }
      });
    } else {
      // Return 200 with null user instead of 401 for cleaner UX
      // This avoids console errors and simplifies React Query behavior
      res.json({ user: null });
    }
  });

  // ===================
  // ADMIN ROUTES
  // ===================
  
  // Import admin middleware
  const { requireAdmin } = await import("./middleware/requireAdmin");

  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send password hashes to client
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Prevent admin from deleting themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ===================
  // PROTECTED ROUTES
  // ===================
  
  // Create a new tailoring session
  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const session = await createTailoringSession(userId);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get session details
  app.get("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const session = await storage.getResumeSession(req.params.id, userId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get user's sessions
  app.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessions = await storage.getUserResumeSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Upload resume file
  app.post("/api/sessions/:id/resume", requireAuth, upload.single('resume'), async (req, res) => {
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
  app.post("/api/sessions/:id/profile", requireAuth, async (req, res) => {
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
  app.post("/api/sessions/:id/analyze-job", requireAuth, async (req, res) => {
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
  app.post("/api/sessions/:id/tailor", requireAuth, async (req, res) => {
    try {
      const result = await tailorResumeForSession(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Download tailored resume
  app.get("/api/sessions/:id/download/:format", requireAuth, async (req, res) => {
    try {
      const { format } = req.params;
      const userId = req.user!.id;
      
      if (!['pdf', 'docx'].includes(format)) {
        return res.status(400).json({ error: "Format must be pdf or docx" });
      }

      const documents = await generateResumeDocuments(req.params.id);
      const buffer = format === 'pdf' ? documents.pdf : documents.docx;
      
      // Get session with userId to ensure user owns it
      const session = await storage.getResumeSession(req.params.id, userId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Create filename in format: FirstName_DBA_Resume_Company (matching save-to-library pattern)
      let filename = 'tailored_resume';
      
      // PRIORITY 1: Check if this session has already been saved to library and reuse that filename
      try {
        const savedResumes = await storage.getTailoredResumes(userId);
        const savedResume = savedResumes.find(r => r.sessionId === req.params.id);
        if (savedResume?.filename) {
          // Strip any existing extension from stored filename
          filename = savedResume.filename.replace(/\.(pdf|docx)$/i, '');
          console.log(`[SESSION_DOWNLOAD] Reusing saved resume filename: ${savedResume.filename} -> ${filename}.${format}`);
        }
      } catch (err) {
        console.log(`[SESSION_DOWNLOAD] Could not check for saved resume, continuing with generation:`, err);
      }
      
      // PRIORITY 2: Generate filename from session data (if not already set from saved resume)
      if (filename === 'tailored_resume') {
        const tailoredContent = session.tailoredContent;
        const jobAnalysis = session.jobAnalysis;
        
        console.log(`[SESSION_DOWNLOAD] Session ${req.params.id} data:`, {
          hasTailoredContent: !!tailoredContent,
          hasJobAnalysis: !!jobAnalysis,
          contactName: tailoredContent && typeof tailoredContent === 'object' ? (tailoredContent as any).contact?.name : null,
          company: jobAnalysis && typeof jobAnalysis === 'object' ? (jobAnalysis as any).company : null,
        });
        
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
            console.log(`[SESSION_DOWNLOAD] Generated filename from contact+company: ${filename}`);
          } else if (contact?.name) {
            // Fallback to just name_DBA_Resume if no company
            const firstName = contact.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
            filename = `${firstName}_DBA_Resume`;
            console.log(`[SESSION_DOWNLOAD] Generated filename from contact only: ${filename}`);
          } else {
            console.log(`[SESSION_DOWNLOAD] Missing contact/company data, using fallback: ${filename}`);
          }
        } else {
          console.log(`[SESSION_DOWNLOAD] No tailoredContent or jobAnalysis, using fallback: ${filename}`);
        }
      }
      
      filename += `.${format}`;
      console.log(`[SESSION_DOWNLOAD] Final filename for session ${req.params.id}: ${filename}`);

      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buffer);
    } catch (error) {
      console.error(`[SESSION_DOWNLOAD] Error downloading session ${req.params.id}:`, error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get job posting analysis
  app.get("/api/jobs/:id", requireAuth, async (req, res) => {
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
  app.get("/api/resumes", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const resumes = await storage.getStoredResumes(userId);
      res.json(resumes || []);
    } catch (error) {
      console.error("Error fetching stored resumes:", error);
      // Return empty array instead of 500 for better UX
      res.json([]);
    }
  });

  // Upload and store a resume
  app.post("/api/resumes", requireAuth, upload.single('resume'), async (req, res) => {
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
      const userId = req.user!.id;
      const storedResume = await storage.createStoredResume({
        userId,
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
  app.get("/api/resumes/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const resume = await storage.getStoredResume(req.params.id, userId);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json(resume);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Update stored resume (name, default status)
  app.patch("/api/resumes/:id", requireAuth, async (req, res) => {
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
  app.delete("/api/resumes/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteStoredResume(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Set resume as default
  app.post("/api/resumes/:id/set-default", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const success = await storage.setDefaultResume(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Use stored resume for session
  app.post("/api/sessions/:sessionId/use-resume/:resumeId", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const storedResume = await storage.getStoredResume(req.params.resumeId, userId);
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
  app.post('/api/sessions/:sessionId/save', requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;
      
      console.log(`[SAVE] Attempting to save resume for session ${sessionId}, user ${userId}`);
      
      const session = await storage.getResumeSession(sessionId, userId);
      
      // Detailed validation with specific error messages
      if (!session) {
        console.error(`[SAVE] Session not found: ${sessionId}`);
        return res.status(404).json({ 
          error: 'Session not found',
          details: 'The resume tailoring session could not be found. Please start a new session.'
        });
      }
      
      if (!session.tailoredContent) {
        console.error(`[SAVE] No tailored content in session ${sessionId}`);
        return res.status(400).json({ 
          error: 'Resume not tailored yet',
          details: 'Please tailor your resume before saving it to the library. Click "Tailor Resume" to generate an optimized version.'
        });
      }
      
      if (!session.jobAnalysis) {
        console.error(`[SAVE] No job analysis in session ${sessionId}`);
        return res.status(400).json({ 
          error: 'Job analysis missing',
          details: 'Job information is required to save the resume. Please analyze a job posting first.'
        });
      }

      const jobAnalysis = session.jobAnalysis as any;
      const tailoredContent = session.tailoredContent as any;
      
      // Validate critical data with fallbacks
      if (!jobAnalysis || typeof jobAnalysis !== 'object') {
        console.error(`[SAVE] Invalid jobAnalysis format in session ${sessionId}:`, jobAnalysis);
        return res.status(400).json({ 
          error: 'Invalid job analysis data',
          details: 'The job analysis data is corrupted. Please re-analyze the job posting.'
        });
      }
      
      if (!tailoredContent || typeof tailoredContent !== 'object') {
        console.error(`[SAVE] Invalid tailoredContent format in session ${sessionId}:`, tailoredContent);
        return res.status(400).json({ 
          error: 'Invalid tailored content',
          details: 'The tailored resume data is corrupted. Please re-tailor your resume.'
        });
      }
      
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
      
      console.log(`[SAVE] Saving resume with filename: ${filename}`);
      console.log(`[SAVE] Data being saved:`, {
        userId,
        sessionId,
        jobTitle: jobAnalysis.title || 'Unknown Position',
        company: jobAnalysis.company || 'Unknown Company',
        filename,
        hasTailoredContent: !!session.tailoredContent,
        hasMicroEdits: !!(tailoredContent.appliedMicroEdits),
        hasImprovements: !!(tailoredContent.improvements),
      });

      try {
        const savedResume = await storage.saveTailoredResume({
          userId,
          sessionId,
          jobTitle: jobAnalysis.title || 'Unknown Position',
          company: jobAnalysis.company || 'Unknown Company',
          jobUrl: session.jobUrl || null,
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

        console.log(`[SAVE] Successfully saved resume ${savedResume.id} for session ${sessionId}`);
        res.json({ id: savedResume.id, filename: savedResume.filename, message: 'Resume saved permanently!' });
      } catch (saveError) {
        console.error('[SAVE] Database error details:', {
          error: saveError,
          message: saveError instanceof Error ? saveError.message : 'Unknown',
          stack: saveError instanceof Error ? saveError.stack : undefined,
        });
        throw saveError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error('[SAVE] Error saving tailored resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: 'Failed to save tailored resume',
        details: `An unexpected error occurred: ${errorMessage}. Please try again or contact support.`
      });
    }
  });

  // Get all saved tailored resumes
  app.get('/api/tailored-resumes', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const resumes = await storage.getTailoredResumes(userId);
      res.json(resumes);
    } catch (error) {
      console.error('Error fetching tailored resumes:', error);
      res.status(500).json({ error: 'Failed to fetch tailored resumes' });
    }
  });

  // Get specific tailored resume
  app.get('/api/tailored-resumes/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const resume = await storage.getTailoredResume(req.params.id, userId);
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
  app.post('/api/tailored-resumes/:id/mark-applied', requireAuth, async (req, res) => {
    try {
      const { notes, priority = 'medium', source } = req.body;
      const resumeId = req.params.id;
      const userId = req.user!.id;
      
      const resume = await storage.getTailoredResume(resumeId, userId);
      if (!resume) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }

      // Mark resume as applied
      const updatedResume = await storage.markAsApplied(resumeId, notes);
      
      // Create job application tracking entry
      const application = await storage.createJobApplication({
        userId,
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
  app.put('/api/tailored-resumes/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/tailored-resumes/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const success = await storage.deleteTailoredResume(req.params.id, userId);
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
  app.get('/api/job-applications', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const applications = await storage.getJobApplications(userId);
      res.json(applications || []);
    } catch (error) {
      console.error('Error fetching job applications:', error);
      // Return empty array instead of 500 for better UX
      res.json([]);
    }
  });

  // Get application statistics
  app.get('/api/job-applications/stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getApplicationStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching application stats:', error);
      res.status(500).json({ error: 'Failed to fetch application stats' });
    }
  });

  // Get overall session statistics (for homepage)
  app.get('/api/session-stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getOverallStats(userId);
      res.json(stats || {
        jobsAnalyzed: 0,
        resumesGenerated: 0,
        applicationsSent: 0,
        followUpsScheduled: 0
      });
    } catch (error) {
      console.error('Error fetching session stats:', error);
      // Return zeroed stats instead of 500 for better UX
      res.json({
        jobsAnalyzed: 0,
        resumesGenerated: 0,
        applicationsSent: 0,
        followUpsScheduled: 0
      });
    }
  });

  // Update job application status
  app.put('/api/job-applications/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/job-applications/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const success = await storage.deleteJobApplication(req.params.id, userId);
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
  app.get('/api/tailored-resumes/:id/download/:format', requireAuth, async (req, res) => {
    try {
      const { id, format } = req.params;
      const userId = req.user!.id;
      const resume = await storage.getTailoredResume(id, userId);
      
      if (!resume) {
        return res.status(404).json({ error: 'Tailored resume not found' });
      }

      const tailoredContent = resume.tailoredContent as any;
      
      if (format === 'pdf' || format === 'docx') {
        const { generateResumeDocumentFromContent } = await import('./services/resumeTailor');
        const buffer = await generateResumeDocumentFromContent(tailoredContent, format as 'pdf' | 'docx');
        
        // Use the stored filename from database if available, otherwise generate from contact/company
        // Format: FirstName_DBA_Company.format (e.g., "Ayele_DBA_Microsoft.pdf")
        let filename = `tailored_resume.${format}`; // fallback
        
        if (resume.filename) {
          // Strip any existing extension from stored filename before adding format extension
          const baseFilename = resume.filename.replace(/\.(pdf|docx)$/i, '');
          filename = `${baseFilename}.${format}`;
          console.log(`[DOWNLOAD] Using stored filename: ${resume.filename} -> ${filename}`);
        } else {
          // Fallback: generate from contact and company info
          const contact = tailoredContent?.contact;
          const company = resume.company;
          
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
        }
        
        console.log(`[DOWNLOAD] Serving resume ${id} with filename: ${filename}`);
        
        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
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
  app.post('/api/followups/schedule', requireAuth, async (req, res) => {
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
  app.get('/api/followups', requireAuth, async (req, res) => {
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
  app.get('/api/followups/pending', requireAuth, async (req, res) => {
    try {
      const followUps = await storage.getPendingFollowUps();
      res.json(followUps);
    } catch (error) {
      console.error('Error fetching pending follow-ups:', error);
      res.status(500).json({ error: 'Failed to fetch pending follow-ups' });
    }
  });

  // Get follow-up statistics
  app.get('/api/followups/stats', requireAuth, async (req, res) => {
    try {
      const stats = await storage.getFollowUpStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching follow-up stats:', error);
      res.status(500).json({ error: 'Failed to fetch follow-up stats' });
    }
  });

  // Update a follow-up (mark as sent, skip, etc.)
  app.patch('/api/followups/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/followups/:id', requireAuth, async (req, res) => {
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
  app.post('/api/followups/:id/generate-email', requireAuth, async (req, res) => {
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

  // ===========================================
  // NEW FEATURE 1: INTERVIEW QUESTION GENERATOR
  // ===========================================
  
  app.post('/api/sessions/:id/interview-questions', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const session = await storage.getResumeSession(req.params.id, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      if (!session.jobDescription && !session.jobAnalysis) {
        return res.status(400).json({ error: 'Job description not available for this session' });
      }
      
      const { generateInterviewQuestions } = await import('./services/openai');
      
      const jobDescription = session.jobDescription || 
        (session.jobAnalysis as any)?.description || 
        JSON.stringify(session.jobAnalysis);
      
      const tailoredContent = session.tailoredContent as any;
      
      const interviewQuestions = await generateInterviewQuestions(
        jobDescription,
        tailoredContent
      );
      
      // Save interview questions to session
      await storage.updateResumeSession(req.params.id, {
        interviewPrep: interviewQuestions
      });
      
      res.json(interviewQuestions);
    } catch (error) {
      console.error('Error generating interview questions:', error);
      res.status(500).json({ error: 'Failed to generate interview questions' });
    }
  });

  // ===========================================
  // NEW FEATURE 2: ATS BREAKDOWN
  // ===========================================
  
  app.get('/api/sessions/:id/ats-breakdown', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const session = await storage.getResumeSession(req.params.id, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const tailoredContent = session.tailoredContent as any;
      
      if (!tailoredContent) {
        return res.status(400).json({ error: 'Tailored content not available' });
      }
      
      // Return ATS breakdown from tailored content
      const breakdown = {
        overallScore: tailoredContent.atsScore || tailoredContent.coreScore || 0,
        sectionScores: tailoredContent.scoreBreakdown || {},
        formattingIssues: tailoredContent.formattingIssues || [],
        coverageReport: tailoredContent.coverageReport || {}
      };
      
      res.json(breakdown);
    } catch (error) {
      console.error('Error fetching ATS breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch ATS breakdown' });
    }
  });
  
  app.get('/api/sessions/:id/plain-text-preview', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const session = await storage.getResumeSession(req.params.id, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const { generatePlainTextPreview } = await import('./services/fileProcessor');
      const resumeContent = session.baseResumeContent as string || '';
      
      const plainText = generatePlainTextPreview(resumeContent);
      
      res.json({ plainTextPreview: plainText });
    } catch (error) {
      console.error('Error generating plain text preview:', error);
      res.status(500).json({ error: 'Failed to generate plain text preview' });
    }
  });

  // ===========================================
  // NEW FEATURE 3: SKILLS GAP DASHBOARD
  // ===========================================
  
  app.get('/api/insights/skills', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { getSkillsInsights } = await import('./services/insights');
      
      const insights = await getSkillsInsights(userId);
      
      res.json(insights);
    } catch (error) {
      console.error('Error fetching skills insights:', error);
      res.status(500).json({ error: 'Failed to fetch skills insights' });
    }
  });

  // ===========================================
  // NEW FEATURE 5: RESUME ANALYTICS
  // ===========================================
  
  app.get('/api/tailored-resumes/analytics', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { getTailoredResumeAnalytics } = await import('./services/insights');
      
      const analytics = await getTailoredResumeAnalytics(userId);
      
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching resume analytics:', error);
      res.status(500).json({ error: 'Failed to fetch resume analytics' });
    }
  });

  // ===========================================
  // INTERVIEW PREP HUB
  // ===========================================

  // Generate interview questions and answers
  app.post('/api/interview-prep/questions', requireAuth, async (req, res) => {
    try {
      const { jobId, skill, mode = 'general' } = req.body;
      const userId = req.user!.id;
      
      let context: any = { mode };
      
      // Resolve context based on mode
      if (mode === 'job' && jobId) {
        // Try to get tailored resume first, then session
        const tailoredResume = await storage.getTailoredResume(jobId, userId);
        if (tailoredResume) {
          context.jobDescription = tailoredResume.originalJobDescription || '';
          context.jobAnalysis = {
            title: tailoredResume.jobTitle,
            company: tailoredResume.company,
            technologies: (tailoredResume.tailoredContent as any)?.skills || []
          };
          context.tailoredContent = tailoredResume.tailoredContent;
        } else {
          // Fall back to session
          const session = await storage.getResumeSession(jobId, userId);
          if (session) {
            context.jobDescription = session.jobDescription || '';
            context.jobAnalysis = session.jobAnalysis;
            context.tailoredContent = session.tailoredContent;
          }
        }
      } else if (mode === 'skill' && skill) {
        context.skills = Array.isArray(skill) ? skill : [skill];
      }
      
      const { generateInterviewPrepQuestions } = await import('./services/openai');
      const result = await generateInterviewPrepQuestions(context);
      
      res.json(result);
    } catch (error) {
      console.error('Error generating interview questions:', error);
      res.status(500).json({ error: 'Failed to generate interview questions' });
    }
  });

  // Generate skill explanations
  app.post('/api/interview-prep/skills-explanations', requireAuth, async (req, res) => {
    try {
      const { skills, jobId, mode = 'general' } = req.body;
      const userId = req.user!.id;
      
      let skillsList: string[] = [];
      let context: any = {};
      
      // If skills provided directly, use them
      if (skills && Array.isArray(skills) && skills.length > 0) {
        skillsList = skills;
      } else if (mode === 'job' && jobId) {
        // Get skills from job
        const tailoredResume = await storage.getTailoredResume(jobId, userId);
        if (tailoredResume) {
          const content = tailoredResume.tailoredContent as any;
          skillsList = content?.skills || [];
          context.jobDescription = tailoredResume.originalJobDescription;
          context.tailoredContent = tailoredResume.tailoredContent;
        } else {
          const session = await storage.getResumeSession(jobId, userId);
          if (session) {
            const content = session.tailoredContent as any;
            skillsList = content?.skills || [];
            context.jobDescription = session.jobDescription;
            context.tailoredContent = session.tailoredContent;
          }
        }
      } else {
        // Try to get top skills from insights first
        try {
          const { getSkillsInsights } = await import('./services/insights');
          const insights = await getSkillsInsights(userId);
          if (insights?.topSkills && insights.topSkills.length > 0) {
            skillsList = insights.topSkills.slice(0, 8).map((s: any) => s.skill);
          }
        } catch (insightsError) {
          console.log('Could not fetch insights, using default DBA skills:', insightsError);
        }
      }
      
      // If still no skills, use default DBA skills for general mode
      if (skillsList.length === 0) {
        skillsList = [
          'SQL Server Administration',
          'High Availability & Disaster Recovery',
          'Performance Tuning',
          'T-SQL',
          'Backup & Restore',
          'Security & Compliance',
          'Azure SQL Database',
          'PowerShell Automation'
        ];
        console.log('Using default DBA skills for general mode');
      }
      
      const { generateSkillExplanations } = await import('./services/openai');
      const result = await generateSkillExplanations(skillsList, context);
      
      res.json(result);
    } catch (error) {
      console.error('Error generating skill explanations:', error);
      res.status(500).json({ error: 'Failed to generate skill explanations' });
    }
  });

  // Generate STAR stories
  app.post('/api/interview-prep/star-stories', requireAuth, async (req, res) => {
    try {
      const { resumeId, sessionId, jobId, skill, mode = 'general' } = req.body;
      const userId = req.user!.id;
      
      let resumeContent: any = null;
      let context: any = {};
      
      if (skill) {
        context.skill = skill;
      }
      
      // Get resume content from various sources
      if (mode === 'job' && jobId) {
        const tailoredResume = await storage.getTailoredResume(jobId, userId);
        if (tailoredResume) {
          resumeContent = tailoredResume.tailoredContent;
          context.jobDescription = tailoredResume.originalJobDescription;
        } else {
          const session = await storage.getResumeSession(jobId, userId);
          if (session) {
            resumeContent = session.tailoredContent;
            context.jobDescription = session.jobDescription;
          }
        }
      } else if (sessionId) {
        const session = await storage.getResumeSession(sessionId, userId);
        if (session) {
          resumeContent = session.tailoredContent;
          context.jobDescription = session.jobDescription;
        }
      } else if (resumeId) {
        const storedResume = await storage.getStoredResume(resumeId, userId);
        if (storedResume) {
          // For stored resumes, we need to parse the content differently
          // They don't have structured experience like tailored resumes
          resumeContent = {
            experience: [{
              achievements: [storedResume.content]
            }]
          };
        }
      } else {
        // Get most recent tailored resume for general mode
        const tailoredResumes = await storage.getTailoredResumes(userId);
        if (tailoredResumes && tailoredResumes.length > 0) {
          const latest = tailoredResumes[0];
          resumeContent = latest.tailoredContent;
          context.jobDescription = latest.originalJobDescription;
        }
      }
      
      if (!resumeContent) {
        return res.status(400).json({ 
          error: 'no_resume_content',
          message: 'No resume content available. Save a tailored resume or select a specific job first.' 
        });
      }
      
      const { generateStarStories } = await import('./services/openai');
      const result = await generateStarStories(resumeContent, context);
      
      res.json(result);
    } catch (error) {
      console.error('Error generating STAR stories:', error);
      res.status(500).json({ error: 'Failed to generate STAR stories' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
