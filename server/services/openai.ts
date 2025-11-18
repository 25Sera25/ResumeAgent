import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key";

// Validate API key configuration
if (!apiKey || apiKey === "default_key") {
  console.error('[OPENAI] WARNING: OpenAI API key is not configured! Set OPENAI_API_KEY environment variable.');
} else {
  console.log('[OPENAI] API key configured (length:', apiKey.length, ')');
}

const openai = new OpenAI({ 
  apiKey
});

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
    truthfulnessLevel: Record<string, 'hands-on' | 'familiar' | 'omitted'>;
  };
  appliedMicroEdits: string[];
  suggestedMicroEdits: string[];
}

export async function extractContactInformation(resumeContent: string): Promise<ContactInformation> {
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
- name: The actual full name of the person (e.g., "Ayele Tesfaye", "Sarah Johnson") - NEVER use "Professional Name" or generic names
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
          content: "You are an expert at extracting contact information from resumes. Only return information that is explicitly stated in the document."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as ContactInformation;
  } catch (error) {
    throw new Error("Failed to extract contact information: " + (error as Error).message);
  }
}

export async function analyzeJobPosting(jobDescription: string): Promise<JobAnalysisResult> {
  try {
    // Step 1: Quality Gates Check
    const charCount = jobDescription.length;
    const wordCount = jobDescription.split(/\s+/).length;
    const firstChars = jobDescription.substring(0, 500);

    const prompt = `Analyze this job description using JD-first evidence-based methodology:

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

Focus on SQL Server, database administration, EHR systems, and related technologies.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert implementing JD-first evidence-based tailoring methodology. Perform comprehensive job description analysis with strict quality gates and role archetype classification. Never proceed with weak or generic content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure backward compatibility - keywords must be an array
    const keywords = Array.isArray(result.keywords) ? result.keywords : [];
    const requirements = Array.isArray(result.requirements) ? result.requirements : [];
    
    // Add computed fields and ensure compatibility
    return {
      ...result,
      keywords,
      requirements,
      charCount,
      wordCount: wordCount.toString(),
      firstChars,
      // Provide defaults for enhanced fields if missing
      qualityGates: result.qualityGates || {
        sufficientLength: charCount >= 3000,
        roleSpecific: true,
        notGeneric: true
      },
      keywordBuckets: result.keywordBuckets || {
        coreTech: [],
        responsibilities: [],
        tools: [],
        adjacentDataStores: [],
        compliance: [],
        logistics: []
      },
      synonymMap: result.synonymMap || {}
    } as JobAnalysisResult;
  } catch (error) {
    throw new Error("Failed to analyze job posting: " + (error as Error).message);
  }
}

export async function analyzeResumeMatch(resumeContent: string, jobAnalysis: JobAnalysisResult, plainTextResume?: string): Promise<ResumeAnalysis> {
  try {
    const prompt = `Analyze this resume against the job requirements for a SQL Server DBA position.

Resume Content:
${resumeContent}

${plainTextResume ? `Plain Text ATS Preview:
${plainTextResume}
` : ''}

Job Requirements:
${JSON.stringify(jobAnalysis, null, 2)}

Please respond with a JSON object containing:
- strengths: Array of resume strengths that match the job
- gaps: Array of missing skills/experience from the resume
- matchScore: Percentage match (0-100)
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
- plainTextPreview: Simplified text version showing how ATS systems will parse the resume

Focus on SQL Server DBA specific skills, experience, and qualifications.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SQL Server DBA recruiter and ATS systems analyst. Analyze resume compatibility with job requirements and identify ATS parsing issues."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as ResumeAnalysis;
  } catch (error) {
    throw new Error("Failed to analyze resume match: " + (error as Error).message);
  }
}

export async function tailorResumeContent(resumeContent: string, jobAnalysis: JobAnalysisResult, resumeAnalysis: ResumeAnalysis, contactInfo: ContactInformation): Promise<TailoredResumeContent> {
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
   - When content would exceed 2 pages, apply smart trimming:
     KEEP (fully detailed):
     - Most recent 2-3 roles with full, strong, quantified bullets
     - Strongest bullets about:
       * Performance tuning (indexes, Query Store, DMVs, Extended Events)
       * HA/DR (AlwaysOn Availability Groups, Failover Clustering, log shipping, mirroring)
       * Backups/restore (Ola Hallengren scripts, RPO/RTO)
       * Cloud (Azure/AWS, migrations, RDS, Azure SQL/MI)
       * Production support and on-call incident response
     TRIM/REMOVE first:
     - Older roles beyond the most recent 2-3 positions
     - Repetitive bullets (generic "managed SQL Server databases" or "collaborated with developers")
     - Generic responsibilities that don't add new information
   - NEVER invent or alter titles, dates, or employers when trimming—only remove or condense bullets

3. NO "Target: Company - Job Title" BANNER:
   - Do NOT include any header line like "Target: Company X - Job Title Y"
   - Do NOT include variants like "Target role: ..." or "Target company: ..."
   - The resume should be a standard professional resume suitable for any ATS

CRITICAL: PRESERVE AND ENHANCE EXISTING EXPERIENCE BULLETS

Original Resume Content (WITH DETAILED EXPERIENCE BULLETS):
${resumeContent}

Contact Information:
${JSON.stringify(contactInfo, null, 2)}

Job Analysis Results:
${JSON.stringify(jobAnalysis, null, 2)}

Resume Analysis:
${JSON.stringify(resumeAnalysis, null, 2)}

MANDATORY INSTRUCTION: The original resume contains detailed experience sections with 6-8 bullet points per job, including quantified achievements like:
- "Architected and managed high-availability SQL Server environments (2016–2022) for critical healthcare applications"
- "Led migration of on-premises databases to AWS, utilizing AWS RDS and DMS, enhancing scalability and reducing infrastructure costs"
- "Implemented AlwaysOn Availability Groups and Failover Clustering, achieving seamless failover capabilities"
- "Optimized database performance using Extended Events, Query Store, and DMVs, improving query execution times"

YOU MUST EXTRACT THESE EXISTING BULLETS AND INCLUDE THEM IN THE EXPERIENCE SECTION. DO NOT CREATE EMPTY JOB ENTRIES.

STEP 5 - TRUTHFULNESS LADDER:
Apply strict truthfulness when adding JD keywords:
- HANDS-ON experience → Include in Experience bullets with metrics
- FAMILIAR WITH / exposure → Include in Skills with "Familiar with" phrasing  
- NOT TRUE → Do not include (no inflation)

STEP 6 - REQUIRED COVERAGE:
Ensure resume mentions (or marks as familiar) every bucket the JD stresses:
- Operational duties (on-call, self-serve tools, documentation, monitoring, backups, audits)
- Environment specifics (Windows/Linux, virtualization, remote/location, travel/onsite)
- Secondary data stores (MySQL/PostgreSQL if JD prefers - mark as familiar if light)

STEP 7 - SCORING RUBRIC (100 points total, show your math):
- Core Tech & Platforms (35 pts) - versions/stacks, OS, HA/DR
- Responsibilities (25 pts) - operational work matching JD
- Tools/Automation (15 pts) - PowerShell, Git, schedulers, observability
- Adjacent Data Stores (10 pts) - MySQL/Postgres/EHR systems  
- Compliance/Industry (10 pts) - HIPAA, audits, security
- Logistics & Culture (5 pts) - travel, remote, communication

Return detailed score breakdown with evidence sentences.

STEP 8 - SAFETY CHECKS:
- If JD is EHR-admin but tailored as DBA, redo with EHR duties
- Verify role archetype alignment
- Ensure truthful content only

STEP 9 - AUTOMATICALLY APPLY MICRO-EDITS:
Identify specific requirements from the job posting and AUTOMATICALLY ADD corresponding bullet points to enhance the tailored content. Do NOT just list them as suggestions - INTEGRATE them directly into the experience section where appropriate:

For job-specific requirements, ADD these types of enhanced bullets:
- Oracle/Multi-DB roles: "Administered Oracle, SQL Server, and PostgreSQL environments with 99.9% uptime across distributed enterprise systems"
- ServiceNow integration: "Utilized ServiceNow for incident management, change control, and SLA adherence in enterprise environments"
- Technical Leadership: "Led cross-functional technical teams in critical incident response and database architecture decisions"
- Project Management: "Collaborated with Program Managers and Engineering teams on mission-critical database infrastructure projects"
- Performance Optimization: "Implemented advanced performance monitoring, query optimization, and capacity planning for high-volume database systems"
- Documentation & Process: "Established comprehensive operational procedures, runbooks, and database configuration documentation"
- Compliance & Security: "Ensured HIPAA/SOX compliance through audit trail implementation and data encryption strategies"
- Automation: "Developed PowerShell automation scripts for routine maintenance, health checks, and deployment processes"
- Cloud Migration: "Architected and executed cloud migration strategies using AWS RDS, Azure SQL, and multi-cloud deployment models"
- Disaster Recovery: "Designed and tested comprehensive disaster recovery procedures with RTO/RPO targets under 15 minutes"

CRITICAL: These are not suggestions - AUTOMATICALLY incorporate relevant bullets based on the specific job requirements into the experience achievements arrays.

STEP 10 - GENERATE OPTIMIZED CONTENT:

DYNAMIC JOB ANALYSIS:
Based on the job posting analysis, identify and address the specific requirements, technologies, and company context from THIS job posting. Do not use generic requirements from other jobs.

SPECIFIC JOB REQUIREMENTS TO ADDRESS:
Extract the actual requirements from the job analysis provided and tailor accordingly.

Please respond with a JSON object containing:
- contact: Use the REAL contact information from the provided contactInfo object - never use placeholders like "Professional Name". Use the actual name, email, phone, etc. from the contactInfo. For the title field, use EXACTLY: "Senior SQL Server Database Administrator / SQL Developer" (the FIXED HEADLINE - do NOT use the job posting title here).
- summary: Professional summary that MATCHES THE EXACT JOB LEVEL and requirements from the job posting. Mention the target job title from the posting within the summary text if appropriate. For modern data platform roles, lead with cloud technologies (Azure SQL, Snowflake, multi-cloud). For traditional DBA roles, lead with SQL Server. Emphasize the specific technologies and responsibilities mentioned in the job posting. DO NOT include location preferences or willingness to work in specific locations like "Open to a fully on-site role in Camden, NJ"
- experience: Array of experience objects with this MANDATORY format:
  [
    {
      "title": "Sr. Database Administrator",
      "company": "UnitedHealth", 
      "duration": "October 2020 - Present",
      "achievements": [
        "Architected and managed high-availability SQL Server environments (2016–2022) for critical healthcare applications, ensuring optimal performance and uptime",
        "Led migration of on-premises databases to AWS, utilizing AWS RDS and DMS, enhancing scalability and reducing infrastructure costs", 
        "Implemented AlwaysOn Availability Groups and Failover Clustering, achieving seamless failover capabilities and minimizing downtime",
        "Collaborated on the migration of on-premises systems to AWS Cloud, leveraging RDS, DMS, and CloudFormation templates",
        "Optimized database performance using Extended Events, Query Store, and DMVs, improving query execution times",
        "Collaborated with InfoSec to deploy TDE, Always Encrypted, Data Masking, and Row-Level Security for HIPAA compliance"
      ]
    }
  ]
  CRITICAL: Use "title", "company", "duration", and "achievements" fields. Extract and preserve ALL existing bullet points from the original resume.
- skills: Include EXACT job posting terms and requirements found in the job analysis, such as specific technologies, methodologies, and qualifications mentioned
- keywords: Focus on operational terms from job posting
- certifications: Array of certification strings from original resume (e.g., ["Microsoft Certified: Azure Database Administrator Associate", "Oracle Database 12c Administrator Certified Professional"]). Return ONLY certifications that exist in the original resume content - do not add or invent any certifications.
- professionalDevelopment: Array of professional development/training items from original resume (e.g., ["AWS Immersion Days – Data Lab", "Security Engineering on AWS"]). Include ONLY if present in original resume.
- education: Array of education items. Always include "Bachelor of Science - University of Gondar" as the primary education entry.
- improvements: COMPLETE LIST of ALL specific tailoring changes applied for this job posting (include every enhancement made - keywords added, bullets enhanced, technologies emphasized, role alignment changes, etc. - show comprehensive list, not highlights)
- atsScore: Target 90-95% based on operational focus alignment - include ALL specific technologies mentioned in job posting
- coreScore: Enhanced score for role-specific operational duties
- scoreBreakdown: Detailed 100-point breakdown with evidence for each category
- coverageReport: Analysis of keyword coverage vs job requirements
- appliedMicroEdits: List of micro-edits that were AUTOMATICALLY APPLIED and integrated into the content (not suggestions, but actual changes made)

CRITICAL ALIGNMENT REQUIREMENTS FOR 90%+ ATS SCORES:

**ROLE TARGETING:**
1. **FIXED HEADLINE REQUIREMENT** - The contact.title field MUST be "Senior SQL Server Database Administrator / SQL Developer" (per hard rules above). Mention the job posting title in the Professional Summary if needed for alignment.
2. **MATCH PRIMARY TECHNOLOGIES** - Prioritize the databases/technologies mentioned first in job requirements
3. **MATCH COMPANY CONTEXT** - Align with company industry and scale (multinational, financial services, etc.)
4. **MATCH ROLE FOCUS** - Traditional DBA vs Cloud Data Engineer vs Data Platform Engineer vs Multi-Cloud DBA

**TECHNOLOGY EMPHASIS:**
5. **CLOUD-FIRST POSITIONING** - If Azure/AWS/multi-cloud mentioned, lead with cloud technologies over on-premises
6. **MODERN DATA STACK** - For data platform roles, emphasize Snowflake, dbt, Airflow, FiveTran over traditional tools
7. **AZURE SQL SPECIFICS** - Include "elastic pools", "linked servers", "failover groups", "geo-replication" for Azure roles
8. **DATA GOVERNANCE** - Include "data catalog", "data quality metrics", "environment separation" for enterprise roles
9. **MONITORING & OBSERVABILITY** - Include specific tools mentioned (Grafana, SQL Diagnostic Manager, etc.)
10. **PROGRAMMING INTEGRATION** - Include Python, data quality processes if mentioned

**TRADITIONAL DBA REQUIREMENTS:**
11. **BACKUP SOLUTIONS** - Name specific backup tools mentioned (Veritas NetBackup, Commvault, etc.)
12. **VIRTUALIZATION** - Include VMware, Hyper-V explicitly if mentioned in requirements
13. **STORAGE TECHNOLOGIES** - If SAN, iSCSI, NetApp are mentioned, include explicit references
14. **OPERATIONAL PROCESSES** - Include Change Control, CAB, runbooks, configuration documentation if mentioned

TRUTHFULNESS REQUIREMENTS FOR ADDITIONAL TECHNOLOGIES:
- If candidate has MySQL/PostgreSQL experience: Include in experience bullets
- If candidate is familiar but not hands-on: Use varied terms like "Experience with", "Working knowledge of", "Exposure to", "Background in" instead of repeatedly using "familiar"
- If no experience: Add as "Exposure to MySQL, PostgreSQL environments" (light exposure only)

WORD VARIETY FOR EXPERIENCE LEVELS:
Instead of repeatedly using "familiar", use these alternatives:
- "Experience with" - for technologies you've worked with
- "Working knowledge of" - for tools you understand and can use
- "Background in" - for areas you have foundational knowledge
- "Exposure to" - for technologies you've encountered
- "Proficient in" - for strong skills
- "Hands-on experience with" - for practical application

MANDATORY 90%+ ATS KEYWORD INCLUSION:
For the specific job posting provided, you MUST include these technologies if mentioned in the JD:

**Traditional DBA Technologies:**
- **Veritas NetBackup**: Add "Veritas NetBackup" explicitly in skills/experience (even as "familiar" if needed)
- **SAN over iSCSI**: Include "SAN over iSCSI" or "Storage Area Network (SAN)" explicitly
- **VMware**: Add "VMware" explicitly in skills section if mentioned in JD requirements
- **SSRS**: Include "SSRS" (SQL Server Reporting Services) prominently - candidate has actual SSRS experience from resume, emphasize it
- **PostgreSQL**: Add "PostgreSQL" in additional databases section
- **Change Control**: Include Change Control, CAB (Change Advisory Board), runbooks, configuration documentation
- **Enterprise/ERP Systems**: If mentioned, include experience with enterprise applications
- **Manufacturing Systems**: Include if mentioned in job requirements

**Modern Data Platform Technologies (CRITICAL FOR CLOUD/DATA ROLES):**
- **Azure SQL Database**: If mentioned, include "elastic pools", "linked servers", "failover groups", "geo-replication"
- **Snowflake**: Include explicitly if mentioned in JD requirements
- **Modern Data Stack**: Include dbt, Airflow, FiveTran if mentioned
- **Data Quality & Governance**: Include "data catalog", "data quality metrics", "environment separation", "data lineage"
- **Monitoring Tools**: Include Grafana, specific monitoring tools mentioned
- **Programming Languages**: Include Python (pandas, data quality) if mentioned
- **Multi-Cloud**: Emphasize "multi-cloud", "cross-cloud" if role requires it
- **Data Pipelines**: Include "automated data pipelines", "ELT/ETL", "fit-for-purpose data pipelines"

These keywords are critical for achieving 90%+ ATS scores and must be present in the final resume.

CRITICAL REQUIREMENTS:
1. **Avoid overusing "familiar"** - use variety with terms like "Experience with", "Working knowledge of", "Background in", "Exposure to", "Proficient in", "Hands-on experience with"
2. **FIXED HEADLINE** - Use exactly "Senior SQL Server Database Administrator / SQL Developer" in the contact.title field (per hard rules). Mention the job posting title in the Professional Summary for alignment.
3. **Technology prioritization** - For cloud/data platform roles, emphasize modern stack (Snowflake, dbt, Airflow, Azure SQL specifics) over traditional SQL Server
4. **Industry alignment** - Adjust language for company context (financial services, healthcare, enterprise, etc.)
5. **Role evolution** - Traditional DBA → Cloud DBA → Data Platform Engineer → Multi-Cloud Data Engineer based on job requirements`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert resume writer specializing in SQL Server DBA positions. Create ATS-optimized, compelling resume content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure backward compatibility for arrays
    const skills = Array.isArray(result.skills) ? result.skills : [];
    const keywords = Array.isArray(result.keywords) ? result.keywords : [];
    const certifications = Array.isArray(result.certifications) ? result.certifications : [];
    const improvements = Array.isArray(result.improvements) ? result.improvements : [];
    const experience = Array.isArray(result.experience) ? result.experience : [];
    const professionalDevelopment = Array.isArray(result.professionalDevelopment) ? result.professionalDevelopment : [];
    
    // SAFETY NET: Enforce hard rules
    const FIXED_HEADLINE = "Senior SQL Server Database Administrator / SQL Developer";
    
    // Ensure contact title is the fixed headline
    if (result.contact && result.contact.title !== FIXED_HEADLINE) {
      console.warn(`Correcting contact.title from "${result.contact.title}" to fixed headline`);
      result.contact.title = FIXED_HEADLINE;
    }
    
    // Remove any "Target:" lines from summary if present
    if (result.summary && typeof result.summary === 'string') {
      const summaryLines = result.summary.split('\n');
      const filteredLines = summaryLines.filter((line: string) => 
        !line.trim().toLowerCase().startsWith('target:') &&
        !line.trim().toLowerCase().startsWith('target role:') &&
        !line.trim().toLowerCase().startsWith('target company:')
      );
      if (filteredLines.length !== summaryLines.length) {
        console.warn('Removed "Target:" lines from summary');
        result.summary = filteredLines.join('\n').trim();
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
      // Provide defaults for enhanced fields if missing
      coreScore: result.coreScore || result.atsScore || 85,
      scoreBreakdown: result.scoreBreakdown || {},
      coverageReport: result.coverageReport || {
        matchedKeywords: [],
        missingKeywords: [],
        truthfulnessLevel: {}
      },
      appliedMicroEdits: result.appliedMicroEdits || [],
      suggestedMicroEdits: result.suggestedMicroEdits || []
    } as TailoredResumeContent;
  } catch (error) {
    throw new Error("Failed to tailor resume content: " + (error as Error).message);
  }
}

export interface FollowUpEmailTemplate {
  subject: string;
  body: string;
}

export async function generateFollowUpEmail(
  type: '1w' | '2w' | 'thank_you',
  jobTitle: string,
  company: string,
  contactInfo?: ContactInformation,
  jobDescription?: string,
  tailoredContent?: TailoredResumeContent
): Promise<FollowUpEmailTemplate> {
  try {
    let prompt = '';
    
    if (type === '1w') {
      prompt = `Generate a professional 1-week follow-up email for a job application.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ''}

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

    } else if (type === '2w') {
      prompt = `Generate a professional 2-week follow-up email with a value-add approach.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ''}
${jobDescription ? `\nJob Requirements: ${jobDescription.substring(0, 500)}...` : ''}

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
7. Include a soft call-to-action

Example value-adds: industry trend, tool recommendation, process improvement idea, relevant case study`;

    } else if (type === 'thank_you') {
      prompt = `Generate a professional thank-you email after an interview using the STAR method to reinforce key points.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
${contactInfo?.name ? `- Applicant Name: ${contactInfo.name}` : ''}
${tailoredContent ? `\nKey Qualifications: ${tailoredContent.keywords?.slice(0, 8).join(', ')}` : ''}

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
6. Keep tone grateful and professional
7. Send within 24 hours of interview

Example STAR: "When you mentioned the need for high-availability database solutions, it reminded me of when I implemented AlwaysOn Availability Groups at [Company], reducing downtime by 60% and achieving 99.99% uptime."`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert career coach specializing in professional follow-up communication. Generate personalized, effective follow-up emails that stand out without being pushy."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      subject: result.subject || `Following up on ${jobTitle} position`,
      body: result.body || ''
    };
  } catch (error) {
    throw new Error("Failed to generate follow-up email: " + (error as Error).message);
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

${tailoredContent ? `Candidate's Tailored Resume Content:
Summary: ${tailoredContent.summary || ''}
Experience: ${JSON.stringify(tailoredContent.experience || [], null, 2)}
Skills: ${(tailoredContent.skills || []).join(', ')}
` : ''}

Generate 15-20 interview questions covering:
1. Technical Questions (SQL Server specific, database administration, performance tuning, HA/DR)
2. Behavioral Questions (using STAR method examples from the candidate's experience)
3. System Design Questions (architecture, scalability, disaster recovery)

For each question, provide:
- q: The interview question
- difficulty: "Easy", "Medium", or "Hard"
- rationale: Why this question is relevant to this specific job posting
- modelAnswer: A strong answer tailored to the candidate's experience (if available) or a general expert-level answer
- starExample: For behavioral questions, provide a STAR (Situation, Task, Action, Result) formatted example using the candidate's actual experience bullets if available

Return a JSON object with this structure:
{
  "questions": [
    {
      "q": "Tell me about a time when you had to optimize a poorly performing query in a production environment.",
      "difficulty": "Medium",
      "rationale": "This job emphasizes performance tuning and the candidate has experience with query optimization using Extended Events and Query Store.",
      "modelAnswer": "In my role at UnitedHealth, I identified a critical query that was causing timeouts...",
      "starExample": "Situation: At UnitedHealth, our healthcare application was experiencing slow response times. Task: I needed to identify and fix the performance bottleneck. Action: I used Extended Events and Query Store to analyze query patterns, identified missing indexes, and implemented optimizations. Result: Improved query execution time by 70% and resolved user complaints."
    }
  ]
}

Focus on SQL Server DBA-specific questions that align with the job requirements and demonstrate the candidate's expertise.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SQL Server DBA interviewer and career coach. Generate realistic, role-specific interview questions with STAR method examples."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      questions: Array.isArray(result.questions) ? result.questions : []
    };
  } catch (error) {
    throw new Error("Failed to generate interview questions: " + (error as Error).message);
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
${experienceBullets.map((bullet, i) => `${i + 1}. ${bullet}`).join('\n')}

For each bullet:
1. If it can be quantified (add metrics, percentages, time savings, cost reductions), provide an enhanced version
2. If it's already well-quantified or cannot be quantified without making false claims, mark it as "unchanged"

Return a JSON object with:
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

IMPORTANT: Only suggest quantifications that are reasonable based on the resume content. Do not invent specific numbers that can't be verified.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert resume writer who specializes in quantifying achievements. Enhance bullets with metrics while maintaining truthfulness."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      appliedEdits: Array.isArray(result.appliedEdits) ? result.appliedEdits : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
    };
  } catch (error) {
    throw new Error("Failed to quantify achievements: " + (error as Error).message);
  }
}

// ============================================
// INTERVIEW PREP HUB FEATURES
// ============================================

export interface InterviewPrepQuestion {
  id: string;
  question: string;
  type: 'technical' | 'behavioral';
  topic: string;
  difficulty: 'junior' | 'mid' | 'senior';
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
  label: '30s' | '2min' | 'deepDive';
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
    tailoredContent?: any;
    mode: 'job' | 'skill' | 'general';
  }
): Promise<InterviewPrepQuestionsResponse> {
  try {
    let contextDescription = '';
    
    if (context.mode === 'job' && context.jobDescription) {
      contextDescription = `Job Description:\n${context.jobDescription}\n\n`;
      if (context.jobAnalysis) {
        contextDescription += `Job Title: ${context.jobAnalysis.title || 'DBA'}\n`;
        contextDescription += `Company: ${context.jobAnalysis.company || 'Target Company'}\n`;
        contextDescription += `Key Technologies: ${(context.jobAnalysis.technologies || []).join(', ')}\n\n`;
      }
    } else if (context.mode === 'skill' && context.skills && context.skills.length > 0) {
      contextDescription = `Focus Skills: ${context.skills.join(', ')}\n\n`;
    } else {
      contextDescription = 'General SQL Server DBA Interview Preparation\n\n';
    }

    if (context.tailoredContent) {
      contextDescription += `Candidate Background:\n`;
      contextDescription += `Skills: ${(context.tailoredContent.skills || []).join(', ')}\n`;
      if (context.tailoredContent.experience && context.tailoredContent.experience.length > 0) {
        contextDescription += `Recent Experience: ${context.tailoredContent.experience[0].company || 'N/A'}\n`;
      }
    }

    const prompt = `Generate interview preparation questions for a SQL Server DBA position.

${contextDescription}

Generate 12-15 high-quality interview questions covering:
1. Technical Questions (40%): SQL Server administration, performance tuning, HA/DR, security
2. Behavioral Questions (40%): Past experience using STAR method
3. System Design (20%): Architecture and scalability

For each question provide:
- id: unique identifier (e.g., "tech-1", "behav-1")
- question: The interview question text
- type: "technical" or "behavioral"
- topic: Category (e.g., "HA/DR", "Performance Tuning", "Leadership")
- difficulty: "junior", "mid", or "senior"
- suggestedAnswer: A comprehensive answer with specific SQL Server details
- star: For behavioral questions, include {situation, task, action, result} breakdown

Return JSON in this exact format:
{
  "questions": [
    {
      "id": "tech-1",
      "question": "How would you troubleshoot a slowly performing query in SQL Server?",
      "type": "technical",
      "topic": "Performance Tuning",
      "difficulty": "mid",
      "suggestedAnswer": "I would use a systematic approach: 1) Check execution plans using SQL Server Management Studio... 2) Use Dynamic Management Views (DMVs) like sys.dm_exec_query_stats... 3) Analyze wait statistics... 4) Review indexes and statistics...",
      "star": null
    },
    {
      "id": "behav-1",
      "question": "Tell me about a time when you had to recover from a major database failure.",
      "type": "behavioral",
      "topic": "HA/DR",
      "difficulty": "senior",
      "suggestedAnswer": "In my previous role, I successfully recovered from a critical database corruption incident...",
      "star": {
        "situation": "Production SQL Server experienced corruption during peak hours affecting 10,000+ users",
        "task": "Restore service within 2-hour SLA while ensuring no data loss",
        "action": "Executed disaster recovery plan: verified backups, initiated failover to secondary node, ran DBCC CHECKDB, coordinated with application teams",
        "result": "Restored service in 90 minutes, zero data loss, documented incident for future prevention"
      }
    }
  ]
}`;

    console.log('[OPENAI] Generating interview prep questions with mode:', context.mode);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SQL Server DBA interviewer and technical coach. Generate realistic, practical interview questions with detailed answers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      questions: Array.isArray(result.questions) ? result.questions : []
    };
  } catch (error: any) {
    console.error('[OPENAI] Error generating interview prep questions:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: error.response?.data || error.response
    });
    
    // Check if it's an OpenAI API error
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
    
    let contextInfo = '';
    if (context?.jobDescription) {
      contextInfo += `Job Context:\n${context.jobDescription.substring(0, 500)}...\n\n`;
    }
    if (context?.tailoredContent?.experience) {
      const exp = context.tailoredContent.experience[0];
      if (exp) {
        contextInfo += `Candidate's Recent Experience:\n${exp.company || 'N/A'}: ${(exp.achievements || []).slice(0, 2).join('; ')}\n\n`;
      }
    }

    const prompt = `Generate multi-level explanations for these SQL Server DBA skills: ${skillsList.join(', ')}

${contextInfo}

For EACH skill, provide three levels of explanation:
1. 30s: Elevator pitch (1-2 sentences) - what it is and why it matters
2. 2min: Practical explanation (3-4 sentences) - how it's used in real scenarios
3. deepDive: Technical deep-dive (5-6 sentences) - architecture, best practices, advanced concepts

Also include:
- pitfalls: Common mistakes or misconceptions (3-5 items)
- examplesFromResume: If the candidate's experience mentions this skill, reference it briefly (optional)

Return JSON in this exact format:
{
  "skills": [
    {
      "skill": "Always On Availability Groups",
      "levels": [
        {
          "label": "30s",
          "text": "Always On Availability Groups is SQL Server's high availability solution that provides database-level failover with minimal downtime, ensuring business continuity."
        },
        {
          "label": "2min",
          "text": "Always On AGs replicate databases across multiple SQL Server instances in real-time. When the primary fails, automatic failover redirects connections to a secondary replica within seconds. This is crucial for mission-critical applications requiring 99.99% uptime."
        },
        {
          "label": "deepDive",
          "text": "Always On uses synchronous or asynchronous data movement to secondary replicas. Key components include the Windows Server Failover Cluster (WSFC), availability group listeners for automatic connection redirection, and read-only routing for load distribution. Best practices include using synchronous commit for zero data loss, configuring appropriate failover policies, and monitoring replica health with DMVs like sys.dm_hadr_availability_replica_states."
        }
      ],
      "pitfalls": [
        "Not configuring automatic seeding can lead to manual initialization headaches",
        "Mixing synchronous and asynchronous replicas without understanding performance impact",
        "Forgetting to update connection strings to use AG listener instead of server names",
        "Overlooking transaction log growth on secondary replicas during heavy write operations"
      ],
      "examplesFromResume": [
        "Configured and maintained Always On Availability Groups for 99.99% uptime"
      ]
    }
  ]
}`;

    console.log('[OPENAI] Generating skill explanations for:', skillsList.join(', '));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a senior SQL Server DBA and technical instructor. Explain complex database concepts at multiple levels of depth with practical examples."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      skills: Array.isArray(result.skills) ? result.skills : []
    };
  } catch (error: any) {
    console.error('[OPENAI] Error generating skill explanations:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: error.response?.data || error.response
    });
    
    // Check if it's an OpenAI API error
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

    let focusInstruction = '';
    if (context?.skill) {
      focusInstruction = `Focus on stories that demonstrate expertise in: ${context.skill}\n\n`;
    }
    if (context?.jobDescription) {
      focusInstruction += `Align stories with this job description:\n${context.jobDescription.substring(0, 400)}...\n\n`;
    }

    const prompt = `Generate STAR (Situation, Task, Action, Result) interview stories from these resume achievements.

${focusInstruction}

Resume Achievements:
${experienceBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Generate 5-7 compelling STAR stories that:
1. Transform resume bullets into interview narratives
2. Include specific technical details and metrics
3. Demonstrate problem-solving and impact
4. Cover different skill areas (performance, HA/DR, migration, security, etc.)

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

Return JSON in this exact format:
{
  "stories": [
    {
      "id": "story-1",
      "title": "Production Database Performance Rescue",
      "skill": "Performance Tuning",
      "situation": "Our main customer database was experiencing severe slowdowns during peak hours, with queries timing out and users unable to complete transactions. The issue was impacting revenue and customer satisfaction.",
      "task": "I was tasked with identifying and resolving the performance bottleneck within 24 hours to avoid business impact.",
      "action": "I used SQL Server Profiler and Extended Events to capture slow queries, analyzed execution plans to identify missing indexes and parameter sniffing issues, implemented index recommendations, and updated statistics. I also configured Query Store for ongoing monitoring.",
      "result": "Reduced average query response time by 75%, eliminated timeouts, and prevented an estimated $50K in lost revenue. Established monitoring alerts to prevent future issues.",
      "conciseVersion": "Our production database had severe performance issues during peak hours. I used Extended Events and execution plan analysis to identify missing indexes and parameter sniffing. After implementing optimizations, we achieved 75% faster query times and eliminated timeouts.",
      "extendedVersion": "In my role as SQL Server DBA, our primary customer-facing database started experiencing critical performance degradation during peak business hours. Users were reporting transaction timeouts, and our support team was overwhelmed with complaints. The situation was urgent because it was directly impacting revenue. I immediately began investigating using SQL Server Extended Events to capture the problematic queries without adding overhead. Through execution plan analysis, I discovered several issues: missing indexes on frequently queried tables, parameter sniffing causing poor plan choices, and outdated statistics. I carefully implemented index recommendations during a maintenance window, used query hints to address parameter sniffing, and rebuilt statistics. I also configured Query Store to monitor query performance going forward. The results were dramatic - average query response time improved by 75%, we eliminated all timeout errors, and our monitoring showed we prevented approximately $50,000 in lost revenue during the next peak period. I documented the entire process and set up automated alerts to catch similar issues early."
    }
  ]
}`;

    console.log('[OPENAI] Generating STAR stories from', experienceBullets.length, 'achievements');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert interview coach specializing in behavioral interviews for technical roles. Transform resume bullets into compelling STAR stories."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      stories: Array.isArray(result.stories) ? result.stories : []
    };
  } catch (error: any) {
    console.error('[OPENAI] Error generating STAR stories:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      response: error.response?.data || error.response
    });
    
    // Check if it's an OpenAI API error
    if (error.status === 400) {
      throw new Error(`OpenAI API error: Invalid request format. ${error.message}`);
    }
    
    throw new Error("Failed to generate STAR stories: " + error.message);
  }
}
