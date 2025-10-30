# Resume Tailoring Application

## Overview

This is a full-stack web application designed to help job seekers tailor their resumes to specific job postings. The application uses AI to analyze job descriptions and automatically customize resumes to improve match scores with applicant tracking systems (ATS). Users can upload resumes, paste job URLs, and receive professionally tailored resume content with enhanced keywords and optimized formatting.

## User Preferences

Preferred communication style: Simple, everyday language.
ATS Score Target: 90%+ minimum, 93-95% preferred for interview-landing quality in challenging job market. System must aggressively include ALL specific technologies mentioned in job postings.
Contact Information Handling: Extract real contact details from base resume and place prominently in resume body (not just headers).
Resume Filename Format: Generate meaningful filenames using format "Name_DBA_Resume_CompanyName" (e.g., "Ayele_DBA_Resume_Holtec").
Technology Prioritization: For modern data platform roles, emphasize cloud technologies (Azure SQL, Snowflake, dbt, Airflow) over traditional SQL Server. Match exact job titles from postings.

### JD-First Evidence-Based Tailoring Methodology (Added 2025-01-11)

**Core Philosophy**: "JD-first, evidence-based tailoring" with strict truthfulness requirements.

**Quality Gates**:
- JD must have 3,000+ characters with substantial role-specific content
- Must classify role archetype (SQL Server DBA vs EHR Administrator vs Data Engineer etc.) before tailoring
- Never inflate or invent experience - use truthfulness ladder (hands-on → familiar → omit)

**Keyword Strategy**:
- Extract top 30 JD keywords grouped into 6 buckets: Core Tech, Responsibilities, Tools, Adjacent Data Stores, Compliance, Logistics
- Maintain synonym mapping (e.g., AlwaysOn ⇔ AGs ⇔ Availability Groups)
- Ensure coverage of all stressed buckets from JD

**Scoring System** (100 points):
- Core Tech & Platforms (35 pts)
- Responsibilities (25 pts) 
- Tools/Automation (15 pts)
- Adjacent Data Stores (10 pts)
- Compliance/Industry (10 pts)
- Logistics & Culture (5 pts)

**Output Requirements**:
- Generate both ATS and Core versions
- Detailed filename format: Name_DBA_CompanyName (e.g., "Ayele_DBA_CFA")
- Include JD coverage report with keyword analysis and scoring breakdown
- Professional Development section from original resume
- Exact job title matching in contact information

**Recent Enhancements (2025-01-14)**:
- Enhanced modern data platform support (Azure SQL, Snowflake, dbt, Airflow, FiveTran)
- Improved job title matching for perfect role alignment
- Cloud-first positioning for data platform roles vs traditional DBA roles
- Enhanced keyword variety to avoid overusing "familiar"
- Better technology prioritization based on role evolution (Traditional DBA → Cloud DBA → Data Platform Engineer)

**Latest Updates (2025-01-16)**:
- **CRITICAL DATABASE FIX**: Switched from MemStorage to DatabaseStorage for permanent data persistence
  * All tailored resumes are now permanently stored in PostgreSQL database
  * Job applications and tracking data are permanently stored
  * Fixes critical issue where tailored resumes were lost on system restarts
  * Database schema includes comprehensive tables for all data types
- **Professional Resume Formatting**: Fixed DOCX font sizing and contact header layout:
  * Name: 16pt, Section headers: 14pt, Job titles: 13pt, Contact: 12pt, Body: 11pt
  * Improved contact information spacing and layout in header
  * Better line spacing and hierarchy for professional appearance
- **AI Improvements Permanent Storage**: Now saves micro-edits and AI improvements permanently
  * Added microEdits and aiImprovements fields to database schema
  * Resume Library shows "View AI Improvements" button when improvements exist
  * Users can see exactly what AI changes were made for future reference
  * Prevents loss of valuable improvement data when system refreshes
- **Original Job Description Storage**: Added permanent job description storage for interview prep
  * Added originalJobDescription field to database schema
  * Automatically saves full job posting text when tailoring resumes
  * Resume Library shows "View Job Description" button for saved job descriptions
  * Perfect for interview preparation when original job postings are removed
- **Resume Library & Job Tracker**: Permanent storage features now fully functional:
  * Resume Library with search, filtering, download capabilities
  * Job Application Tracker with status updates and statistics
  * "Save to Library" functionality integrated into ResumePreview component
  * AI Improvements dialog shows saved micro-edits and improvements
- **Enhanced Navigation**: Added header links to Resume Library and Job Tracker

**Application Follow-Up Copilot (2025-01-29)**:
- **Automated Follow-Up System**: AI-powered follow-up email generation to help users stay top-of-mind with employers
  * Schedule follow-up reminders directly from Job Tracker
  * Three follow-up types: 1-week check-in, 2-week nudge, post-interview thank you
  * AI generates personalized, professional follow-up emails using GPT-5
  * Draft emails can be copied to clipboard for manual sending (no auto-send to avoid spam concerns)
- **Follow-Up Queue Component**: Progressive disclosure UI with compact mode
  * Homepage shows top 3 most urgent follow-ups in compact mode to reduce clutter
  * Badge displays total pending follow-ups count
  * "View All" button navigates to Job Tracker for full list
  * Job Tracker displays complete follow-up queue (non-compact mode)
  * Visual indicators for overdue follow-ups (orange border, overdue badge)
  * Real-time status management: pending → sent or skipped
- **Database Integration**: Follow-ups stored in PostgreSQL with foreign key constraints
  * Prevents orphaned follow-ups when job applications are deleted
  * Tracks email subject, body, sent timestamp, and status
  * Statistics dashboard shows follow-ups scheduled count

## System Architecture

### Frontend Architecture
The client-side is built with **React 18** using **Vite** as the build tool and development server. The application uses a modern component-based architecture with:

- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Type Safety**: Full TypeScript integration with strict configuration

The frontend follows a clean separation of concerns with dedicated folders for components, pages, hooks, and utilities. The UI is responsive and supports both light and dark themes.

### Backend Architecture
The server is built with **Express.js** and follows a RESTful API design pattern:

- **Server Framework**: Express.js with TypeScript for type safety
- **File Processing**: Multer for handling file uploads (PDF/DOCX resume files)
- **Session Management**: In-memory storage system with plans for database persistence
- **Service Layer**: Modular services for file processing, job scraping, AI integration, and resume tailoring

The backend implements a session-based workflow where users create tailoring sessions, upload resumes, analyze job postings, and generate customized resume content.

### Data Storage
**CRITICAL FIX (2025-01-16)**: Now uses **PostgreSQL database storage** with full data persistence:

- **Database ORM**: Drizzle ORM configured for PostgreSQL with Neon Database integration
- **Schema**: Comprehensive database schema for users, resume sessions, job postings, tailored resumes, and job applications
- **Migration Support**: Database migrations managed through Drizzle Kit
- **DatabaseStorage Implementation**: Complete replacement of MemStorage with DatabaseStorage class
- **Permanent Storage**: All tailored resumes, job applications, and user data are now permanently stored and survive system restarts

**Recent Fix**: Switched from MemStorage to DatabaseStorage to ensure all tailored resumes are permanently stored in the database. This resolves the critical issue where tailored resumes were being lost on system restarts.

### AI Integration
The application integrates with **OpenAI's GPT-5** for intelligent resume analysis and tailoring:

- **Contact Extraction**: Automatically extracts name, title, phone, email, city/state, and LinkedIn from uploaded resumes
- **Job Analysis**: Extracts requirements, keywords, and skills from job descriptions or URLs
- **Resume Matching**: Analyzes alignment between resume content and job requirements
- **ATS Optimization**: Generates 85-90%+ ATS-compatible content with exact keyword matching
- **Content Generation**: Creates tailored resume sections with optimized keywords, quantified achievements, and strategic content placement
- **Match Scoring**: Provides percentage-based compatibility scores

### Authentication and Authorization
The current implementation includes user schema and authentication infrastructure but authentication is not actively enforced, allowing for rapid development and testing.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for Neon Database
- **drizzle-orm**: Type-safe ORM for database operations
- **express**: Web server framework
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management

### UI and Styling
- **@radix-ui/**: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **shadcn/ui**: Pre-built component library

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production builds

### AI and Processing
- **openai**: Integration with OpenAI API for content analysis and generation
- **multer**: File upload handling for resume documents

### Database and Storage
- **drizzle-kit**: Database migration and schema management
- **connect-pg-simple**: PostgreSQL session store (prepared for implementation)