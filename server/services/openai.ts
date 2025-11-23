import Anthropic from "@anthropic-ai/sdk";

const apiKey =
  process.env.ANTHROPIC_API_KEY ||
  process.env.CLAUDE_API_KEY ||
  process.env.CLAUDE_API_KEY_ENV_VAR ||
  "default_key";

// Validate API key configuration
if (!apiKey || apiKey === "default_key") {
  console.error(
    "[CLAUDE] WARNING: Anthropic (Claude) API key is not configured! Set ANTHROPIC_API_KEY environment variable."
  );
} else {
  console.log("[CLAUDE] API key configured (length:", apiKey.length, ")");
}

const anthropic = new Anthropic({
  apiKey,
});

// Central model constant – Sonnet 4.5
const MODEL = "claude-sonnet-4-5";

// Small helper to safely extract text content from Claude response
function getTextFromClaude(response: any): string {
  // Claude Messages API: response.content is an array of content blocks
  // For our use, we expect a single text block
  const first = response?.content?.[0];
  if (!first) return "";
  if (typeof first.text === "string") return first.text;
  if (Array.isArray(first.content) && first.content[0]?.text) {
    return first.content[0].text;
  }
  return "";
}

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
  // NEW: ATS Score Breakdown
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

Respond with ONLY valid JSON, no explanations, in this shape:
{
  "name": "...",
  "title": "...",
  "phone": "...",
  "email": "...",
  "city": "...",
  "state": "...",
  "linkedin": "..."
}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system:
        "You are an expert at extracting contact information from resumes. Only return information that is explicitly stated in the document. Output MUST be valid JSON.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");
    return result as ContactInformation;
  } catch (error) {
    throw new Error(
      "Failed to extract contact information: " + (error as Error).message
    );
  }
}

export async function analyzeJobPosting(
  jobDescription: string
): Promise<JobAnalysisResult> {
  try {
    // Step 1: Quality Gates Check
    const charCount = jobDescription.length;
    const wordCount = jobDescription.split(/\s+/).length;
    const firstChars = jobDescription.substring(0, 500);

    const prompt = `Analyze this job description using JD-first evidence-based methodology:

Job Description (${charCount} characters):
${jobDescription}

Return ONLY valid JSON with this structure:
{
  "title": string,
  "company": string,
  "requirements": string[],
  "keywords": string[],
  "skills": string[],
  "experience": string[],
  "certifications": string[],
  "technologies": string[],
  "roleArchetype": string,
  "qualityGates": {
    "sufficientLength": boolean,
    "roleSpecific": boolean,
    "notGeneric": boolean
  },
  "keywordBuckets": {
    "coreTech": string[],
    "responsibilities": string[],
    "tools": string[],
    "adjacentDataStores": string[],
    "compliance": string[],
    "logistics": string[]
  },
  "synonymMap": { [key: string]: string[] }
}

Focus on SQL Server, database administration, EHR systems, and related technologies.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system:
        "You are an expert implementing JD-first evidence-based tailoring methodology. Perform comprehensive job description analysis with strict quality gates and role archetype classification. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    const keywords = Array.isArray(result.keywords) ? result.keywords : [];
    const requirements = Array.isArray(result.requirements)
      ? result.requirements
      : [];

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
    throw new Error(
      "Failed to analyze job posting: " + (error as Error).message
    );
  }
}

export async function analyzeResumeMatch(
  resumeContent: string,
  jobAnalysis: JobAnalysisResult,
  plainTextResume?: string
): Promise<ResumeAnalysis> {
  try {
    const prompt = `Analyze this resume against the job requirements for a SQL Server DBA position.

Resume Content:
${resumeContent}

${
  plainTextResume
    ? `Plain Text ATS Preview:
${plainTextResume}`
    : ""
}

Job Requirements (JSON):
${JSON.stringify(jobAnalysis, null, 2)}

Respond with ONLY valid JSON shaped as:
{
  "strengths": string[],
  "gaps": string[],
  "matchScore": number,
  "suggestions": string[],
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "sectionScores": {
    "header": number,
    "summary": number,
    "experience": number,
    "skills": number,
    "certifications": number
  },
  "formattingIssues": string[],
  "plainTextPreview": string
}

Focus on SQL Server DBA specific skills, experience, and qualifications.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system:
        "You are an expert SQL Server DBA recruiter and ATS systems analyst. Analyze resume compatibility with job requirements and identify ATS parsing issues. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");
    return result as ResumeAnalysis;
  } catch (error) {
    throw new Error(
      "Failed to analyze resume match: " + (error as Error).message
    );
  }
}

export async function tailorResumeContent(
  resumeContent: string,
  jobAnalysis: JobAnalysisResult,
  resumeAnalysis: ResumeAnalysis,
  contactInfo: ContactInformation
): Promise<TailoredResumeContent> {
  try {
    const prompt = `🚨 CRITICAL HARD RULES - ABSOLUTE REQUIREMENTS (NEVER OVERRIDE):

1. FIXED RESUME HEADLINE: The contact.title field MUST ALWAYS be exactly:
   "Senior SQL Server Database Administrator / SQL Developer"
   - DO NOT use the job posting title as the main headline
   - DO NOT replace this with any other title
   - The job posting title may be mentioned in the Professional Summary text, but NOT as contact.title
   - NO separate "Target: Company - Job Title" banner anywhere

2. 2-PAGE MAXIMUM with smart trimming:
   - The tailored resume MUST fit within 2 pages using normal ATS-safe formatting
   - Keep strongest, recent experience detailed; trim older, repetitive bullets

3. SINGLE SKILLS / CORE COMPETENCIES SECTION ONLY:
   - Use a single skills block backed by the "skills" array (8–10 grouped bullets max).
   - "keywords" is a compact ATS tag list (10–15 phrases max), NOT a second visible skills section.

4. NO "Target" BANNERS or location preferences.

Original Resume Content (WITH DETAILED EXPERIENCE BULLETS):
${resumeContent}

Contact Information (JSON):
${JSON.stringify(contactInfo, null, 2)}

Job Analysis Results (JSON):
${JSON.stringify(jobAnalysis, null, 2)}

Resume Analysis (JSON):
${JSON.stringify(resumeAnalysis, null, 2)}

MANDATORY:
- Reuse and preserve the strong existing bullets (e.g. AWS migrations, AlwaysOn, performance tuning).
- Trim, merge, or shorten older/generic bullets to stay within about 2 pages.
- DO NOT change real employers, titles, or dates.
- Add job-specific micro-edits truthfully (no fake tech).

Respond with ONLY valid JSON in this shape:

{
  "contact": {
    "name": string,
    "title": "Senior SQL Server Database Administrator / SQL Developer",
    "phone": string,
    "email": string,
    "city": string,
    "state": string,
    "linkedin": string
  },
  "summary": string,
  "experience": [
    {
      "title": string,
      "company": string,
      "duration": string,
      "achievements": string[]
    }
  ],
  "skills": string[],
  "keywords": string[],
  "certifications": string[],
  "professionalDevelopment": string[],
  "education": string[],
  "improvements": string[],
  "atsScore": number,
  "coreScore": number,
  "scoreBreakdown": {
    "coreTech": { "earned": number, "possible": number, "evidence": string[] },
    "responsibilities": { "earned": number, "possible": number, "evidence": string[] },
    "tools": { "earned": number, "possible": number, "evidence": string[] },
    "adjacentDataStores": { "earned": number, "possible": number, "evidence": string[] },
    "compliance": { "earned": number, "possible": number, "evidence": string[] },
    "logistics": { "earned": number, "possible": number, "evidence": string[] }
  },
  "coverageReport": {
    "matchedKeywords": string[],
    "missingKeywords": string[],
    "truthfulnessLevel": { [keyword: string]: "hands-on" | "familiar" | "omitted" }
  },
  "appliedMicroEdits": string[],
  "suggestedMicroEdits": string[]
}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      system:
        "You are an expert resume writer specializing in SQL Server DBA positions. Create ATS-optimized, compelling resume content that respects strict length and structure rules. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    // Ensure backward compatibility for arrays
    const skills = Array.isArray(result.skills) ? result.skills : [];
    const keywords = Array.isArray(result.keywords) ? result.keywords : [];
    const certifications = Array.isArray(result.certifications)
      ? result.certifications
      : [];
    const improvements = Array.isArray(result.improvements)
      ? result.improvements
      : [];
    const experience = Array.isArray(result.experience)
      ? result.experience
      : [];
    const professionalDevelopment = Array.isArray(
      result.professionalDevelopment
    )
      ? result.professionalDevelopment
      : [];

    const FIXED_HEADLINE = "Senior SQL Server Database Administrator / SQL Developer";

    // SAFETY NET: Enforce fixed headline
    if (result.contact && result.contact.title !== FIXED_HEADLINE) {
      console.warn(
        `Correcting contact.title from "${result.contact.title}" to fixed headline`
      );
      result.contact.title = FIXED_HEADLINE;
    }

    // SAFETY NET: Remove any "Target:" lines from summary
    if (result.summary && typeof result.summary === "string") {
      const summaryLines = result.summary.split("\n");
      const filteredLines = summaryLines.filter(
        (line: string) =>
          !line.trim().toLowerCase().startsWith("target:") &&
          !line.trim().toLowerCase().startsWith("target role:") &&
          !line.trim().toLowerCase().startsWith("target company:")
      );
      if (filteredLines.length !== summaryLines.length) {
        console.warn('Removed "Target:" lines from summary');
        result.summary = filteredLines.join("\n").trim();
      }
    }

    return {
      ...result,
      skills,
      keywords,
      certifications,
      improvements,
      experience,
      professionalDevelopment,
      coreScore: result.coreScore || result.atsScore || 85,
      scoreBreakdown: result.scoreBreakdown || {},
      coverageReport:
        result.coverageReport || {
          matchedKeywords: [],
          missingKeywords: [],
          truthfulnessLevel: {},
        },
      appliedMicroEdits: result.appliedMicroEdits || [],
      suggestedMicroEdits: result.suggestedMicroEdits || [],
    } as TailoredResumeContent;
  } catch (error) {
    throw new Error(
      "Failed to tailor resume content: " + (error as Error).message
    );
  }
}

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

Respond with ONLY valid JSON:
{
  "subject": string,
  "body": string
}

The email should:
- 3-4 short paragraphs
- Warm but professional
- Under 150 words
- Not pushy or desperate.`;
    } else if (type === "2w") {
      prompt = `Generate a professional 2-week follow-up email with a value-add approach.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ""}
${
  jobDescription
    ? `Job Requirements (excerpt): ${jobDescription.substring(0, 500)}...`
    : ""
}

Context: It's been 2 weeks since I applied. I want to follow up with something valuable (insight, article, or relevant observation).

Respond with ONLY valid JSON:
{
  "subject": string,
  "body": string
}

The email should be under 200 words, lead with value, and have a soft call-to-action.`;
    } else if (type === "thank_you") {
      prompt = `Generate a professional thank-you email after an interview using 1–2 mini-STAR examples.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ""}
${
  tailoredContent
    ? `Key Qualifications: ${(tailoredContent.keywords || [])
        .slice(0, 8)
        .join(", ")}`
    : ""
}

Respond with ONLY valid JSON:
{
  "subject": string,
  "body": string
}

The email should:
- Thank them
- Reinforce 1–2 key points with Situation/Task/Action/Result mini-stories
- Express enthusiasm
- Be concise and professional.`;
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 900,
      system:
        "You are an expert career coach specializing in professional follow-up communication. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    return {
      subject: result.subject || `Following up on ${jobTitle} position`,
      body: result.body || "",
    };
  } catch (error) {
    throw new Error(
      "Failed to generate follow-up email: " + (error as Error).message
    );
  }
}

// ============================================
// NEW FEATURE 1: Interview Question Generator
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
    const prompt = `Generate comprehensive interview questions for a SQL Server DBA position based on this job description and candidate's tailored resume.

Job Description:
${jobDescription}

${
  tailoredContent
    ? `Candidate's Tailored Resume Content:
Summary: ${tailoredContent.summary || ""}
Experience: ${JSON.stringify(tailoredContent.experience || [], null, 2)}
Skills: ${(tailoredContent.skills || []).join(", ")}`
    : ""
}

Respond with ONLY valid JSON:
{
  "questions": [
    {
      "q": string,
      "difficulty": "Easy" | "Medium" | "Hard",
      "rationale": string,
      "modelAnswer": string,
      "starExample"?: string
    }
  ]
}

Include 15–20 questions:
- Technical (SQL Server administration, performance tuning, HA/DR)
- Behavioral (with STAR context)
- System Design (architecture, scalability, DR).`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2800,
      system:
        "You are an expert SQL Server DBA interviewer and career coach. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    return {
      questions: Array.isArray(result.questions) ? result.questions : [],
    };
  } catch (error) {
    throw new Error(
      "Failed to generate interview questions: " + (error as Error).message
    );
  }
}

// ============================================
// NEW FEATURE 4: Achievement Quantifier
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
${experienceBullets
  .map((bullet, i) => `${i + 1}. ${bullet}`)
  .join("\n")}

For each bullet:
1. If it can be quantified (add metrics, percentages, time savings, cost reductions), provide an enhanced version.
2. If it's already well-quantified or cannot be quantified without making false claims, mark it as "unchanged".

Respond with ONLY valid JSON:
{
  "appliedEdits": string[],
  "suggestions": string[]
}

IMPORTANT: Only suggest quantifications that are reasonable based on the resume content. Do not invent specific numbers that can't be verified.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1800,
      system:
        "You are an expert resume writer who specializes in quantifying achievements. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    return {
      appliedEdits: Array.isArray(result.appliedEdits)
        ? result.appliedEdits
        : [],
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions
        : [],
    };
  } catch (error) {
    throw new Error(
      "Failed to quantify achievements: " + (error as Error).message
    );
  }
}

// ============================================
// INTERVIEW PREP HUB FEATURES
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
 * Generate structured interview questions and answers
 */
export async function generateInterviewPrepQuestions(
  context: {
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
  }
): Promise<InterviewPrepQuestionsResponse> {
  try {
    let contextDescription = "";
    let gapAnalysisInstruction = "";

    if (context.mode === "job" && context.jobDescription) {
      contextDescription = `Job Description:
${context.jobDescription}

`;
      if (context.jobAnalysis) {
        contextDescription += `Job Title: ${
          context.jobAnalysis.title || "DBA"
        }
Company: ${context.jobAnalysis.company || "Target Company"}
Key Technologies: ${(context.jobAnalysis.technologies || []).join(", ")}

`;
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
2. For each gap, create 2–3 probing questions to assess hidden experience and learning approach.
3. Include at least 4–5 gap-focused questions.
4. Mark these questions with topic prefix "Gap: ...".
`;
      }
    } else if (context.mode === "skill" && context.skills && context.skills.length > 0) {
      contextDescription = `Focus Skills: ${context.skills.join(", ")}

`;
    } else if (
      context.mode === "general" &&
      context.skillsContext &&
      context.skillsContext.length > 0
    ) {
      contextDescription = "Interview Preparation Based on Your Skills Gap Analysis\n\n";
      contextDescription += `Top In-Demand Skills (from ${
        context.skillsContext[0]?.jobCount || 0
      } job analyses):
`;
      context.skillsContext.forEach((skill, idx) => {
        contextDescription += `${idx + 1}. ${skill.name} (${skill.category}, ${
          skill.coverage
        }% coverage)\n`;
      });
      contextDescription += "\n";
    } else {
      contextDescription = "General SQL Server DBA Interview Preparation\n\n";
    }

    if (context.tailoredContent && !gapAnalysisInstruction) {
      contextDescription += `Candidate Background:
Skills: ${(context.tailoredContent.skills || []).join(", ")}
${
  context.tailoredContent.experience &&
  context.tailoredContent.experience.length > 0
    ? `Recent Experience: ${context.tailoredContent.experience[0].company}`
    : ""
}

`;
    }

    const prompt = `Generate interview preparation questions for a SQL Server DBA position.

${contextDescription}

${gapAnalysisInstruction}

Respond with ONLY valid JSON in this shape:
{
  "questions": [
    {
      "id": string,
      "question": string,
      "type": "technical" | "behavioral",
      "topic": string,
      "difficulty": "junior" | "mid" | "senior",
      "suggestedAnswer": string,
      "star": {
        "situation": string,
        "task": string,
        "action": string,
        "result": string
      } | null
    }
  ]
}

Generate 12–15 high-quality questions:
1. Technical (SQL Server admin, performance tuning, HA/DR, security)
2. Behavioral (with STAR breakdown)
3. System Design (architecture, scalability)
${
  gapAnalysisInstruction
    ? "4. Gap-focused questions targeting missing skills."
    : ""
}
${
  context.skillsContext && context.skillsContext.length > 0
    ? "Focus especially on skills with lower coverage percentages as they represent gaps."
    : ""
}`;

    console.log(
      "[CLAUDE] Generating interview prep questions with mode:",
      context.mode,
      "Gap Analysis:",
      !!gapAnalysisInstruction
    );

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2800,
      system:
        "You are an expert SQL Server DBA interviewer and technical coach. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    return {
      questions: Array.isArray(result.questions) ? result.questions : [],
    };
  } catch (error: any) {
    console.error("[CLAUDE] Error generating interview prep questions:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });

    if (error.status === 400) {
      throw new Error(
        `Anthropic API error: Invalid request format. ${error.message}`
      );
    }

    throw new Error(
      "Failed to generate interview prep questions: " + error.message
    );
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
    const skillsList = skills.slice(0, 8);

    let contextInfo = "";
    if (context?.jobDescription) {
      contextInfo += `Job Context:
${context.jobDescription.substring(0, 500)}...

`;
    }
    if (context?.tailoredContent?.experience) {
      const exp = context.tailoredContent.experience[0];
      if (exp) {
        contextInfo += `Candidate's Recent Experience:
${exp.company || "N/A"}: ${(exp.achievements || [])
          .slice(0, 2)
          .join("; ")}

`;
      }
    }

    const prompt = `Generate multi-level explanations for these SQL Server DBA skills: ${skillsList.join(
      ", "
    )}

${contextInfo}

For EACH skill, respond in JSON with:
{
  "skills": [
    {
      "skill": string,
      "levels": [
        { "label": "30s", "text": string },
        { "label": "2min", "text": string },
        { "label": "deepDive", "text": string }
      ],
      "pitfalls": string[],
      "examplesFromResume": string[]
    }
  ]
}

- 30s: elevator pitch (1–2 sentences)
- 2min: practical explanation (3–4 sentences)
- deepDive: advanced/architectural view (5–6 sentences)
- pitfalls: 3–5 common mistakes
- examplesFromResume: optional references to candidate’s experience.`;

    console.log("[CLAUDE] Generating skill explanations for:", skillsList.join(", "));

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2800,
      system:
        "You are a senior SQL Server DBA and technical instructor. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    return {
      skills: Array.isArray(result.skills) ? result.skills : [],
    };
  } catch (error: any) {
    console.error("[CLAUDE] Error generating skill explanations:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });

    if (error.status === 400) {
      throw new Error(
        `Anthropic API error: Invalid request format. ${error.message}`
      );
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
      focusInstruction = `Focus on stories that demonstrate expertise in: ${context.skill}

`;
    }
    if (context?.jobDescription) {
      focusInstruction += `Align stories with this job description:
${context.jobDescription.substring(0, 400)}...

`;
    }

    const prompt = `Generate STAR (Situation, Task, Action, Result) interview stories from these resume achievements.

${focusInstruction}

Resume Achievements:
${experienceBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Respond with ONLY valid JSON:
{
  "stories": [
    {
      "id": string,
      "title": string,
      "skill": string,
      "situation": string,
      "task": string,
      "action": string,
      "result": string,
      "conciseVersion": string,
      "extendedVersion": string
    }
  ]
}

Generate 5–7 compelling stories across different areas (performance, HA/DR, migration, security, etc.).`;

    console.log(
      "[CLAUDE] Generating STAR stories from",
      experienceBullets.length,
      "achievements"
    );

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2800,
      system:
        "You are an expert interview coach specializing in behavioral interviews for technical roles. Output MUST be valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = getTextFromClaude(response);
    const result = JSON.parse(raw || "{}");

    return {
      stories: Array.isArray(result.stories) ? result.stories : [],
    };
  } catch (error: any) {
    console.error("[CLAUDE] Error generating STAR stories:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });

    if (error.status === 400) {
      throw new Error(
        `Anthropic API error: Invalid request format. ${error.message}`
      );
    }

    throw new Error("Failed to generate STAR stories: " + error.message);
  }
}
