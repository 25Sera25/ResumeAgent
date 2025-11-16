# Deployment Instructions for Bug Fixes

## Overview
This document provides step-by-step instructions for deploying the bug fixes to production.

## Pre-Deployment Checklist

- [x] Code changes reviewed and tested
- [x] TypeScript compilation passes
- [x] Build succeeds
- [x] Security scan (CodeQL) passes with 0 alerts
- [ ] Database backup created
- [ ] Migration tested in staging environment

## Deployment Steps

### 1. Create Database Backup
Before applying any migrations, create a backup of the production database:

```bash
# For PostgreSQL
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Deploy Application Code
```bash
# Pull the latest changes
git checkout copilot/fix-production-blocking-bugs
git pull origin copilot/fix-production-blocking-bugs

# Install dependencies (if needed)
npm install

# Build the application
npm run build
```

### 3. Apply Database Migration
```bash
# Set environment variable
export DATABASE_URL="postgresql://..."

# Run migration
npm run db:migrate
```

Expected output:
```
Migration 0000_add_interview_prep_column applied
Migration 0001_add_tailored_resumes_columns applied
```

### 4. Restart Application
```bash
# For development
npm run dev

# For production
npm start
```

### 5. Verify Deployment

#### Test Save Functionality
1. Log in to the application
2. Create a new resume tailoring session
3. Upload a resume
4. Paste a job description
5. Click "Analyze Job"
6. Click "Tailor Resume"
7. Click "Save to Library"
8. **Expected**: Success message, no 500 errors
9. **Check server logs**: Look for `[SAVE]` messages

#### Test Download Functionality
1. Go to Resume Library
2. Find the saved resume
3. Click download (PDF or DOCX)
4. **Expected**: File downloads with meaningful name (e.g., "FirstName_DBA_Company.pdf")
5. **Check server logs**: Look for `[DOWNLOAD]` messages

#### Test Follow-Ups Page
1. Click "Follow-Ups" in navigation
2. **Expected**: Page loads successfully
3. **Expected**: Shows pending follow-ups if any exist
4. **Expected**: Badge shows count in navigation

### 6. Monitor for Errors

Watch the application logs for any errors:

```bash
# If using PM2
pm2 logs

# If using systemd
journalctl -u your-service -f

# If using Docker
docker logs -f container-name
```

Look for:
- `[SAVE]` log messages when users save resumes
- `[DOWNLOAD]` log messages when users download resumes
- Any 500 errors
- Database connection errors

## Rollback Plan

If issues are encountered:

### 1. Revert Application Code
```bash
git checkout <previous-commit-hash>
npm run build
# Restart application
```

### 2. Revert Database Changes (if needed)
The migration is designed to be safe and only adds columns. However, if you need to remove them:

```sql
-- Only run if absolutely necessary
ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS micro_edits;
ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS ai_improvements;
ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS response_received;
ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS response_date;
ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS source;
ALTER TABLE tailored_resumes DROP COLUMN IF EXISTS referral;
```

### 3. Restore from Backup (last resort)
```bash
# For PostgreSQL
psql -h <host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql
```

## Post-Deployment Monitoring

Monitor these metrics for 24-48 hours:
- Error rate (should decrease)
- Save operation success rate (should be near 100%)
- Download success rate (should be near 100%)
- User feedback/support tickets
- Server logs for any new errors

## Troubleshooting

### Issue: Migration fails
**Symptoms**: Error when running `npm run db:migrate`

**Solution**:
1. Check DATABASE_URL is correct
2. Verify database connection
3. Check database user has ALTER TABLE permissions
4. Review migration file for syntax errors

### Issue: Save still returns 500 errors
**Symptoms**: Users still get errors when saving

**Solution**:
1. Check server logs for `[SAVE]` messages
2. Verify migration was applied: 
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'tailored_resumes' 
   ORDER BY column_name;
   ```
3. Check for other database issues (connections, permissions)

### Issue: Filenames still generic
**Symptoms**: Downloads still have "tailored_resume.pdf" name

**Solution**:
1. Check server logs for `[DOWNLOAD]` messages
2. Verify `resume.filename` is stored in database
3. Check if filename transformation is working (logs show "Using stored filename: X -> Y")

## Success Criteria

Deployment is successful when:
- [x] Migration applied without errors
- [x] Application starts without errors
- [ ] Users can save resumes to library
- [ ] Downloads have meaningful filenames
- [ ] No 500 errors in logs
- [ ] Follow-Ups page loads correctly

## Support

If you encounter any issues:
1. Check server logs first
2. Review this deployment guide
3. Consult BUG_FIXES_SUMMARY.md for technical details
4. Create a GitHub issue if problems persist

## Contact
For urgent issues during deployment, contact the development team.
