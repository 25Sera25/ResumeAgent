import { storage } from '../storage';
import type { TailoredResume, JobPosting } from '@shared/schema';

// ============================================
// NEW FEATURE 3: Skills Gap Dashboard
// ============================================

// Simple in-memory cache (5 minute TTL)
const insightsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface SkillCoverage {
  skill: string;
  jobsMentioned: number;
  resumesCovering: number;
  coveragePercent: number;
  category: 'core-tech' | 'tools' | 'responsibilities' | 'compliance' | 'adjacent';
}

interface LearningResource {
  skill: string;
  resources: Array<{
    title: string;
    url: string;
    type: 'course' | 'documentation' | 'certification' | 'tutorial';
  }>;
}

export interface SkillsInsights {
  topRequestedSkills: SkillCoverage[];
  missingSkills: SkillCoverage[];
  learningRoadmap: LearningResource[];
  stats: {
    totalJobsAnalyzed: number;
    totalResumesGenerated: number;
    averageCoverage: number;
  };
}

// Static learning resource mappings for common DBA skills
const LEARNING_RESOURCES: Record<string, LearningResource> = {
  'Always On': {
    skill: 'Always On Availability Groups',
    resources: [
      {
        title: 'Microsoft Learn: Configure Always On Availability Groups',
        url: 'https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server',
        type: 'documentation'
      },
      {
        title: 'Pluralsight: SQL Server Always On Availability Groups',
        url: 'https://www.pluralsight.com/courses/sql-server-always-on-availability-groups',
        type: 'course'
      }
    ]
  },
  'Azure SQL': {
    skill: 'Azure SQL Database',
    resources: [
      {
        title: 'Microsoft Certified: Azure Database Administrator Associate',
        url: 'https://learn.microsoft.com/en-us/certifications/azure-database-administrator-associate/',
        type: 'certification'
      },
      {
        title: 'Azure SQL Fundamentals',
        url: 'https://learn.microsoft.com/en-us/training/paths/azure-sql-fundamentals/',
        type: 'course'
      }
    ]
  },
  'PowerShell': {
    skill: 'PowerShell for SQL Server',
    resources: [
      {
        title: 'PowerShell for SQL Server DBAs',
        url: 'https://learn.microsoft.com/en-us/sql/powershell/sql-server-powershell',
        type: 'documentation'
      },
      {
        title: 'Automating SQL Server with PowerShell',
        url: 'https://www.pluralsight.com/courses/automating-sql-server-powershell',
        type: 'course'
      }
    ]
  },
  'Query Tuning': {
    skill: 'SQL Query Performance Tuning',
    resources: [
      {
        title: 'SQL Server Query Performance Tuning',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/performance/performance-monitoring-and-tuning-tools',
        type: 'documentation'
      },
      {
        title: 'SQL Server: Query Performance Tuning',
        url: 'https://www.pluralsight.com/courses/sqlserver-query-performance-tuning',
        type: 'course'
      }
    ]
  },
  'Performance': {
    skill: 'Performance Tuning',
    resources: [
      {
        title: 'SQL Server Performance Tuning and Optimization',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/performance/performance-center-for-sql-server-database-engine-and-azure-sql-database',
        type: 'documentation'
      },
      {
        title: 'SQL Server Performance Tuning',
        url: 'https://www.pluralsight.com/courses/sqlserver-performance-tuning',
        type: 'course'
      }
    ]
  },
  'RPO/RTO': {
    skill: 'Disaster Recovery (RPO/RTO)',
    resources: [
      {
        title: 'Disaster Recovery and High Availability for SQL Server',
        url: 'https://learn.microsoft.com/en-us/sql/database-engine/sql-server-business-continuity-dr',
        type: 'documentation'
      },
      {
        title: 'SQL Server Disaster Recovery',
        url: 'https://www.pluralsight.com/courses/sql-server-disaster-recovery',
        type: 'course'
      }
    ]
  },
  'Backup': {
    skill: 'Backup & Restore',
    resources: [
      {
        title: 'SQL Server Backup and Restore',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-and-restore-of-sql-server-databases',
        type: 'documentation'
      },
      {
        title: 'SQL Server Backup Strategies',
        url: 'https://www.pluralsight.com/courses/sql-server-backup-strategies',
        type: 'course'
      }
    ]
  },
  'T-SQL': {
    skill: 'T-SQL Programming',
    resources: [
      {
        title: 'T-SQL Language Reference',
        url: 'https://learn.microsoft.com/en-us/sql/t-sql/language-reference',
        type: 'documentation'
      },
      {
        title: 'Querying Data with T-SQL',
        url: 'https://learn.microsoft.com/en-us/training/paths/get-started-querying-with-transact-sql/',
        type: 'course'
      }
    ]
  },
  'Security': {
    skill: 'SQL Server Security',
    resources: [
      {
        title: 'SQL Server Security Best Practices',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/security/security-center-for-sql-server-database-engine-and-azure-sql-database',
        type: 'documentation'
      },
      {
        title: 'SQL Server Security Fundamentals',
        url: 'https://www.pluralsight.com/courses/sql-server-security-fundamentals',
        type: 'course'
      }
    ]
  },
  'Replication': {
    skill: 'SQL Server Replication',
    resources: [
      {
        title: 'SQL Server Replication Overview',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/replication/sql-server-replication',
        type: 'documentation'
      },
      {
        title: 'Implementing SQL Server Replication',
        url: 'https://www.pluralsight.com/courses/sql-server-replication-implementing',
        type: 'course'
      }
    ]
  },
  'Snowflake': {
    skill: 'Snowflake Data Platform',
    resources: [
      {
        title: 'SnowPro Core Certification',
        url: 'https://www.snowflake.com/certifications/',
        type: 'certification'
      },
      {
        title: 'Snowflake Hands-On Essentials',
        url: 'https://learn.snowflake.com/',
        type: 'course'
      }
    ]
  },
  'Kubernetes': {
    skill: 'Kubernetes for Databases',
    resources: [
      {
        title: 'Running Databases on Kubernetes',
        url: 'https://kubernetes.io/docs/tutorials/stateful-application/',
        type: 'documentation'
      },
      {
        title: 'Certified Kubernetes Administrator (CKA)',
        url: 'https://www.cncf.io/certification/cka/',
        type: 'certification'
      }
    ]
  },
  'PostgreSQL': {
    skill: 'PostgreSQL Database Administration',
    resources: [
      {
        title: 'PostgreSQL Documentation',
        url: 'https://www.postgresql.org/docs/',
        type: 'documentation'
      },
      {
        title: 'PostgreSQL Administration',
        url: 'https://www.pluralsight.com/courses/postgresql-administration',
        type: 'course'
      }
    ]
  },
  'SSIS': {
    skill: 'SQL Server Integration Services (SSIS)',
    resources: [
      {
        title: 'SSIS Tutorial and Documentation',
        url: 'https://learn.microsoft.com/en-us/sql/integration-services/sql-server-integration-services',
        type: 'documentation'
      },
      {
        title: 'SSIS Fundamentals',
        url: 'https://www.pluralsight.com/courses/ssis-fundamentals',
        type: 'course'
      }
    ]
  },
  'SSRS': {
    skill: 'SQL Server Reporting Services (SSRS)',
    resources: [
      {
        title: 'SSRS Documentation',
        url: 'https://learn.microsoft.com/en-us/sql/reporting-services/create-deploy-and-manage-mobile-and-paginated-reports',
        type: 'documentation'
      },
      {
        title: 'SSRS Report Development',
        url: 'https://www.pluralsight.com/courses/ssrs-report-development',
        type: 'course'
      }
    ]
  },
  'Index': {
    skill: 'Index Optimization',
    resources: [
      {
        title: 'SQL Server Index Architecture and Design',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide',
        type: 'documentation'
      },
      {
        title: 'SQL Server Indexing Strategies',
        url: 'https://www.pluralsight.com/courses/sql-server-indexing-for-performance',
        type: 'course'
      }
    ]
  },
  'Migration': {
    skill: 'Database Migration',
    resources: [
      {
        title: 'Azure Database Migration Guide',
        url: 'https://learn.microsoft.com/en-us/data-migration/',
        type: 'documentation'
      },
      {
        title: 'Database Migration Strategies',
        url: 'https://www.pluralsight.com/courses/database-migration-strategies',
        type: 'course'
      }
    ]
  },
  'Monitoring': {
    skill: 'Database Monitoring',
    resources: [
      {
        title: 'SQL Server Monitoring and Performance Tuning',
        url: 'https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitor-and-tune-for-performance',
        type: 'documentation'
      },
      {
        title: 'SQL Server Monitoring Fundamentals',
        url: 'https://www.pluralsight.com/courses/sql-server-monitoring-ps-fundamentals',
        type: 'course'
      }
    ]
  }
};

export async function getSkillsInsights(userId?: string): Promise<SkillsInsights> {
  try {
    const cacheKey = `skills-insights-${userId || 'all'}`;
    
    // Check cache
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Get all tailored resumes and job postings for the user
    const tailoredResumes = await storage.getTailoredResumes(userId);
    
    // If no tailored resumes exist, return empty but valid response
    if (!tailoredResumes || tailoredResumes.length === 0) {
      const emptyInsights: SkillsInsights = {
        topRequestedSkills: [],
        missingSkills: [],
        learningRoadmap: [],
        stats: {
          totalJobsAnalyzed: 0,
          totalResumesGenerated: 0,
          averageCoverage: 0
        }
      };
      
      // Cache the empty results
      insightsCache.set(cacheKey, { data: emptyInsights, timestamp: Date.now() });
      
      return emptyInsights;
    }
    
    // For now, we'll analyze from tailored resume data since jobPostings may not be populated
    // In a full implementation, we'd also query jobPostings table
    
    // Extract all skills mentioned across jobs
    const skillMentions = new Map<string, { jobs: Set<string>; resumes: Set<string>; category: string }>();
    
    // Analyze each tailored resume's job analysis and coverage
    for (const resume of tailoredResumes) {
      const tailoredContent = resume.tailoredContent as any;
      
      if (tailoredContent) {
        // Extract keywords from coverage report
        const coverageReport = tailoredContent.coverageReport || {};
        const matchedKeywords = coverageReport.matchedKeywords || [];
        const missingKeywords = coverageReport.missingKeywords || [];
        const allSkills = tailoredContent.skills || [];
        
        // Track all skills
        [...matchedKeywords, ...missingKeywords, ...allSkills].forEach(skill => {
          if (!skill || typeof skill !== 'string') return;
          
          const normalizedSkill = skill.trim();
          if (!skillMentions.has(normalizedSkill)) {
            skillMentions.set(normalizedSkill, {
              jobs: new Set(),
              resumes: new Set(),
              category: categorizeSkill(normalizedSkill)
            });
          }
          
          const entry = skillMentions.get(normalizedSkill)!;
          entry.jobs.add(resume.jobTitle + resume.company); // Unique job identifier
          
          if (matchedKeywords.includes(normalizedSkill) || allSkills.includes(normalizedSkill)) {
            entry.resumes.add(resume.id);
          }
        });
      }
    }
    
    // Convert to coverage array
    const skillCoverages: SkillCoverage[] = Array.from(skillMentions.entries())
      .map(([skill, data]) => ({
        skill,
        jobsMentioned: data.jobs.size,
        resumesCovering: data.resumes.size,
        coveragePercent: data.jobs.size > 0 ? Math.round((data.resumes.size / data.jobs.size) * 100) : 0,
        category: data.category as any
      }))
      .sort((a, b) => b.jobsMentioned - a.jobsMentioned);
    
    // Get top 30 most requested skills
    const topRequestedSkills = skillCoverages.slice(0, 30);
    
    // Get skills with low coverage (coverage < 80% and mentioned in at least 2 jobs)
    // This provides a more meaningful threshold for skill gaps
    const missingSkills = skillCoverages
      .filter(s => s.coveragePercent < 80 && s.jobsMentioned >= 2)
      .slice(0, 15);
    
    // Generate learning roadmap for missing skills
    const learningRoadmap = generateLearningRoadmap(missingSkills);
    
    // Calculate stats
    const totalJobsAnalyzed = tailoredResumes.length;
    const totalResumesGenerated = tailoredResumes.length;
    const averageCoverage = skillCoverages.length > 0
      ? Math.round(skillCoverages.reduce((sum, s) => sum + s.coveragePercent, 0) / skillCoverages.length)
      : 0;
    
    const insights: SkillsInsights = {
      topRequestedSkills,
      missingSkills,
      learningRoadmap,
      stats: {
        totalJobsAnalyzed,
        totalResumesGenerated,
        averageCoverage
      }
    };
    
    // Cache the results
    insightsCache.set(cacheKey, { data: insights, timestamp: Date.now() });
    
    return insights;
  } catch (error) {
    throw new Error(`Failed to get skills insights: ${(error as Error).message}`);
  }
}

function categorizeSkill(skill: string): string {
  const skillLower = skill.toLowerCase();
  
  // Core tech
  if (skillLower.includes('sql server') || skillLower.includes('azure sql') || 
      skillLower.includes('postgresql') || skillLower.includes('mysql') ||
      skillLower.includes('oracle') || skillLower.includes('snowflake') ||
      skillLower.includes('always on') || skillLower.includes('availability')) {
    return 'core-tech';
  }
  
  // Tools
  if (skillLower.includes('powershell') || skillLower.includes('ssms') ||
      skillLower.includes('git') || skillLower.includes('terraform') ||
      skillLower.includes('kubernetes') || skillLower.includes('docker') ||
      skillLower.includes('ansible') || skillLower.includes('grafana')) {
    return 'tools';
  }
  
  // Compliance
  if (skillLower.includes('hipaa') || skillLower.includes('gdpr') ||
      skillLower.includes('sox') || skillLower.includes('compliance') ||
      skillLower.includes('audit') || skillLower.includes('security')) {
    return 'compliance';
  }
  
  // Adjacent databases
  if (skillLower.includes('mongodb') || skillLower.includes('cassandra') ||
      skillLower.includes('redis') || skillLower.includes('dynamodb')) {
    return 'adjacent';
  }
  
  // Default to responsibilities
  return 'responsibilities';
}

function generateLearningRoadmap(missingSkills: SkillCoverage[]): LearningResource[] {
  const roadmap: LearningResource[] = [];
  
  for (const skill of missingSkills) {
    // Check if we have static resources for this skill
    const matchingResource = Object.entries(LEARNING_RESOURCES).find(([key]) => 
      skill.skill.toLowerCase().includes(key.toLowerCase())
    );
    
    if (matchingResource) {
      roadmap.push(matchingResource[1]);
    } else {
      // Generate generic learning resource
      roadmap.push({
        skill: skill.skill,
        resources: [
          {
            title: `Learn ${skill.skill}`,
            url: `https://www.google.com/search?q=learn+${encodeURIComponent(skill.skill)}`,
            type: 'tutorial'
          }
        ]
      });
    }
  }
  
  return roadmap.slice(0, 10); // Return top 10 learning resources
}

export async function getTailoredResumeAnalytics(userId?: string) {
  try {
    const cacheKey = `resume-analytics-${userId || 'all'}`;
    
    // Check cache
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const tailoredResumes = await storage.getTailoredResumes(userId);
    
    // Calculate analytics
    const totalVersions = tailoredResumes.length;
    const appliedCount = tailoredResumes.filter(r => r.appliedToJob).length;
    const responsesReceived = tailoredResumes.filter(r => r.responseReceived).length;
    const averageAtsScore = tailoredResumes.length > 0
      ? Math.round(tailoredResumes.reduce((sum, r) => sum + (r.atsScore || 0), 0) / tailoredResumes.length)
      : 0;
    
    // Response rate by version
    const responseRate = appliedCount > 0 ? Math.round((responsesReceived / appliedCount) * 100) : 0;
    
    // Versions that got responses
    const versionsWithResponses = tailoredResumes.filter(r => r.responseReceived);
    
    // Average ATS score of versions that got responses
    const avgAtsScoreWithResponses = versionsWithResponses.length > 0
      ? Math.round(versionsWithResponses.reduce((sum, r) => sum + (r.atsScore || 0), 0) / versionsWithResponses.length)
      : 0;
    
    const analytics = {
      totalVersions,
      appliedCount,
      responsesReceived,
      responseRate,
      averageAtsScore,
      avgAtsScoreWithResponses,
      versionsWithResponses: versionsWithResponses.map(r => ({
        id: r.id,
        jobTitle: r.jobTitle,
        company: r.company,
        atsScore: r.atsScore,
        responseDate: r.responseDate
      })),
      conversionFunnel: {
        saved: totalVersions,
        applied: appliedCount,
        interviews: 0, // TODO: Track interviews separately
        offers: 0 // TODO: Track offers separately
      }
    };
    
    // Cache the results
    insightsCache.set(cacheKey, { data: analytics, timestamp: Date.now() });
    
    return analytics;
  } catch (error) {
    throw new Error(`Failed to get resume analytics: ${(error as Error).message}`);
  }
}
