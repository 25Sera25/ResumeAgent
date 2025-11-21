import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY_ENV_VAR ||
  "default_key";

// Validate API key configuration
if (!apiKey || apiKey === "default_key") {
  console.error(
    "[OPENAI] WARNING: OpenAI API key is not configured! Set OPENAI_API_KEY environment variable."
  );
} else {
  console.log("[OPENAI] API key configured (length:", apiKey.length, ")");
}

const openai = new OpenAI({
  apiKey,
});

// -------------------------------
// Core types
// -------------------------------

export interface JobAnalysisResult {
  title: string;
  company: string;
  requirements: string[];
  keywords: string[];
  skills: string[];
  experience: string[];
  certifications: string[];
  technologies: string[];
  // Enhanced for JD-first methodology
  charCount: number;
  wordCount: string;
  firstChars: string;
  roleArchetype: string;
  keywordBuckets: {
    coreTech: string[];
    responsibilities: string[];
    tools: string[];
    adjacentDataStores: string[];
    compliance: string[];
    logistics: string[];
  };
  synonymMap: Record<string, string[]>;
  qualityGates: {
    sufficientLength: boolean;
    roleSpecific: boolean;
    notGeneric: boolean;
  };
}

export interface ResumeAnalysis {
  strengths: string[];
  gaps: string[];
  matchScore: number;
  suggestions: string[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  // ATS Score Breakdown
  sectionScores?: {
    header: number;
    summary: number;
    experience: number;
    skills: number;
    certifications: number;
  };
  formattingIssues?: string[];
  plainTextPreview?: string;
}

export interface ContactInformation {
  name: string;
  title: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  linkedin: string;
}

export interface TailoredResumeContent {
  contact: ContactInformation;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    achievements: string[];
  }>;
  skills: string[];
  keywords: string[];
  certifications: string[];
  professionalDevelopment: string[];
  education: string[];
  improvements: string[];
  atsScore: number;
  // Enhanced for JD-first methodology
  coreScore: number;
  scoreBreakdown: {
    coreTech: { earned: number; possible: number; evidence: string[] };
    responsibilities: { earned: number; possible: number; evidence: string[] };
    tools: { earned: number; possible: number; evidence: string[] };
    adjacentDataStores: { earned: number; possible: number; evidence: string[] };
    compliance: { earned: number; possible: number; evidence: string[] };
    logistics: { earned: number; possible: number; evidence: string[] };
  };
  coverageReport: {
    matchedKeywords: string[];
    missingKeywords: string[];
    truthfulnessLevel: Record<string, "hands-on" | "familiar" | "omitted">;
  };
  appliedMicroEdits: string[];
  suggestedMicroEdits: string[];
}

// -------------------------------
// New: Base resume + tech inventory
// -------------------------------

export interface BaseExperience {
  title: string;
  company: string;
  location: string;
  duration: string;
  achievements: string[];
}

export interface BaseResume {
  contact: ContactInformation;
  summary: string;
  experience: BaseExperience[];
  skills: string[];
  education: string[];
  certifications: string[];
  professionalDevelopment: string[];
}

export interface TechInventory {
  databases: string[];
  cloud: string[];
  tools: string[];
  programming: string[];
  security: string[];
  other?: string[];
}

// Example default inventory for YOUR current stack
// You can modify or replace this when calling tailorResumeContent
export const defaultTechInventory: TechInventory = {
  databases: ["SQL Server", "SQL Server 2012", "SQL Server 2014", "SQL Server 2016", "SQL Server 2017", "SQL Server 2019", "SQL Server 2022", "Oracle", "MySQL", "Amazon Redshift", "Snowflake"],
  cloud: ["AWS", "Azure", "RDS", "DMS", "S3", "EC2", "Azure SQL Database", "Azure Monitor"],
  tools: ["SSRS", "SSIS", "SQL Sentry", "SolarWinds Database Performance Analyzer", "Idera Diagnostic Manager", "Logi Server", "Logi Composer", "AWS Glue"],
  programming: ["T-SQL", "PowerShell", "AWS CLI", "Azure CLI"],
  security: ["Transparent Data Encryption", "TDE", "Row-Level Security", "Dynamic Data Masking", "Always Encrypted", "Data Classification"],
  other: ["GitHub", "Azure DevOps"],
};

// -------------------------------
// Helpers
// -------------------------------

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Compute a more deterministic matchScore using keywords + section scores
 */
function computeMatchScore(
  jobAnalysis: JobAnalysisResult,
  resumeAnalysis: ResumeAnalysis
): number {
  const totalKeywords = jobAnalysis.keywords?.length || 0;
  const matched = resumeAnalysis.matchedKeywords?.length || 0;

  const rawKeywordScore =
    totalKeywords > 0 ? matched / totalKeywords : 0.75; // default mid if no keywords

  const section = resumeAnalysis.sectionScores || {
    header: 80,
    summary: 80,
    experience: 80,
    skills: 80,
    certifications: 80,
  };

  const sectionAvg =
    (section.summary + section.experience + section.skills) / (3 * 100);

  const combined = (0.7 * rawKeywordScore + 0.3 * sectionAvg) * 100;
  return Math.round(Math.min(100, Math.max(0, combined)));
}

// -------------------------------
// Contact info extraction
// -------------------------------

export async function extractContactInformation(
  resumeContent: string
): Promise<ContactInformation> {
  try {
    const prompt = `Extract ONLY the actual contact information from this resume. Do NOT use generic placeholders or invent information.

Resume Content:
${resumeContent}

CRITICAL INSTRUCTIONS:
- Find the person's REAL NAME (not placeholders like "John Doe" or "Professional Name")
- Extract ACTUAL contact details that appear in the resume text
- If information is not explicitly stated, leave that field empty
- Do not make assumptions or use generic values

Please respond with a JSON object containing:
- name: The actual full name of the person
- title: The actual professional title/job title from the resume
- phone: The actual phone number if present
- email: The actual email address if present  
- city: The actual city name if present
- state: The actual state/province if present
- linkedin: The actual LinkedIn profile URL or username if present

If any field is not found in the resume, return an empty string for that field.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting contact information from resumes. Only return information that is explicitly stated in the document.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as ContactInformation;
  } catch (error) {
    throw new Error(
      "Failed to extract contact information: " + (error as Error).message
    );
  }
}

// -------------------------------
// Job posting analysis
// -------------------------------

export async function analyzeJobPosting(
  jobDescription: string
): Promise<JobAnalysisResult> {
  try {
    const charCount = jobDescription.length;
    const wordCount = jobDescription.split(/\s+/).length;
    const firstChars = jobDescription.substring(0, 500);

    const prompt = `Analyze this job description using a JD-first evidence-based methodology:

Job Description (${charCount} characters):
${jobDescription}

Return a comprehensive JSON analysis containing:
- title: Job title
- company: Company name (if mentioned)
- requirements: Array of key requirements
- keywords: Array of 20-30 important keywords for ATS
- skills: Array of technical skills mentioned
- experience: Array of experience requirements
- certifications: Array of certifications mentioned
- technologies: Array of specific technologies/tools mentioned
- roleArchetype: Classification (e.g., "SQL Server DBA", "EHR Administrator", "Data Engineer")
- qualityGates: {
    sufficientLength: boolean (true if ≥3000 chars),
    roleSpecific: boolean (true if contains substantial role duties),
    notGeneric: boolean (true if not generic job posting)
  }
- keywordBuckets: {
    coreTech: Array of database/platform technologies,
    responsibilities: Array of operational duties,
    tools: Array of automation/monitoring tools,
    adjacentDataStores: Array of other data systems,
    compliance: Array of security/regulatory terms,
    logistics: Array of location/schedule requirements
  }
- synonymMap: Object mapping key terms to their synonyms

Focus on the specific technologies, responsibilities, and experience described in this job description. Do not assume a particular tech stack unless it is explicitly mentioned.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert implementing JD-first evidence-based tailoring methodology. Perform comprehensive job description analysis with strict quality gates and role archetype classification. Never proceed with weak or generic content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const keywords = safeArray<string>(result.keywords);
    const requirements = safeArray<string>(result.requirements);

    return {
      ...result,
      keywords,
      requirements,
      charCount,
      wordCount: wordCount.toString(),
      firstChars,
      qualityGates: result.qualityGates || {
        sufficientLength: charCount >= 3000,
        roleSpecific: true,
        notGeneric: true,
      },
      keywordBuckets: result.keywordBuckets || {
        coreTech: [],
        responsibilities: [],
        tools: [],
        adjacentDataStores: [],
        compliance: [],
        logistics: [],
      },
      synonymMap: result.synonymMap || {},
    } as JobAnalysisResult;
  } catch (error) {
    throw new Error("Failed to analyze job posting: " + (error as Error).message);
  }
}

// -------------------------------
// Resume vs JD match analysis
// -------------------------------

export async function analyzeResumeMatch(
  resumeContent: string,
  jobAnalysis: JobAnalysisResult,
  plainTextResume?: string
): Promise<ResumeAnalysis> {
  try {
    const prompt = `Analyze this resume against the job requirements.

Resume Content:
${resumeContent}

${plainTextResume ? `Plain Text ATS Preview:\n${plainTextResume}\n` : ""}

Job Requirements:
${JSON.stringify(jobAnalysis, null, 2)}

Please respond with a JSON object containing:
- strengths: Array of resume strengths that match the job
- gaps: Array of missing skills/experience from the resume
- matchScore: Percentage match (0-100) - initial estimate based on your judgment
- suggestions: Array of specific suggestions to improve the resume for this role
- matchedKeywords: Array of keywords from the job requirements that are present in the resume
- missingKeywords: Array of important keywords from the job requirements that are missing from the resume
- sectionScores: Object with scores for each resume section (0-100 each):
  {
    header: score for contact information completeness,
    summary: score for professional summary alignment with job,
    experience: score for experience section relevance,
    skills: score for skills match,
    certifications: score for certifications relevance
  }
- formattingIssues: Array of ATS formatting problems (e.g., "Two-column layout may cause parsing issues", "Header/footer content will be ignored", "Complex tables not ATS-friendly")
- plainTextPreview: Simplified text version showing how ATS systems will parse the resume`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SQL Server DBA recruiter and ATS systems analyst. Analyze resume compatibility with job requirements and identify ATS parsing issues.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}") as ResumeAnalysis;

    // Normalize and compute deterministic matchScore
    result.matchedKeywords = safeArray<string>(result.matchedKeywords);
    result.missingKeywords = safeArray<string>(result.missingKeywords);
    result.sectionScores =
      result.sectionScores || {
        header: 80,
        summary: 80,
        experience: 80,
        skills: 80,
        certifications: 80,
      };

    result.matchScore = computeMatchScore(jobAnalysis, result);

    return result;
  } catch (error) {
    throw new Error("Failed to analyze resume match: " + (error as Error).message);
  }
}

// -------------------------------
// Tailor resume content (truth-first, JD-aligned)
// -------------------------------

export async function tailorResumeContent(
  baseResume: BaseResume,
  jobAnalysis: JobAnalysisResult,
  resumeAnalysis: ResumeAnalysis,
  techInventory: TechInventory = defaultTechInventory
): Promise<TailoredResumeContent> {
  try {
    const FIXED_HEADLINE = "Senior SQL Server Database Administrator / SQL Developer";

    const prompt = `🚨 HARD NON-NEGOTIABLE RULES (TRUTH-FIRST):

1) TRUTHFULNESS:
- Do NOT invent employers, job titles, dates, certifications, or degrees.
- Do NOT claim experience with any technology that is NOT present in the BaseResume or TechInventory.
- If the job description mentions a technology that is NOT in BaseResume and NOT in TechInventory:
  - You may NOT add it to skills or experience.
  - You MUST list it ONLY under coverageReport.missingKeywords.

2) FIXED HEADLINE:
- contact.title MUST be exactly: "${FIXED_HEADLINE}"

3) EXPERIENCE HANDLING:
- Preserve all existing roles (title, company, duration) exactly as in the BaseResume.
- You may:
  - Reorder bullet points within a role.
  - Merge or lightly reword bullets for clarity and JD alignment.
  - Trim older or repetitive bullets to respect length.
- You may NOT:
  - Add new roles or employers,
  - Change dates or titles,
  - Fabricate brand-new project types unrelated to the BaseResume.

4) EDUCATION & CERTIFICATIONS:
- Use ONLY the education and certifications from BaseResume.
- Do NOT add new degrees or certifications.
- Do NOT change school names, degree types, or certification names.

5) LENGTH:
- Target ~900–1200 words total for the entire resume content.
- Keep the most recent 2–3 roles fully detailed; trim older experience first if needed.

6) COVERAGE LOGIC:
- Use JobAnalysis + ResumeAnalysis to prioritize which technologies and responsibilities to surface.
- If the candidate already has a matching skill, move it higher in the summary, skills, and relevant experience bullets.
- If a requirement is missing, reflect it in coverageReport.missingKeywords.
- Suggest future learning or phrasing improvements in suggestedMicroEdits (but do NOT fake experience).

SOURCE OF TRUTH:

BaseResume (ONLY true experience/skills):
${JSON.stringify(baseResume, null, 2)}

TechInventory (whitelisted technologies that may be claimed):
${JSON.stringify(techInventory, null, 2)}

JobAnalysis:
${JSON.stringify(jobAnalysis, null, 2)}

ResumeAnalysis:
${JSON.stringify(resumeAnalysis, null, 2)}

OUTPUT REQUIREMENTS:

Return a JSON object with:
- contact: Use BaseResume.contact but set title exactly to "${FIXED_HEADLINE}".
- summary: Professional summary that matches the job level and requirements from the job posting. You may mention the job posting title inside the summary text.
- experience: Array of experience objects:
  [
    {
      "title": string,          // from BaseResume
      "company": string,        // from BaseResume
      "duration": string,       // from BaseResume
      "achievements": string[]  // re-ordered, trimmed, and slightly reworded bullets aligned to JD
    }
  ]
- skills: Array of skills. Include only skills/technologies present in BaseResume or TechInventory. Prioritize JD-relevant ones.
- keywords: Operational and technical keywords aligned with the job posting (subset of skills/experience concepts).
- certifications: Array of certifications from BaseResume (no new ones).
- professionalDevelopment: Array from BaseResume (no new items).
- education: Array of education entries from BaseResume (no new degrees).
- improvements: COMPLETE LIST of tailoring changes applied for this job (e.g., "Surfaced AlwaysOn AG experience in summary", "Added reporting support bullet under UnitedHealth").
- atsScore: Your best estimate (0–100) of how well this tailored resume matches the JD for ATS-based screening.
- coreScore: Score focused on role-specific operational duties (0–100).
- scoreBreakdown: {
    coreTech: { earned: number; possible: number; evidence: string[] };
    responsibilities: { earned: number; possible: number; evidence: string[] };
    tools: { earned: number; possible: number; evidence: string[] };
    adjacentDataStores: { earned: number; possible: number; evidence: string[] };
    compliance: { earned: number; possible: number; evidence: string[] };
    logistics: { earned: number; possible: number; evidence: string[] };
  }
- coverageReport: {
    matchedKeywords: string[];
    missingKeywords: string[];
    truthfulnessLevel: Record<string, "hands-on" | "familiar" | "omitted">;
  }
- appliedMicroEdits: micro-edits you actually applied to the experience/summary/skills for this JD.
- suggestedMicroEdits: additional micro-edits the candidate could apply manually in future versions.

SCORING RUBRIC (for scoreBreakdown):
- Core Tech & Platforms (35 pts) - versions/stacks, HA/DR, cloud/on-prem mix relevant to JD.
- Responsibilities (25 pts) - operational work: prod support, backups, DR, performance tuning, reporting.
- Tools/Automation (15 pts) - scripting, monitoring tools, CI/CD, automation related to JD.
- Adjacent Data Stores (10 pts) - other DBs or warehouses relevant to JD.
- Compliance/Industry (10 pts) - HIPAA, PHI, audits, security relevant to JD context.
- Logistics & Culture (5 pts) - on-call, 24/7, communication, collaboration.

Be concise but specific. Use the candidate’s existing bullets and achievements as much as possible, adapting them to the language of the job posting.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer specializing in SQL Server DBA and cloud database positions. Create ATS-optimized, compelling, and truthful resume content based only on the provided base resume and tech inventory.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = JSON.parse(response.choices[0].message.content || "{}");

    // Normalize arrays for safety
    const skills = safeArray<string>(raw.skills);
    const keywords = safeArray<string>(raw.keywords);
    const certifications = safeArray<string>(raw.certifications);
    const improvements = safeArray<string>(raw.improvements);
    const experience = safeArray<{
      title: string;
      company: string;
      duration: string;
      achievements: string[];
    }>(raw.experience);
    const professionalDevelopment = safeArray<string>(raw.professionalDevelopment);

    const coverageReport =
      raw.coverageReport || {
        matchedKeywords: [],
        missingKeywords: [],
        truthfulnessLevel: {},
      };

    coverageReport.matchedKeywords = safeArray<string>(
      coverageReport.matchedKeywords
    );
    coverageReport.missingKeywords = safeArray<string>(
      coverageReport.missingKeywords
    );
    coverageReport.truthfulnessLevel =
      coverageReport.truthfulnessLevel || {};

    const appliedMicroEdits = safeArray<string>(raw.appliedMicroEdits);
    const suggestedMicroEdits = safeArray<string>(raw.suggestedMicroEdits);

    // SAFETY NET: Enforce fixed headline
    const FIXED_HEADLINE = "Senior SQL Server Database Administrator / SQL Developer";
    const contact: ContactInformation = {
      ...(raw.contact || baseResume.contact),
      title: FIXED_HEADLINE,
    };

    // Clean summary from any "Target:" banners if model slipped
    let summary: string = raw.summary || baseResume.summary;
    if (typeof summary === "string") {
      const summaryLines = summary.split("\n");
      const filteredLines = summaryLines.filter(
        (line: string) =>
          !line.trim().toLowerCase().startsWith("target:") &&
          !line.trim().toLowerCase().startsWith("target role:") &&
          !line.trim().toLowerCase().startsWith("target company:")
      );
      summary = filteredLines.join("\n").trim();
    }

    const atsScore = typeof raw.atsScore === "number" ? raw.atsScore : 90;
    const coreScore =
      typeof raw.coreScore === "number" ? raw.coreScore : atsScore;

    const scoreBreakdown =
      raw.scoreBreakdown || {
        coreTech: { earned: coreScore * 0.35, possible: 35, evidence: [] },
        responsibilities: { earned: coreScore * 0.25, possible: 25, evidence: [] },
        tools: { earned: coreScore * 0.15, possible: 15, evidence: [] },
        adjacentDataStores: {
          earned: coreScore * 0.1,
          possible: 10,
          evidence: [],
        },
        compliance: { earned: coreScore * 0.1, possible: 10, evidence: [] },
        logistics: { earned: coreScore * 0.05, possible: 5, evidence: [] },
      };

    return {
      contact,
      summary,
      experience,
      skills,
      keywords,
      certifications,
      professionalDevelopment,
      education: safeArray<string>(raw.education || baseResume.education),
      improvements,
      atsScore,
      coreScore,
      scoreBreakdown,
      coverageReport,
      appliedMicroEdits,
      suggestedMicroEdits,
    } as TailoredResumeContent;
  } catch (error) {
    throw new Error(
      "Failed to tailor resume content: " + (error as Error).message
    );
  }
}

// -------------------------------
// Follow-up email generation
// -------------------------------

export interface FollowUpEmailTemplate {
  subject: string;
  body: string;
}

export async function generateFollowUpEmail(
  type: "1w" | "2w" | "thank_you",
  jobTitle: string,
  company: string,
  contactInfo?: ContactInformation,
  jobDescription?: string,
  tailoredContent?: TailoredResumeContent
): Promise<FollowUpEmailTemplate> {
  try {
    let prompt = "";

    if (type === "1w") {
      prompt = `Generate a professional 1-week follow-up email for a job application.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ""}

Context: It's been 1 week since I applied for this position. I want to check in professionally, reiterate my interest, and provide value.

Generate a JSON response with:
- subject: Email subject line (concise, professional)
- body: Email body (3-4 paragraphs, warm but professional tone)

The email should:
1. Reference the specific position and company
2. Mention it's been about a week since application
3. Reiterate genuine interest in the role
4. Offer to provide additional information
5. Keep tone warm, professional, and not desperate
6. Be concise (under 150 words)
7. End with clear next steps

DO NOT:
- Use overly formal language
- Sound desperate or pushy
- Make demands about timeline
- Be too long`;
    } else if (type === "2w") {
      prompt = `Generate a professional 2-week follow-up email with a value-add approach.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ""}
${jobDescription ? `\nJob Requirements: ${jobDescription.substring(0, 500)}...` : ""}

Context: It's been 2 weeks since I applied. I want to follow up with something valuable - perhaps a relevant article, insight about the industry, or unique perspective on the role.

Generate a JSON response with:
- subject: Email subject line (value-focused, not "checking in")
- body: Email body (4-5 paragraphs with a value proposition)

The email should:
1. Lead with value (industry insight, relevant article, perspective on company challenges)
2. Naturally tie back to the application
3. Demonstrate domain expertise related to ${jobTitle}
4. Show you've been thinking about how to contribute
5. Keep tone consultative, not sales-y
6. Be substantive but concise (under 200 words)
7. Include a soft call-to-action`;
    } else if (type === "thank_you") {
      prompt = `Generate a professional thank-you email after an interview using the STAR method to reinforce key points.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ""}
${tailoredContent ? `\nKey Qualifications: ${tailoredContent.keywords?.slice(0, 8).join(", ")}` : ""}

Context: I just completed an interview. I want to thank them, reinforce 1-2 key points from the conversation using STAR examples, and reiterate fit.

Generate a JSON response with:
- subject: Email subject line (thanking for the interview)
- body: Email body (4-5 paragraphs with STAR reinforcement)

The email should:
1. Thank them for their time and specific aspects of the conversation
2. Reinforce 1-2 key points using mini-STAR examples:
   - Situation: Brief context
   - Task: The challenge  
   - Action: What you did
   - Result: The measurable outcome
3. Connect your background to their specific needs
4. Express enthusiasm for the role and company
5. Mention a specific conversation point to show you were listening
6. Keep tone grateful and professional`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert career coach specializing in professional follow-up communication. Generate personalized, effective follow-up emails that stand out without being pushy.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      subject: result.subject || `Following up on ${jobTitle} position`,
      body: result.body || "",
    };
  } catch (error) {
    throw new Error("Failed to generate follow-up email: " + (error as Error).message);
  }
}

// ============================================
// INTERVIEW QUESTION GENERATOR
// ============================================

export interface InterviewQuestion {
  q: string;
  difficulty: string;
  rationale: string;
  modelAnswer: string;
  starExample?: string;
}

export interface InterviewQuestions {
  questions: InterviewQuestion[];
}

export async function generateInterviewQuestions(
  jobDescription: string,
  tailoredContent?: TailoredResumeContent
): Promise<InterviewQuestions> {
  try {
    const prompt = `Generate comprehensive interview questions for a SQL Server DBA or related database role based on this job description and candidate's tailored resume.

Job Description:
${jobDescription}

${
  tailoredContent
    ? `Candidate's Tailored Resume Content:
Summary: ${tailoredContent.summary || ""}
Experience: ${JSON.stringify(tailoredContent.experience || [], null, 2)}
Skills: ${(tailoredContent.skills || []).join(", ")}
`
    : ""
}

Generate 15-20 interview questions covering:
1. Technical Questions (SQL Server, database administration, performance tuning, HA/DR)
2. Behavioral Questions (using STAR method examples from the candidate's experience)
3. System Design Questions (architecture, scalability, disaster recovery)

For each question, provide:
- q: The interview question
- difficulty: "Easy", "Medium", or "Hard"
- rationale: Why this question is relevant to this specific job posting
- modelAnswer: A strong answer tailored to the candidate's experience (if available) or a general expert-level answer
- starExample: For behavioral questions, provide a STAR (Situation, Task, Action, Result) formatted example using the candidate's actual experience bullets if available

Return a JSON object:
{ "questions": [ { ... } ] }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SQL Server DBA interviewer and career coach. Generate realistic, role-specific interview questions with STAR method examples.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      questions: safeArray<InterviewQuestion>(result.questions),
    };
  } catch (error) {
    throw new Error(
      "Failed to generate interview questions: " + (error as Error).message
    );
  }
}

// ============================================
// ACHIEVEMENT QUANTIFIER
// ============================================

export interface QuantifiedAchievements {
  appliedEdits: string[];
  suggestions: string[];
}

export async function quantifyAchievements(
  resumeContent: string,
  experienceBullets: string[]
): Promise<QuantifiedAchievements> {
  try {
    const prompt = `Analyze these experience bullets and suggest quantified alternatives where possible.

Resume Content Context:
${resumeContent}

Experience Bullets to Quantify:
${experienceBullets.map((bullet, i) => `${i + 1}. ${bullet}`).join("\n")}

For each bullet:
1. If it can be reasonably quantified (add metrics, percentages, time savings, cost reductions), provide an enhanced version.
2. If it's already well-quantified or cannot be quantified without making false claims, mark it as "unchanged".

Return a JSON object:
{
  "appliedEdits": [
    "Enhanced bullet 1 with metrics",
    "Enhanced bullet 2 with percentages"
  ],
  "suggestions": [
    "Could add: Reduced database query time by 40% through index optimization",
    "Could add: Managed 500+ SQL Server instances across production environments"
  ]
}

IMPORTANT: Only suggest quantifications that are reasonable based on the resume content. Do not invent specific numbers that can't be plausibly inferred.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer who specializes in quantifying achievements. Enhance bullets with metrics while maintaining truthfulness.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      appliedEdits: safeArray<string>(result.appliedEdits),
      suggestions: safeArray<string>(result.suggestions),
    };
  } catch (error) {
    throw new Error(
      "Failed to quantify achievements: " + (error as Error).message
    );
  }
}

// ============================================
// INTERVIEW PREP HUB
// ============================================

export interface InterviewPrepQuestion {
  id: string;
  question: string;
  type: "technical" | "behavioral";
  topic: string;
  difficulty: "junior" | "mid" | "senior";
  suggestedAnswer: string;
  star?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export interface InterviewPrepQuestionsResponse {
  questions: InterviewPrepQuestion[];
}

export interface SkillExplanationLevel {
  label: "30s" | "2min" | "deepDive";
  text: string;
}

export interface SkillExplanation {
  skill: string;
  levels: SkillExplanationLevel[];
  pitfalls: string[];
  examplesFromResume?: string[];
}

export interface SkillExplanationsResponse {
  skills: SkillExplanation[];
}

export interface StarStory {
  id: string;
  title: string;
  skill: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  conciseVersion: string;
  extendedVersion: string;
}

export interface StarStoriesResponse {
  stories: StarStory[];
}

/**
 * Generate structured interview prep questions
 */
export async function generateInterviewPrepQuestions(context: {
  jobDescription?: string;
  jobAnalysis?: any;
  skills?: string[];
  skillsContext?: Array<{
    name: string;
    category: string;
    coverage: number;
    jobCount: number;
  }>;
  tailoredContent?: any;
  mode: "job" | "skill" | "general";
}): Promise<InterviewPrepQuestionsResponse> {
  try {
    let contextDescription = "";
    let gapAnalysisInstruction = "";

    if (context.mode === "job" && context.jobDescription) {
      contextDescription = `Job Description:\n${context.jobDescription}\n\n`;
      if (context.jobAnalysis) {
        contextDescription += `Job Title: ${
          context.jobAnalysis.title || "DBA"
        }\n`;
        contextDescription += `Company: ${
          context.jobAnalysis.company || "Target Company"
        }\n`;
        contextDescription += `Key Technologies: ${(context.jobAnalysis.technologies || []).join(
          ", "
        )}\n\n`;
      }

      if (context.tailoredContent) {
        gapAnalysisInstruction = `
CRITICAL - GAP ANALYSIS APPROACH:
Compare the job description requirements with the candidate's resume to identify skill/experience gaps.
Generate questions that probe areas where the candidate may lack explicit experience.

Resume Analysis:
- Candidate Skills: ${(context.tailoredContent.skills || []).join(", ")}
- Recent Experience: ${
          context.tailoredContent.experience &&
          context.tailoredContent.experience.length > 0
            ? context.tailoredContent.experience
                .map((exp: any) => exp.title)
                .join(", ")
            : "N/A"
        }

INSTRUCTIONS:
1. Identify technologies/skills mentioned in the job description but NOT in the candidate's resume.
2. For each gap, create 2-3 probing questions to assess:
   - Whether the candidate has unreported experience in this area
   - Their willingness/ability to learn
   - How they would approach learning this skill
3. Include at least 4-5 "gap-focused" questions that target these missing skills
4. Mark these questions with topic prefix "Gap:" (e.g., "Gap: Azure SQL")
`;
      }
    } else if (context.mode === "skill" && context.skills && context.skills.length > 0) {
      contextDescription = `Focus Skills: ${context.skills.join(", ")}\n\n`;
    } else if (
      context.mode === "general" &&
      context.skillsContext &&
      context.skillsContext.length > 0
    ) {
      contextDescription = "Interview Preparation Based on Your Skills Gap Analysis\n\n";
      contextDescription += `Top In-Demand Skills (from ${
        context.skillsContext[0]?.jobCount || 0
      } job analyses):\n`;
      context.skillsContext.forEach((skill, idx) => {
        contextDescription += `${idx + 1}. ${skill.name} (${skill.category}, ${
          skill.coverage
        }% coverage in your resumes)\n`;
      });
      contextDescription += "\n";
    } else {
      contextDescription = "General SQL Server DBA Interview Preparation\n\n";
    }

    if (context.tailoredContent && !gapAnalysisInstruction) {
      contextDescription += `Candidate Background:\n`;
      contextDescription += `Skills: ${(context.tailoredContent.skills || []).join(", ")}\n`;
      if (context.tailoredContent.experience && context.tailoredContent.experience.length > 0) {
        contextDescription += `Recent Experience: ${
          context.tailoredContent.experience[0].company || "N/A"
        }\n`;
      }
    }

    const prompt = `Generate interview preparation questions for a database-focused role (e.g., SQL Server DBA, Cloud DBA, Data Platform Engineer).

${contextDescription}

${gapAnalysisInstruction}

Generate 12-15 high-quality interview questions covering:
1. Technical (40%): SQL Server administration, performance tuning, HA/DR, security, cloud where relevant.
2. Behavioral (40%): Past experience using STAR method.
3. System Design (20%): Architecture and scalability.
${
  gapAnalysisInstruction
    ? "4. Gap-Focused Questions (targeting skills/technologies not in resume but required by job)."
    : ""
}

For each question provide:
- id: unique identifier (e.g., "tech-1", "behav-1", "gap-1")
- question: The interview question text
- type: "technical" or "behavioral"
- topic: Category (e.g., "HA/DR", "Performance Tuning", "Leadership", "Gap: Azure SQL")
- difficulty: "junior", "mid", or "senior"
- suggestedAnswer: A comprehensive answer with specific SQL Server / DB details
- star: For behavioral questions, include {situation, task, action, result} breakdown

Return JSON:
{ "questions": [ { ... } ] }`;

    console.log(
      "[OPENAI] Generating interview prep questions with mode:",
      context.mode,
      "Gap Analysis:",
      !!gapAnalysisInstruction
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SQL Server DBA interviewer and technical coach. Generate realistic, practical interview questions with detailed answers. When analyzing resume-to-job-description gaps, focus on probing questions that reveal hidden experience or growth potential.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      questions: safeArray<InterviewPrepQuestion>(result.questions),
    };
  } catch (error: any) {
    console.error("[OPENAI] Error generating interview prep questions:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: (error as any).response?.data || (error as any).response,
    });

    if (error.status === 400) {
      throw new Error(`OpenAI API error: Invalid request format. ${error.message}`);
    }

    throw new Error("Failed to generate interview prep questions: " + error.message);
  }
}

/**
 * Generate multi-level skill explanations
 */
export async function generateSkillExplanations(
  skills: string[],
  context?: {
    jobDescription?: string;
    tailoredContent?: any;
  }
): Promise<SkillExplanationsResponse> {
  try {
    const skillsList = skills.slice(0, 8); // Limit to top 8 skills

    let contextInfo = "";
    if (context?.jobDescription) {
      contextInfo += `Job Context:\n${context.jobDescription.substring(0, 500)}...\n\n`;
    }
    if (context?.tailoredContent?.experience) {
      const exp = context.tailoredContent.experience[0];
      if (exp) {
        contextInfo += `Candidate's Recent Experience:\n${
          exp.company || "N/A"
        }: ${(exp.achievements || []).slice(0, 2).join("; ")}\n\n`;
      }
    }

    const prompt = `Generate multi-level explanations for these database/SQL Server skills: ${skillsList.join(
      ", "
    )}

${contextInfo}

For EACH skill, provide three levels of explanation:
1. 30s: Elevator pitch (1-2 sentences) - what it is and why it matters.
2. 2min: Practical explanation (3-4 sentences) - how it's used in real scenarios.
3. deepDive: Technical deep-dive (5-6 sentences) - architecture, best practices, advanced concepts.

Also include:
- pitfalls: Common mistakes or misconceptions (3-5 items).
- examplesFromResume: If the candidate's experience mentions this skill, reference it briefly (optional).

Return JSON:
{
  "skills": [
    {
      "skill": "Always On Availability Groups",
      "levels": [ ... ],
      "pitfalls": [ ... ],
      "examplesFromResume": [ ... ]
    }
  ]
}`;

    console.log("[OPENAI] Generating skill explanations for:", skillsList.join(", "));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a senior SQL Server DBA and technical instructor. Explain complex database concepts at multiple levels of depth with practical examples.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      skills: safeArray<SkillExplanation>(result.skills),
    };
  } catch (error: any) {
    console.error("[OPENAI] Error generating skill explanations:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: (error as any).response?.data || (error as any).response,
    });

    if (error.status === 400) {
      throw new Error(`OpenAI API error: Invalid request format. ${error.message}`);
    }

    throw new Error("Failed to generate skill explanations: " + error.message);
  }
}

/**
 * Generate STAR stories from resume content
 */
export async function generateStarStories(
  resumeContent: any,
  context?: {
    skill?: string;
    jobDescription?: string;
  }
): Promise<StarStoriesResponse> {
  try {
    let experienceBullets: string[] = [];

    if (resumeContent?.experience && Array.isArray(resumeContent.experience)) {
      resumeContent.experience.forEach((exp: any) => {
        if (exp.achievements && Array.isArray(exp.achievements)) {
          experienceBullets.push(...exp.achievements);
        }
      });
    }

    let focusInstruction = "";
    if (context?.skill) {
      focusInstruction = `Focus on stories that demonstrate expertise in: ${context.skill}\n\n`;
    }
    if (context?.jobDescription) {
      focusInstruction += `Align stories with this job description:\n${context.jobDescription.substring(
        0,
        400
      )}...\n\n`;
    }

    const prompt = `Generate STAR (Situation, Task, Action, Result) interview stories from these resume achievements.

${focusInstruction}

Resume Achievements:
${experienceBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Generate 5-7 compelling STAR stories that:
1. Transform resume bullets into interview narratives.
2. Include specific technical details and metrics where reasonable.
3. Demonstrate problem-solving and impact.
4. Cover different skill areas (performance, HA/DR, migration, security, etc.).

For each story provide:
- id: unique identifier
- title: Catchy story title (e.g., "Production Database Recovery Under Pressure")
- skill: Primary skill demonstrated
- situation: What was the context/problem
- task: What needed to be done
- action: Specific steps taken (use "I" statements)
- result: Measurable outcome
- conciseVersion: 30-60 second version for quick answers
- extendedVersion: 2-3 minute detailed version

Return JSON:
{ "stories": [ { ... } ] }`;

    console.log(
      "[OPENAI] Generating STAR stories from",
      experienceBullets.length,
      "achievements"
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interview coach specializing in behavioral interviews for technical roles. Transform resume bullets into compelling STAR stories.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      stories: safeArray<StarStory>(result.stories),
    };
  } catch (error: any) {
    console.error("[OPENAI] Error generating STAR stories:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: (error as any).response?.data || (error as any).response,
    });

    if (error.status === 400) {
      throw new Error(`OpenAI API error: Invalid request format. ${error.message}`);
    }

    throw new Error("Failed to generate STAR stories: " + error.message);
  }
}
