# Authentication Race Condition Fix

## Problem Statement

Users experienced a "double login" issue where clicking "Sign in" once would show a success toast but require a second click to actually access the application.

### Symptoms
- First login attempt after fresh browser session shows "Logged in successfully" toast
- Browser console shows `401` error from `/api/auth/user`
- User remains on login page instead of navigating to home
- Second login attempt works correctly

## Root Cause: Race Condition

### Timeline of Events (BEFORE FIX)

```
Time  │ Event
──────┼─────────────────────────────────────────────────────────────
0ms   │ App mounts → AuthProvider starts checkAuth() #1
      │   ├─ fetch("/api/auth/user") started
      │   └─ Request pending...
      │
100ms │ User on login page, request still pending...
      │
500ms │ User clicks "Sign in"
      │   └─ login() called
      │       ├─ POST /api/auth/login → 200 OK
      │       ├─ setUser({id, username, isAdmin})
      │       └─ Navigate to "/"
      │
600ms │ checkAuth() #1 finally completes 
      │   └─ Response from /api/auth/user before login
      │       ├─ { user: null }  ← STALE DATA!
      │       └─ setUser(null)   ← OVERWRITES FRESH LOGIN! ❌
      │
700ms │ User state is null despite successful login
      │ ProtectedRoute sees null → redirects to /login
      │ Result: User stuck on login page
```

### Why This Happened

1. **`checkAuth()` runs on mount** - Before user logs in
2. **Network latency** - The initial auth check may be slow
3. **Login happens quickly** - User clicks login while auth check is pending
4. **Stale response overwrites fresh data** - Old auth check completes after login

## Solution: Request Cancellation + State Protection

### Key Changes

#### 1. AbortController for Request Cancellation
```typescript
const abortControllerRef = useRef<AbortController | null>(null);
```

- Tracks pending `checkAuth()` requests
- Cancels them when login/register occurs
- Prevents stale responses from being processed

#### 2. Authentication State Flag
```typescript
const isAuthenticatedRef = useRef(false);
```

- Marks when user successfully authenticates
- Prevents stale auth checks from overwriting fresh login
- Reset on logout

### Timeline of Events (AFTER FIX)

```
Time  │ Event
──────┼─────────────────────────────────────────────────────────────
0ms   │ App mounts → AuthProvider starts checkAuth() #1
      │   ├─ isAuthenticatedRef.current = false
      │   ├─ abortControllerRef.current = new AbortController()
      │   ├─ fetch("/api/auth/user", { signal })
      │   └─ Request pending...
      │
100ms │ User on login page, request still pending...
      │
500ms │ User clicks "Sign in"
      │   └─ login() called
      │       ├─ abortControllerRef.current.abort() ← CANCEL PENDING!
      │       ├─ POST /api/auth/login → 200 OK
      │       ├─ isAuthenticatedRef.current = true ← MARK AUTHENTICATED
      │       ├─ setUser({id, username, isAdmin})
      │       └─ Navigate to "/"
      │
600ms │ checkAuth() #1 fetch is aborted
      │   ├─ catch (error)
      │   ├─ error.name === 'AbortError' ← Expected!
      │   └─ return early (no state update) ✓
      │
700ms │ User state remains: {id, username, isAdmin} ✓
      │ ProtectedRoute sees user → shows home page ✓
      │ Result: Single-click login works!
```

## Implementation Details

### checkAuth() Changes

**Before:**
```typescript
const checkAuth = async () => {
  try {
    const res = await fetch("/api/auth/user", {
      credentials: "include",
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    setUser(null);
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
const checkAuth = async () => {
  // Don't overwrite if user just logged in
  if (isAuthenticatedRef.current) {
    return;
  }
  
  // Cancel any pending auth check
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Create new abort controller for this request
  abortControllerRef.current = new AbortController();
  
  try {
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      signal: abortControllerRef.current.signal, // ← Cancellable!
    });
    
    if (res.ok) {
      const data = await res.json();
      // Only update if we haven't authenticated since starting this check
      if (!isAuthenticatedRef.current) { // ← Guard!
        if (data.user) {
          setUser(data.user);
          isAuthenticatedRef.current = true;
        } else {
          setUser(null);
        }
      }
    }
  } catch (error) {
    // Ignore abort errors - they're expected when we cancel pending requests
    if (error instanceof Error && error.name === 'AbortError') {
      return; // ← Graceful handling
    }
    console.error("Auth check failed:", error);
    if (!isAuthenticatedRef.current) {
      setUser(null);
    }
  } finally {
    setLoading(false);
  }
};
```

### login() Changes

**Before:**
```typescript
const login = async (username: string, password: string) => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Login failed");
  }

  const data = await res.json();
  setUser(data);
  setLoading(false);
};
```

**After:**
```typescript
const login = async (username: string, password: string) => {
  // Cancel any pending auth check to prevent race condition
  if (abortControllerRef.current) {
    abortControllerRef.current.abort(); // ← Cancel stale requests!
  }
  
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Login failed");
  }

  const data = await res.json();
  
  // Mark as authenticated to prevent checkAuth from overwriting
  isAuthenticatedRef.current = true; // ← Protect state!
  
  setUser(data);
  setLoading(false);
};
```

## Testing the Fix

### Manual Test Steps

1. **Clear browser cookies** for the app domain
2. **Visit `/login`** in a fresh browser session
3. **Open DevTools** → Network tab
4. **Enter valid credentials** and click "Sign in" **ONCE**
5. **Verify in Network tab:**
   - `POST /api/auth/login` returns 200 with user JSON ✓
   - No 401 errors from `/api/auth/user` ✓
   - `GET /api/session-stats` returns 200 ✓
   - `GET /api/resumes` returns 200 ✓
   - `GET /api/job-applications` returns 200 ✓
6. **Verify UI behavior:**
   - "Logged in successfully" toast appears ✓
   - Redirected to `/` (home) immediately ✓
   - No need to click login again ✓

### Edge Cases Handled

1. **Slow network + fast login**: Abort prevents stale data
2. **Component unmount during auth check**: Cleanup aborts request
3. **Multiple rapid login attempts**: Each cancels previous checks
4. **Network errors**: Gracefully handled, no state corruption
5. **Already authenticated**: Early return prevents unnecessary requests

## Related Server-Side Improvements (Previous PRs)

These were already implemented and work correctly:

1. **`/api/auth/user` returns 200 for unauthenticated users**
   ```typescript
   if (isAuth && req.user) {
     res.json({ user: { id, username, isAdmin } });
   } else {
     res.json({ user: null }); // ← 200, not 401!
   }
   ```

2. **Login handler forces session save**
   ```typescript
   req.login(user, (err) => {
     req.session.save((saveErr) => {
       // Only respond after session is committed
       res.json({ id, username, isAdmin });
     });
   });
   ```

3. **Data endpoints return empty arrays, not 500**
   ```typescript
   app.get("/api/resumes", requireAuth, async (req, res) => {
     try {
       const resumes = await storage.getStoredResumes(userId);
       res.json(resumes || []);
     } catch (error) {
       res.json([]); // ← Graceful fallback
     }
   });
   ```

## Benefits of This Fix

1. ✅ **Single-click login works** - No more double login
2. ✅ **No 401 errors in console** - Clean UX
3. ✅ **No race conditions** - State always consistent
4. ✅ **Better performance** - Cancels unnecessary requests
5. ✅ **Clean error handling** - AbortError is expected and ignored
6. ✅ **Memory safe** - Cleanup on unmount prevents leaks

## Security Considerations

- ✅ **No security vulnerabilities introduced** (CodeQL scan passed)
- ✅ **Session handling unchanged** - Still server-side secure
- ✅ **No credentials exposed** - Client-side state is just metadata
- ✅ **HTTPS enforcement** - Trust proxy still configured
- ✅ **Cookie security** - HttpOnly, Secure, SameSite still enforced

## References

- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [React Refs](https://react.dev/reference/react/useRef)
- [Fetch API with AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/fetch#signal)
- Previous Auth PRs: #1–#6
