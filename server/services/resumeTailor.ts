import { analyzeJobPosting, analyzeResumeMatch, tailorResumeContent, extractContactInformation, type JobAnalysisResult, type ResumeAnalysis, type TailoredResumeContent, type ContactInformation } from './openai';
import { scrapeJobPosting, extractJobKeywords } from './jobScraper';
import { processResumeFile, generateResumeDocument, type ProcessedResumeContent } from './fileProcessor';
import { storage } from '../storage';
import type { ResumeSession } from '@shared/schema';

export interface TailoringResult {
  sessionId: string;
  jobAnalysis: JobAnalysisResult;
  resumeAnalysis: ResumeAnalysis;
  tailoredContent: TailoredResumeContent;
  matchScore: number;
}

export async function createTailoringSession(userId?: string): Promise<ResumeSession> {
  const session = await storage.createResumeSession({
    userId,
    status: 'draft'
  });
  
  return session;
}

export async function uploadResumeToSession(sessionId: string, file: any): Promise<ResumeSession> {
  const session = await storage.getResumeSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const processedResume = await processResumeFile(file);
  
  const updatedSession = await storage.updateResumeSession(sessionId, {
    baseResumeFile: processedResume.filename,
    baseResumeContent: {
      text: processedResume.text,
      fileType: processedResume.fileType,
      fileSize: processedResume.fileSize
    }
  });

  if (!updatedSession) {
    throw new Error('Failed to update session');
  }

  return updatedSession;
}

export async function uploadProfileToSession(sessionId: string, profileData: any): Promise<ResumeSession> {
  const session = await storage.getResumeSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const updatedSession = await storage.updateResumeSession(sessionId, {
    profileJson: profileData
  });

  if (!updatedSession) {
    throw new Error('Failed to update session');
  }

  return updatedSession;
}

export async function analyzeJobForSession(sessionId: string, data: { jobUrl?: string; jobDescription?: string }): Promise<ResumeSession> {
  const session = await storage.getResumeSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const { jobUrl, jobDescription } = data;

  await storage.updateResumeSession(sessionId, { status: 'analyzing' });

  try {
    let jobAnalysisData: {
      title?: string;
      company?: string;
      description: string;
      requirements?: string[];
      keywords: string[];
    };

    if (jobUrl) {
      // Handle URL input - existing logic
      let jobPosting = await storage.getJobPosting(jobUrl);
      
      if (!jobPosting || !jobPosting.scraped) {
        // Scrape the job posting
        const scrapedData = await scrapeJobPosting(jobUrl);
        
        // Analyze with AI
        const jobAnalysis = await analyzeJobPosting(scrapedData.description);
        const keywords = extractJobKeywords(scrapedData.description);
        
        // Ensure keywords from jobAnalysis is an array
        const analysisKeywords = Array.isArray(jobAnalysis.keywords) ? jobAnalysis.keywords : [];

        if (jobPosting) {
          // Update existing
          jobPosting = await storage.updateJobPosting(jobPosting.id, {
            title: scrapedData.title,
            company: scrapedData.company,
            description: scrapedData.description,
            requirements: scrapedData.requirements,
            keywords: [...keywords, ...analysisKeywords],
            scraped: true
          });
        } else {
          // Create new
          jobPosting = await storage.createJobPosting({
            url: jobUrl,
            title: scrapedData.title,
            company: scrapedData.company,
            description: scrapedData.description,
            requirements: scrapedData.requirements,
            keywords: [...keywords, ...analysisKeywords],
            scraped: true
          });
        }
      }

      if (!jobPosting) {
        throw new Error('Failed to create or retrieve job posting');
      }

      jobAnalysisData = {
        title: jobPosting.title || undefined,
        company: jobPosting.company || undefined,
        description: jobPosting.description || '',
        requirements: jobPosting.requirements as string[] || [],
        keywords: jobPosting.keywords as string[] || []
      };
    } else if (jobDescription) {
      // Handle direct job description input
      const jobAnalysis = await analyzeJobPosting(jobDescription);
      const keywords = extractJobKeywords(jobDescription);
      
      // Ensure keywords from jobAnalysis is an array
      const analysisKeywords = Array.isArray(jobAnalysis.keywords) ? jobAnalysis.keywords : [];

      jobAnalysisData = {
        title: jobAnalysis.title,
        company: jobAnalysis.company,
        description: jobDescription,
        requirements: jobAnalysis.requirements,
        keywords: [...keywords, ...analysisKeywords]
      };
    } else {
      throw new Error('Either job URL or job description must be provided');
    }

    // Store job analysis in session
    const updatedSession = await storage.updateResumeSession(sessionId, {
      jobUrl: jobUrl || undefined,
      jobDescription: jobDescription || undefined,
      jobAnalysis: jobAnalysisData
    });

    if (!updatedSession) {
      throw new Error('Failed to update session');
    }

    return updatedSession;
  } catch (error) {
    await storage.updateResumeSession(sessionId, { status: 'error' });
    throw error;
  }
}

export async function tailorResumeForSession(sessionId: string): Promise<TailoringResult> {
  const session = await storage.getResumeSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.baseResumeContent || !session.jobAnalysis) {
    throw new Error('Missing resume content or job analysis');
  }

  await storage.updateResumeSession(sessionId, { status: 'tailoring' });

  try {
    const resumeContent = (session.baseResumeContent as any).text;
    const jobAnalysis = session.jobAnalysis as JobAnalysisResult;

    // Extract contact information from original resume
    const contactInfo = await extractContactInformation(resumeContent);

    // Analyze resume match
    const resumeAnalysis = await analyzeResumeMatch(resumeContent, jobAnalysis);
    
    // Generate tailored content with contact information
    const tailoredContent = await tailorResumeContent(resumeContent, jobAnalysis, resumeAnalysis, contactInfo);

    // Update session with results, including keyword match data in jobAnalysis
    const updatedJobAnalysis = {
      ...jobAnalysis,
      matchedKeywords: resumeAnalysis.matchedKeywords,
      missingKeywords: resumeAnalysis.missingKeywords
    };

    const updatedSession = await storage.updateResumeSession(sessionId, {
      tailoredContent,
      matchScore: resumeAnalysis.matchScore,
      jobAnalysis: updatedJobAnalysis,
      status: 'tailored'
    });

    return {
      sessionId,
      jobAnalysis: updatedJobAnalysis,
      resumeAnalysis,
      tailoredContent,
      matchScore: resumeAnalysis.matchScore
    };
  } catch (error) {
    await storage.updateResumeSession(sessionId, { status: 'error' });
    throw error;
  }
}

export async function generateResumeDocuments(sessionId: string): Promise<{ pdf: Buffer; docx: Buffer }> {
  const session = await storage.getResumeSession(sessionId);
  if (!session || !session.tailoredContent) {
    throw new Error('Session not found or no tailored content available');
  }

  const pdfBuffer = await generateResumeDocument(session.tailoredContent, 'pdf');
  const docxBuffer = await generateResumeDocument(session.tailoredContent, 'docx');

  await storage.updateResumeSession(sessionId, { status: 'completed' });

  return {
    pdf: pdfBuffer,
    docx: docxBuffer
  };
}

// NEW: Generate documents directly from tailored content (for saved resumes)
export async function generateResumeDocumentFromContent(tailoredContent: any, format: 'pdf' | 'docx'): Promise<Buffer> {
  if (!tailoredContent) {
    throw new Error('No tailored content available');
  }

  return await generateResumeDocument(tailoredContent, format);
}
