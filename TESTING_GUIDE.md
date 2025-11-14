# Manual Testing Guide for Auth Race Condition Fix

## Prerequisites
- Access to the ResumeAgent application
- Browser DevTools (Chrome, Firefox, or Edge)
- Test user credentials

## Test Environment Setup

### 1. Simulate Slow Network
Using Chrome DevTools:
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Network tab
3. Select "Slow 3G" from the throttling dropdown
4. Keep DevTools open during testing

### 2. Clear Browser State
Before each test:
1. Clear all cookies for the domain
2. Clear localStorage
3. Do a hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
4. Or use Incognito/Private browsing mode

## Test Cases

### Test 1: Login with Slow Network (Primary Race Condition Test)

**Objective:** Verify that login works correctly when checkAuth is still pending

**Steps:**
1. Clear browser state
2. Enable "Slow 3G" network throttling
3. Navigate to login page
4. Wait 2 seconds (let checkAuth start)
5. Enter credentials quickly
6. Click "Sign in" button ONCE
7. Wait for redirect

**Expected Results:**
- ✅ Single click on login button
- ✅ "Logging in..." or loading state shown briefly
- ✅ Redirect to home page (/)
- ✅ No 401 errors in browser console
- ✅ Home page loads successfully with user data
- ✅ All API calls return 200 OK
- ✅ User avatar/name displayed in header
- ✅ Protected routes accessible

**What to Check in DevTools:**
- Network tab: 
  - `/api/auth/user` request may be shown as "canceled" (expected)
  - `/api/auth/login` returns 200 OK
  - Subsequent API calls (like `/api/sessions`) return 200 OK
- Console tab:
  - No 401 Unauthorized errors
  - No 500 Server errors
  - No JavaScript errors
- Application tab → Cookies:
  - `connect.sid` cookie present
  - Cookie has HttpOnly, Secure, SameSite=Lax flags

**Failure Indicators:**
- ❌ Need to click login twice
- ❌ Redirect happens but then redirected back to login
- ❌ 401 errors after "successful" login
- ❌ API calls fail after login

### Test 2: Login with Fast Network

**Objective:** Verify normal login flow when checkAuth completes quickly

**Steps:**
1. Clear browser state
2. Disable network throttling (use "No throttling")
3. Navigate to login page
4. Wait 1 second
5. Enter credentials
6. Click "Sign in" button

**Expected Results:**
- ✅ Immediate login
- ✅ Redirect to home page
- ✅ No errors
- ✅ All protected routes work

### Test 3: Rapid Login Clicks

**Objective:** Verify deduplication prevents duplicate login requests

**Steps:**
1. Clear browser state
2. Enable "Slow 3G" network
3. Navigate to login page
4. Enter credentials
5. Click "Sign in" multiple times rapidly (3-5 clicks)

**Expected Results:**
- ✅ Only one login request sent (check Network tab)
- ✅ Button disabled after first click
- ✅ Single successful login
- ✅ No duplicate session creation

### Test 4: Page Refresh After Login

**Objective:** Verify checkAuth works correctly for returning users

**Steps:**
1. Log in successfully
2. Refresh the page (F5)
3. Observe the loading behavior

**Expected Results:**
- ✅ Brief loading spinner
- ✅ User remains authenticated
- ✅ No redirect to login page
- ✅ Protected routes accessible
- ✅ Session persists

### Test 5: Logout and Re-login

**Objective:** Verify complete auth flow with logout

**Steps:**
1. Log in successfully
2. Navigate to a protected route
3. Click logout
4. Verify redirect to login page
5. Log in again

**Expected Results:**
- ✅ Logout clears user state
- ✅ Redirect to login page
- ✅ Second login works on first attempt
- ✅ No stale state issues

### Test 6: Multiple Tabs

**Objective:** Verify auth state consistency across tabs

**Steps:**
1. Open two tabs of the application
2. Log in on Tab 1
3. Refresh Tab 2

**Expected Results:**
- ✅ Tab 1: Logged in successfully
- ✅ Tab 2: Shows logged-in state after refresh
- ✅ Both tabs show same user data
- ✅ Session shared across tabs

### Test 7: Network Error During Login

**Objective:** Verify error handling for network failures

**Steps:**
1. Clear browser state
2. Open DevTools → Network tab
3. Enable "Offline" network throttling
4. Navigate to login page
5. Try to log in

**Expected Results:**
- ✅ Error message shown to user
- ✅ No crash or unhandled errors
- ✅ Can retry after re-enabling network
- ✅ User state remains null

### Test 8: Session Expiration

**Objective:** Verify handling of expired sessions

**Steps:**
1. Log in successfully
2. Manually delete the `connect.sid` cookie in DevTools
3. Try to access a protected route
4. Navigate to any page

**Expected Results:**
- ✅ Redirect to login page
- ✅ No JavaScript errors
- ✅ Can log in again successfully

## DevTools Inspection Checklist

### Network Tab
- [ ] `/api/auth/user` - Initial auth check
  - May be canceled (status: "canceled") - this is GOOD
  - Or completes with 200 OK (no user) or 401
- [ ] `/api/auth/login` - Login request
  - Should return 200 OK
  - Response body contains user object
- [ ] Subsequent API calls after login
  - All return 200 OK
  - Include `Cookie: connect.sid=...` in request headers

### Console Tab
- [ ] No uncaught errors
- [ ] No 401 Unauthorized errors
- [ ] Only expected logs (if any)
- [ ] May see "Auth check failed: AbortError" - this is EXPECTED

### Application Tab
- [ ] Cookies → `connect.sid`
  - Present after successful login
  - Has correct flags:
    - ✅ HttpOnly
    - ✅ Secure (in production)
    - ✅ SameSite: Lax
  - Has expiration date (30 days from now)

## Performance Checklist

- [ ] Login completes in reasonable time (< 3 seconds)
- [ ] No visible UI glitches
- [ ] Smooth transition from login to home page
- [ ] Loading states shown appropriately

## Error Messages

### Expected (Good)
- Login form validation errors (empty fields)
- "Invalid credentials" (wrong password)
- Network error messages (when offline)

### Unexpected (Bad)
- "User is not logged in" after successful login
- Multiple login prompts
- JavaScript errors in console
- 401 errors after login

## Monitoring Production

After deploying to production, monitor for:

### Success Metrics
- Login success rate > 95%
- First-login failure rate < 5%
- Average login time < 2 seconds
- Session persistence rate > 99%

### Error Metrics
- 401 errors after login < 1%
- Client-side errors < 0.1%
- Session creation failures < 0.5%

### Logs to Watch
```
[AUTH] User logged in successfully
[SESSION] GET /api/sessions | Auth: true
```

## Rollback Criteria

Consider rolling back if:
- ❌ Login failure rate > 10%
- ❌ Increase in 401 errors after login
- ❌ Users reporting "double login" issue
- ❌ Session persistence issues
- ❌ Client-side JavaScript errors

## Success Criteria

The fix is successful when:
- ✅ Single login click works on slow networks
- ✅ No 401 errors after successful login
- ✅ checkAuth can be safely aborted
- ✅ State remains consistent
- ✅ No regression in existing auth flow
- ✅ All test cases pass

## Additional Notes

### Browser Compatibility
Tested on:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

### Known Limitations
None - the AbortController API is well-supported in all modern browsers.

### Future Monitoring
Set up error tracking (e.g., Sentry) to monitor:
- AbortError exceptions (should be rare)
- Login failures
- 401 errors after successful auth
- State inconsistencies
