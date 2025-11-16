import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
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

export async function analyzeResumeMatch(resumeContent: string, jobAnalysis: JobAnalysisResult): Promise<ResumeAnalysis> {
  try {
    const prompt = `Analyze this resume against the job requirements for a SQL Server DBA position.

Resume Content:
${resumeContent}

Job Requirements:
${JSON.stringify(jobAnalysis, null, 2)}

Please respond with a JSON object containing:
- strengths: Array of resume strengths that match the job
- gaps: Array of missing skills/experience from the resume
- matchScore: Percentage match (0-100)
- suggestions: Array of specific suggestions to improve the resume for this role
- matchedKeywords: Array of keywords from the job requirements that are present in the resume
- missingKeywords: Array of important keywords from the job requirements that are missing from the resume

Focus on SQL Server DBA specific skills, experience, and qualifications.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SQL Server DBA recruiter analyzing resume compatibility with job requirements."
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
    const prompt = `CRITICAL: PRESERVE AND ENHANCE EXISTING EXPERIENCE BULLETS

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
- contact: Use the REAL contact information from the provided contactInfo object - never use placeholders like "Professional Name". Use the actual name, email, phone, etc. from the contactInfo. For the title field, use the EXACT job title from the job posting (e.g., "Senior Database Administrator - Azure SQL & Multi-Cloud Data Platforms") to show perfect role alignment.
- summary: Professional summary that MATCHES THE EXACT JOB LEVEL and requirements from the job posting. For modern data platform roles, lead with cloud technologies (Azure SQL, Snowflake, multi-cloud). For traditional DBA roles, lead with SQL Server. Emphasize the specific technologies and responsibilities mentioned in the job posting. DO NOT include location preferences or willingness to work in specific locations like "Open to a fully on-site role in Camden, NJ"
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
1. **MATCH EXACT JOB TITLE & LEVEL** - Use the exact title from job posting (Senior Database Administrator - Azure SQL & Multi-Cloud, etc.)
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
2. **Match job title exactly** - Use the exact job title from posting in the contact.title field
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
