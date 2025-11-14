# Authentication Flow Diagram

This document explains how authentication works in ResumeAgent.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │   Express    │         │  PostgreSQL │
│  (Client)   │         │   Server     │         │  Database   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │  1. POST /api/auth/login                       │
       │  { username, password }                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │  2. Query user         │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │  3. Return user        │
       │                       │<───────────────────────┤
       │                       │                        │
       │                       │  4. Verify password    │
       │                       │     (bcrypt.compare)   │
       │                       │                        │
       │                       │  5. req.login()        │
       │                       │     (Passport)         │
       │                       │                        │
       │                       │  6. Save session       │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │  7. Session saved      │
       │                       │<───────────────────────┤
       │                       │                        │
       │  8. Set-Cookie header │                        │
       │     connect.sid=xxx   │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │  9. GET /api/sessions │                        │
       │     Cookie: connect.sid=xxx                    │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │ 10. Load session       │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │ 11. Return session     │
       │                       │<───────────────────────┤
       │                       │                        │
       │                       │ 12. Deserialize user   │
       │                       │     (req.user set)     │
       │                       │                        │
       │ 13. Protected data    │                        │
       │<──────────────────────┤                        │
       │                       │                        │
```

## Key Components

### 1. Client (Browser)
- Sends credentials via POST to `/api/auth/login`
- Stores session cookie (`connect.sid`) automatically
- Includes cookie in all subsequent requests (`credentials: "include"`)
- Redirects to login page if 401 received

### 2. Express Server

#### Middleware Stack (in order):
1. **Trust Proxy** (`app.set('trust proxy', 1)`)
   - Trusts `X-Forwarded-Proto` header from Render
   - Enables secure cookies over HTTPS

2. **Session Middleware** (`express-session`)
   - Loads session from PostgreSQL
   - Creates session cookie if not exists
   - Makes session available as `req.session`

3. **Passport Initialize** (`passport.initialize()`)
   - Sets up Passport authentication

4. **Passport Session** (`passport.session()`)
   - Deserializes user from session
   - Sets `req.user` if authenticated

5. **Debug Logging** (production only)
   - Logs session state for troubleshooting

6. **Route Handlers**
   - `requireAuth` middleware checks `req.isAuthenticated()`
   - Protected routes return 401 if not authenticated

### 3. PostgreSQL Database

#### Session Table
Automatically created by `connect-pg-simple`:
```sql
CREATE TABLE session (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);
```

#### Users Table
From `shared/schema.ts`:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hash
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Authentication Flow Details

### Login Process

1. **Client submits credentials**
   ```typescript
   await fetch('/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username, password }),
     credentials: 'include'  // Critical!
   });
   ```

2. **Server validates credentials**
   ```typescript
   passport.authenticate('local', (err, user, info) => {
     // Validate user exists
     // Compare password with bcrypt
     // If valid, continue to step 3
   });
   ```

3. **Passport creates session**
   ```typescript
   req.login(user, (err) => {
     // Serializes user.id to session
     // Saves to PostgreSQL via session store
   });
   ```

4. **Server forces session save**
   ```typescript
   req.session.save((saveErr) => {
     // Ensures session written to DB before response
     // Prevents race condition where cookie sent but session not saved
   });
   ```

5. **Server sends cookie**
   ```http
   Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; Secure; SameSite=Lax
   ```

6. **Client stores cookie**
   - Browser automatically stores cookie
   - Includes in all future requests to same origin

### Subsequent Requests

1. **Client sends request with cookie**
   ```http
   GET /api/sessions
   Cookie: connect.sid=s%3A...
   ```

2. **Session middleware loads session**
   ```typescript
   // Automatically loads session from PostgreSQL
   // Decrypts session using SESSION_SECRET
   // Available as req.session
   ```

3. **Passport deserializes user**
   ```typescript
   passport.deserializeUser(async (id: string, done) => {
     const user = await storage.getUser(id);
     done(null, user);  // Sets req.user
   });
   ```

4. **requireAuth checks authentication**
   ```typescript
   export function requireAuth(req, res, next) {
     if (req.isAuthenticated()) {
       return next();  // req.user is available
     }
     res.status(401).json({ error: "Unauthorized. Please log in." });
   }
   ```

## Cookie Configuration

```typescript
cookie: {
  httpOnly: true,       // JavaScript can't access (XSS protection)
  sameSite: "lax",      // Sent on same-site requests + top-level navigation
  secure: NODE_ENV === "production",  // HTTPS only in production
  maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
  path: "/",            // Valid for entire site
}
```

### Why each setting matters:

- **httpOnly**: Prevents XSS attacks from stealing session cookie
- **sameSite: "lax"**: Prevents CSRF while allowing normal navigation
- **secure**: Ensures cookie only sent over HTTPS (production)
- **maxAge**: Session expires after 30 days of inactivity
- **path**: Cookie sent to all routes

## Trust Proxy Explained

### The Problem (Before Fix)

```
Client (HTTPS) ──> Render Proxy (HTTPS) ──> Express App (thinks it's HTTP)
                   ↓
                   X-Forwarded-Proto: https
```

Without `trust proxy`, Express sees the connection as HTTP because the proxy terminates SSL. This causes:
- `secure: true` cookies not sent (Express thinks connection is HTTP)
- Session cookies don't work in production

### The Solution (After Fix)

```typescript
app.set('trust proxy', 1);
```

Now Express trusts the `X-Forwarded-Proto` header:
```
Client (HTTPS) ──> Render Proxy ──> Express App (trusts X-Forwarded-Proto)
                   X-Forwarded-Proto: https ✓
```

Express correctly recognizes HTTPS and sends secure cookies.

## Security Measures

1. **Password Hashing**
   - bcrypt with 10 salt rounds
   - Passwords never stored in plain text

2. **Session Security**
   - Sessions stored server-side (PostgreSQL)
   - Only session ID stored in cookie
   - Session ID encrypted with SESSION_SECRET

3. **Cookie Security**
   - HttpOnly prevents XSS
   - Secure ensures HTTPS only
   - SameSite prevents CSRF

4. **HTTPS Enforcement**
   - Render provides automatic HTTPS
   - Secure cookies only work over HTTPS

## Troubleshooting

### Problem: Login succeeds but 401 errors on next request

**Cause**: Cookie not being sent or recognized

**Check**:
1. DevTools → Application → Cookies
   - Is `connect.sid` cookie present?
   - Is it `HttpOnly`, `Secure`, `SameSite=Lax`?

2. Network Tab → Request Headers
   - Does request include `Cookie: connect.sid=...`?

3. Server logs
   ```
   [SESSION] GET /api/sessions | SessionID: none | Auth: false
   ```
   If SessionID is "none", cookie not reaching server.

**Solutions**:
- Verify `trust proxy` is set
- Check `SESSION_SECRET` is consistent
- Ensure `credentials: "include"` on fetch

### Problem: Session lost after server restart

**Cause**: Using in-memory session store

**Solution**: Use PostgreSQL session store (already configured in this repo)

### Problem: "Session save error" in logs

**Cause**: Database connection issue

**Check**:
- DATABASE_URL is correct
- Database is accessible
- Session table exists

## Environment Variables

Required for authentication:

```bash
# Session encryption key - MUST be random and secret
SESSION_SECRET=generate-with-openssl-rand-base64-32

# Database connection
DATABASE_URL=postgresql://user:pass@host:port/db

# Node environment (affects cookie security)
NODE_ENV=production
```

Generate secure SESSION_SECRET:
```bash
openssl rand -base64 32
```

## References

- [Express Session](https://github.com/expressjs/session)
- [Passport.js](http://www.passportjs.org/)
- [connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple)
- [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html)
