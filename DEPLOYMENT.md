# Authentication & Deployment Guide

## Overview

This guide explains how authentication works in ResumeAgent and how to configure it properly for deployment.

## Authentication Architecture

ResumeAgent uses **Passport.js** with **session-based authentication**:

1. **Session Store**: PostgreSQL (via `connect-pg-simple`)
2. **Session Cookie**: HTTP-only, secure (in production), SameSite=lax
3. **Strategy**: Local strategy (username/password)
4. **Password Hashing**: bcrypt with salt rounds

## Required Environment Variables

Create a `.env` file (see `.env.example`) with the following variables:

```bash
# Database - PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Session Secret - MUST be changed in production
# Generate with: openssl rand -base64 32
SESSION_SECRET=your-random-secure-secret-here

# Node Environment
NODE_ENV=production  # or 'development' for local

# OpenAI API Key
OPENAI_API_KEY=sk-your-api-key-here

# Port (optional, defaults to 5000)
PORT=5000
```

### Critical: Session Secret

**⚠️ SECURITY WARNING**: Always use a strong, random `SESSION_SECRET` in production!

Generate a secure secret:
```bash
openssl rand -base64 32
```

Never commit your actual `.env` file to version control!

## Deployment on Render

### Initial Setup

1. **Create PostgreSQL Database**
   - Create a new PostgreSQL database instance on Render
   - Copy the "Internal Database URL" (not External)

2. **Create Web Service**
   - Connect your GitHub repository
   - Configure environment variables (see below)

3. **Environment Variables**
   Set these in Render's dashboard:
   
   ```
   DATABASE_URL=<your-postgres-internal-url>
   SESSION_SECRET=<generate-with-openssl-rand>
   OPENAI_API_KEY=<your-openai-key>
   NODE_ENV=production
   ```

4. **Build & Deploy**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### Troubleshooting Authentication Issues

If users can't stay logged in after successful login:

1. **Check SESSION_SECRET is set** in Render environment variables
2. **Verify DATABASE_URL** uses the Internal Database URL (starts with `postgresql://`)
3. **Check Render logs** for session save errors:
   ```
   [AUTH] Session save error: ...
   ```
4. **Verify trust proxy is enabled** (should be in `server/index.ts`)

### Common Issues & Solutions

#### Issue: "401 Unauthorized" after login

**Symptoms**:
- Login appears successful
- Redirects to home page
- All API calls return 401 errors
- Browser console shows 401 errors

**Causes**:
1. Missing `trust proxy` configuration (fixed in this PR)
2. Wrong `SESSION_SECRET` or it changed between deployments
3. Database connection issues preventing session storage
4. Cookie domain mismatch

**Solutions**:
1. Ensure `app.set('trust proxy', 1)` is in `server/index.ts`
2. Keep `SESSION_SECRET` consistent across deployments
3. Check database logs for connection errors
4. Verify cookies are being set (check browser DevTools → Application → Cookies)

#### Issue: Session not persisting across restarts

**Cause**: Using in-memory session store instead of PostgreSQL

**Solution**: Ensure `connect-pg-simple` is configured correctly in `server/index.ts`:
```typescript
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    // ... other config
  })
);
```

#### Issue: Secure cookie not working

**Cause**: Not trusting proxy in production

**Solution**: Add to `server/index.ts`:
```typescript
app.set('trust proxy', 1);
```

This allows Express to trust the `X-Forwarded-Proto` header from the reverse proxy.

## Local Development

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**:
   - Create a local PostgreSQL database
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your local database URL

3. **Run migrations** (if using Drizzle):
   ```bash
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Access the app**: http://localhost:5000

### First User Registration

The first user created is automatically an admin. To register:

1. Navigate to `/login`
2. Click "Register" or go to `/register`
3. Enter username and password (min 8 characters)
4. Submit - you'll be automatically logged in

Subsequent users can only be created by admins.

## Testing Authentication

### Manual Testing Checklist

- [ ] First user registration creates admin account
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong credentials shows error
- [ ] Protected routes (e.g., `/api/sessions`) work after login
- [ ] Protected routes return 401 when not logged in
- [ ] Session persists after page refresh
- [ ] Session persists after server restart (production only)
- [ ] Logout clears session
- [ ] Multiple concurrent users can be logged in

### Using Browser DevTools

1. **Check Cookies** (Application → Cookies):
   - Look for `connect.sid` cookie
   - Verify `HttpOnly`, `Secure` (in production), `SameSite=Lax`

2. **Check Network Tab**:
   - Login request should return 200 with user data
   - Set-Cookie header should be present
   - Subsequent requests should include Cookie header

3. **Check Console**:
   - No 401 errors after successful login
   - No CORS errors

## Session Configuration Details

From `server/index.ts`:

```typescript
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,        // Prevents XSS attacks
      sameSite: "lax",       // CSRF protection
      secure: NODE_ENV === "production",  // HTTPS only in production
      maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
      path: "/",
    },
  })
);
```

### Cookie Settings Explained

- **httpOnly**: Cookie not accessible via JavaScript (prevents XSS)
- **sameSite: "lax"**: Cookie sent on same-site requests and top-level navigation
- **secure**: Cookie only sent over HTTPS (production)
- **maxAge**: Session expires after 30 days of inactivity
- **path**: Cookie valid for entire application

## Security Best Practices

1. **Never expose SESSION_SECRET**
   - Keep it in environment variables
   - Never commit to version control
   - Rotate periodically

2. **Use HTTPS in production**
   - Render provides this automatically
   - Secure cookies won't work over HTTP

3. **Keep dependencies updated**
   - Regularly run `npm audit`
   - Update security patches

4. **Password requirements**
   - Minimum 8 characters (configured in routes)
   - Stored as bcrypt hash (10 salt rounds)

## Monitoring & Debugging

### Production Logs

Enable session debugging by checking Render logs:

```
[SESSION] GET /api/sessions | SessionID: xxx | Auth: true | User: john
[AUTH] User logged in successfully. SessionID: xxx, User: john
```

### Debug Checklist

If auth issues occur in production:

1. Check Render logs for:
   - `[AUTH] Session save error`
   - `[SESSION STORE ERROR]`
   - Database connection errors

2. Verify environment variables are set correctly

3. Check database for session table:
   ```sql
   SELECT * FROM session LIMIT 5;
   ```

4. Verify session is being saved on login:
   ```
   [AUTH] User logged in successfully. SessionID: ...
   ```

## Support

For issues:
1. Check this README
2. Review Render logs
3. Check browser DevTools (Console, Network, Application tabs)
4. Verify all environment variables are set

## Changelog

### 2024-11-14: Authentication Fix
- Added `trust proxy` configuration for reverse proxy support
- Improved session logging for better debugging
- Created comprehensive deployment documentation
- Added `.env.example` for environment variable reference
