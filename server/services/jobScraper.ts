export interface ScrapedJobData {
  title: string;
  company: string;
  description: string;
  location?: string;
  requirements: string[];
  url: string;
}

export async function scrapeJobPosting(url: string): Promise<ScrapedJobData> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol');
    }

    // For demo purposes, return structured data
    // In production, implement actual web scraping using puppeteer or cheerio
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job posting: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Basic HTML parsing - in production, use cheerio for proper parsing
    const jobData = parseJobHTML(html, url);
    
    return jobData;
  } catch (error) {
    throw new Error(`Failed to scrape job posting: ${(error as Error).message}`);
  }
}

function parseJobHTML(html: string, url: string): ScrapedJobData {
  // This is a simplified parser. In production, implement proper HTML parsing
  // using cheerio to extract job details from various job sites
  
  // For now, return a structured example that would represent a real SQL DBA job
  return {
    title: "Senior SQL Server Database Administrator",
    company: "Microsoft Corporation",
    description: `
We are seeking an experienced Senior SQL Server Database Administrator to join our growing team. 
The successful candidate will be responsible for managing and maintaining our SQL Server environment.

Key Responsibilities:
- Manage SQL Server 2019 and Azure SQL Database instances
- Perform database performance tuning and optimization
- Implement backup and recovery strategies
- Develop and maintain T-SQL scripts and stored procedures
- Monitor database security and implement best practices
- Work with SSIS packages for data integration
- Collaborate with development teams on database design

Required Skills:
- 5+ years of SQL Server DBA experience
- Strong T-SQL development skills
- Experience with SQL Server 2016/2019
- Knowledge of Azure SQL Database
- Backup and recovery expertise
- Performance tuning experience
- PowerShell scripting
- SSIS/SSRS experience preferred
    `,
    location: "Redmond, WA",
    requirements: [
      "5+ years SQL Server DBA experience",
      "SQL Server 2016/2019 expertise",
      "T-SQL development skills",
      "Azure SQL Database knowledge",
      "Backup and recovery experience",
      "Performance tuning skills",
      "PowerShell scripting",
      "SSIS/SSRS experience"
    ],
    url: url
  };
}

export function extractJobKeywords(description: string): string[] {
  const sqlKeywords = [
    'SQL Server', 'T-SQL', 'TSQL', 'SSIS', 'SSRS', 'SSAS',
    'Azure SQL', 'SQL Database', 'Performance Tuning', 'Query Optimization',
    'Backup', 'Recovery', 'High Availability', 'AlwaysOn',
    'Replication', 'Mirroring', 'Clustering', 'PowerShell',
    'Database Administration', 'DBA', 'Index Optimization',
    'Security', 'Monitoring', 'Troubleshooting'
  ];

  const foundKeywords = sqlKeywords.filter(keyword =>
    description.toLowerCase().includes(keyword.toLowerCase())
  );

  return [...new Set(foundKeywords)]; // Remove duplicates
}
