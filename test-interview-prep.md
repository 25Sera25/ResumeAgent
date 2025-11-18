# Interview Prep Hub Testing Guide

## Manual Testing Checklist

This document provides a manual testing procedure to verify the Interview Prep Hub fixes.

### Prerequisites
1. Server is running with valid `OPENAI_API_KEY` environment variable
2. User account is created and logged in
3. At least one tailored resume exists in the database (for STAR stories)

### Test 1: General Mode - Questions

**Objective**: Verify interview questions generation works without any job/skill context

**Steps**:
1. Navigate to Interview Prep Hub from main navigation (sidebar)
2. Ensure "General DBA" is selected in the focus dropdown
3. Click on "Questions & Answers" tab
4. Click "Generate Questions" button

**Expected Results**:
- ✅ No 400 errors in browser console
- ✅ Loading spinner appears briefly
- ✅ 12-15 interview questions are generated
- ✅ Questions cover technical and behavioral topics
- ✅ Each question has a suggested answer
- ✅ Behavioral questions include STAR framework examples

**Server Logs to Check**:
```
[OPENAI] API key configured (length: XX)
[INTERVIEW_PREP] Generating questions - Mode: general JobId: undefined Skill: undefined
[INTERVIEW_PREP] General mode - no specific context
[OPENAI] Generating interview prep questions with mode: general
[INTERVIEW_PREP] Successfully generated 15 questions
```

**If Error Occurs**:
- Check server logs for `[OPENAI]` and `[INTERVIEW_PREP]` prefixed messages
- Verify API key is configured: should see "API key configured (length: XX)"
- Check for detailed error with status code and OpenAI response


### Test 2: General Mode - Skills Explanations

**Objective**: Verify skill explanations use default DBA skills in general mode

**Steps**:
1. Stay on Interview Prep Hub
2. Click on "Explain These Skills" tab
3. Click "Generate Explanations" button

**Expected Results**:
- ✅ No 400 errors in browser console
- ✅ 8 default DBA skills are explained:
  - SQL Server Administration
  - High Availability & Disaster Recovery
  - Performance Tuning
  - T-SQL
  - Backup & Restore
  - Security & Compliance
  - Azure SQL Database
  - PowerShell Automation
- ✅ Each skill has three explanation levels (30s, 2min, Deep Dive)
- ✅ Each skill includes common pitfalls

**Server Logs to Check**:
```
[INTERVIEW_PREP] Generating skills - Mode: general JobId: undefined Skills: undefined
[INTERVIEW_PREP] Using default DBA skills
[OPENAI] Generating skill explanations for: SQL Server Administration, High Availability & Disaster Recovery, ...
[INTERVIEW_PREP] Successfully generated 8 skill explanations
```


### Test 3: General Mode - STAR Stories

**Objective**: Verify STAR stories generation from most recent tailored resume

**Steps**:
1. Stay on Interview Prep Hub
2. Click on "STAR Story Builder" tab
3. Click "Generate Stories" button

**Expected Results - If User Has Tailored Resumes**:
- ✅ No 400 errors in browser console
- ✅ 5-7 STAR stories are generated
- ✅ Each story has Situation, Task, Action, Result
- ✅ Both concise and extended versions are provided

**Expected Results - If User Has NO Tailored Resumes**:
- ⚠️ Error toast displays: "No resume content available. Save a tailored resume or select a specific job first."
- ✅ Error is user-friendly and actionable
- ✅ No generic 400 error

**Server Logs to Check**:
```
[INTERVIEW_PREP] Generating STAR stories - Mode: general
[INTERVIEW_PREP] Using most recent tailored resume
[OPENAI] Generating STAR stories from XX achievements
[INTERVIEW_PREP] Successfully generated 7 STAR stories
```

OR if no resume content:
```
[INTERVIEW_PREP] Generating STAR stories - Mode: general
[INTERVIEW_PREP] No resume content available
```


### Test 4: Job-Specific Mode

**Objective**: Verify job-specific context is used when jobId is provided

**Steps**:
1. Navigate to Job Tracker
2. Click "Prep for Interview" button on any job application
3. Verify URL contains `?jobId=XXX`
4. Click "Generate Questions"

**Expected Results**:
- ✅ Questions are tailored to the specific job
- ✅ Company name and job title appear in questions
- ✅ Skills from the job description are referenced

**Server Logs to Check**:
```
[INTERVIEW_PREP] Generating questions - Mode: job JobId: XXX
[INTERVIEW_PREP] Using tailored resume: XXX
```


### Test 5: Skill-Specific Mode

**Objective**: Verify skill-specific focus works

**Steps**:
1. Navigate to Skills Dashboard (Insights page)
2. Click "Prepare" button on any skill row
3. Verify URL contains `?skill=XXX`
4. Click "Generate Questions"

**Expected Results**:
- ✅ Questions focus on the specific skill
- ✅ Skill explanations focus on that skill

**Server Logs to Check**:
```
[INTERVIEW_PREP] Generating questions - Mode: skill Skill: Performance Tuning
[INTERVIEW_PREP] Skills focus: ['Performance Tuning']
```


### Test 6: Error Handling

**Objective**: Verify proper error messages are shown to users

**Steps**:
1. Temporarily set an invalid OpenAI API key in environment
2. Restart server
3. Try to generate any Interview Prep content

**Expected Results**:
- ✅ Server logs show: `[OPENAI] WARNING: OpenAI API key is not configured!`
- ✅ User sees meaningful error message (not raw JSON)
- ✅ Error toast shows: "Failed to generate interview questions. Please try again."

**Server Logs to Check**:
```
[OPENAI] WARNING: OpenAI API key is not configured! Set OPENAI_API_KEY environment variable.
[OPENAI] Error generating interview prep questions: { message: '...', status: 401, ... }
[INTERVIEW_PREP] Error generating interview questions: { message: '...', stack: '...' }
```


## Troubleshooting

### Issue: 400 Error with JSON parsing message

**Symptoms**:
- Error toast: "Unexpected token '\\', '\"' {{"model""... is not valid JSON"
- Network tab shows 400 Bad Request

**Diagnosis**:
1. Check server logs for `[OPENAI]` error details
2. Look for status code and full error response
3. Check API key configuration log on startup

**Possible Causes**:
1. Invalid OpenAI API key → Server logs will show authentication error
2. Network proxy issue → Check if requests to OpenAI are being intercepted
3. OpenAI SDK bug → Consider upgrading to latest version
4. Transient OpenAI API issue → Retry after a few minutes

**Resolution Steps**:
1. Verify `OPENAI_API_KEY` environment variable is set correctly
2. Check server startup logs for API key validation message
3. Look at detailed error logs from `[OPENAI]` prefix
4. If OpenAI reports 400, the error details will show the exact issue


### Issue: No resume content error for STAR stories

**Symptoms**:
- Error: "No resume content available. Save a tailored resume or select a specific job first."

**Resolution**:
1. Go to home page and create a tailoring session
2. Upload resume, analyze job, and tailor resume
3. Save the tailored resume to library
4. Return to Interview Prep Hub and try again


## Success Criteria

All tests pass when:
- ✅ General mode works without any jobId or skill parameters
- ✅ All three features (Questions, Skills, Stories) generate content
- ✅ No 400 errors appear in browser console
- ✅ Error messages are user-friendly and actionable
- ✅ Server logs show detailed debugging information
- ✅ API key validation occurs on startup
- ✅ Job-specific and skill-specific modes work correctly
