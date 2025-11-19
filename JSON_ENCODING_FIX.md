# JSON Double Encoding Bug Fix

## Problem Statement
The Interview Prep Hub feature was failing with a critical error:
```
{"message":"Unexpected token '\"', \"\"{\\\"mode\\\"\"... is not valid JSON"}
```

This error occurred when users clicked "Generate Questions", "Prepare Skills", or "Create STAR Stories" in the Interview Prep Hub.

## Root Cause Analysis

### What Was Happening
The application was performing **double JSON encoding**:

1. **First Encoding (Client)**: The client code in `InterviewPrep.tsx` was calling:
   ```typescript
   body: JSON.stringify(payload)  // payload becomes a JSON string
   ```

2. **Second Encoding (apiRequest)**: The `apiRequest()` utility function then called:
   ```typescript
   processedBody = JSON.stringify(body);  // String gets stringified again!
   ```

### The Result
Instead of sending valid JSON like:
```json
{"mode":"qa","context":"General DBA","skills":["SQL Server"]}
```

The server was receiving malformed nested JSON:
```json
""{\"mode\":\"qa\",\"context\":\"General DBA\",\"skills\":[\"SQL Server\"]}"
```

Notice the extra quotes and escaped characters - this is **not valid JSON**.

### Why This Failed
When the Express server tried to parse this with `express.json()` middleware, it encountered:
- An outer quote wrapping the entire payload
- Escaped inner quotes (`\"`) instead of regular quotes
- This made JSON.parse() throw: `Unexpected token '\"'`

## The Fix

### Changes Made
Modified `client/src/pages/InterviewPrep.tsx` to pass plain objects instead of stringified JSON:

**Before (WRONG ❌):**
```typescript
const response = await apiRequest('/api/interview-prep/questions', {
  method: 'POST',
  body: JSON.stringify(payload)  // Double encoding!
});
```

**After (CORRECT ✅):**
```typescript
const response = await apiRequest('/api/interview-prep/questions', {
  method: 'POST',
  body: payload  // Let apiRequest handle the stringification
});
```

### Files Changed
- `client/src/pages/InterviewPrep.tsx` (3 instances fixed)
  - Line 157: `/api/interview-prep/questions`
  - Line 195: `/api/interview-prep/skills-explanations`
  - Line 230: `/api/interview-prep/star-stories`

## How apiRequest Works

The `apiRequest()` utility in `client/src/lib/queryClient.ts` already handles JSON serialization:

```typescript
export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown | FormData;
  },
): Promise<Response> {
  const method = options?.method || 'GET';
  const body = options?.body;
  
  let headers: Record<string, string> = {};
  let processedBody: string | FormData | undefined;

  if (body instanceof FormData) {
    processedBody = body;
    // Don't set Content-Type for FormData, let browser handle it
  } else if (body) {
    headers["Content-Type"] = "application/json";
    processedBody = JSON.stringify(body);  // ⬅️ JSON encoding happens HERE
  }

  const res = await fetch(url, {
    method,
    headers,
    body: processedBody,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}
```

**Key Takeaway**: Always pass **plain objects** to `apiRequest()`, never pre-stringified JSON.

## Server-Side Verification

The server correctly expects parsed objects:

### Express Middleware
```typescript
// server/index.ts line 15
app.use(express.json());  // Parses JSON bodies into objects
```

### Route Handlers
```typescript
// server/routes.ts line 1220
app.post('/api/interview-prep/questions', requireAuth, async (req, res) => {
  const { jobId, skill, mode = 'general', skillsContext } = req.body;
  // ⬆️ Destructuring expects req.body to be an object, not a string
});
```

## How This Bug Was Identified

From the network panel in the problem statement:
```json
{"message":"Unexpected token '\"', \"\"{\\\"mode\\\"\"... is not valid JSON"}
```

The error message itself revealed the issue:
- Notice the `\"` (escaped quotes) in the preview
- The surrounding quotes: `""{...}"`
- This signature indicates a string was JSON.stringified when it was already a string

## Prevention: Best Practices

### ✅ DO: Use apiRequest with plain objects
```typescript
await apiRequest('/api/endpoint', {
  method: 'POST',
  body: { key: 'value' }
});
```

### ❌ DON'T: Stringify before passing to apiRequest
```typescript
await apiRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' })  // WRONG!
});
```

### ✅ DO: Use JSON.stringify with raw fetch
```typescript
await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })  // Required for raw fetch
});
```

## Testing the Fix

### Build Verification
```bash
npm run build
```
Result: ✅ Build successful with no errors

### Security Scan
```bash
# CodeQL Analysis
```
Result: ✅ No security vulnerabilities detected

### Manual Verification Checklist
- [ ] Deploy to Render
- [ ] Navigate to Interview Prep Hub
- [ ] Click "Generate Questions" - should work without errors
- [ ] Click "Prepare Skills" - should work without errors
- [ ] Click "Create STAR Stories" - should work without errors
- [ ] Check browser DevTools Network tab - responses should be valid JSON
- [ ] Verify no `"Unexpected token"` errors in console

## Related Code Patterns

Other files using `apiRequest()` **correctly** (no changes needed):
- `client/src/pages/FollowUps.tsx` - passes objects ✅
- `client/src/pages/home.tsx` - passes objects ✅
- `client/src/components/FollowUpQueue.tsx` - passes objects ✅

Files using raw `fetch()` **correctly** (stringification required):
- `client/src/pages/AdminUsers.tsx` - uses `JSON.stringify()` ✅
- `client/src/pages/ResumeLibrary.tsx` - uses `JSON.stringify()` ✅
- `client/src/pages/JobTracker.tsx` - uses `JSON.stringify()` ✅

## Impact

This fix resolves the complete failure of the Interview Prep Hub feature, restoring:
- ✅ Interview question generation
- ✅ Skills explanations
- ✅ STAR stories creation

## Future Prevention

To prevent this issue from recurring:

1. **Code Reviews**: Always check that `apiRequest()` receives plain objects
2. **Linting**: Consider adding an ESLint rule to detect `JSON.stringify` inside `apiRequest` calls
3. **Documentation**: Ensure team understands the difference between:
   - High-level wrappers like `apiRequest()` (pass objects)
   - Low-level `fetch()` API (requires JSON.stringify)

## References

- Problem Statement: [See issue description]
- Render Logs: Shows the error occurring in production
- Network Response: `{"message":"Unexpected token '\"', \"\"{\\\"mode\\\"\"... is not valid JSON"}`
- OpenAI SDK: Expects objects, not JSON strings (similar pattern)
