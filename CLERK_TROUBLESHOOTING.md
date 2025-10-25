# Clerk Authentication Troubleshooting

## Common Issues and Solutions

### Issue: "Infinite redirect loop" Error

**Symptoms:**
- Browser console shows: "Refreshing the session token resulted in an infinite redirect loop"
- Sign-in button doesn't appear
- Just see "Authentication Required" text

**Solutions:**

1. **Check Your Clerk Keys Match**
   ```bash
   # In your .env file, make sure you're using keys from the SAME Clerk application
   CLERK_PUBLISHABLE_KEY=pk_test_xxxxx  # From Clerk Dashboard → API Keys
   CLERK_SECRET_KEY=sk_test_xxxxx       # From Clerk Dashboard → API Keys
   ```

2. **Verify Keys Are From Same Environment**
   - Don't mix test and production keys
   - Both keys should start with `pk_test_` and `sk_test_` OR `pk_live_` and `sk_live_`

3. **Check Clerk Dashboard Settings**
   - Go to https://dashboard.clerk.com
   - Select your application
   - Go to **Domains** → Ensure your localhost (or production domain) is added
   - For local development: `http://localhost:3000` should work automatically

### Issue: Sign-In Button Not Appearing

**Symptoms:**
- See "Authentication Required" page
- No sign-in form/button visible

**Solutions:**

1. **Check Browser Console**
   ```
   Open DevTools (F12) → Console tab
   Look for errors related to Clerk SDK loading
   ```

2. **Verify Clerk SDK Loaded**
   - Check that `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest` is loading
   - Try opening the script URL directly in browser
   - If blocked, check firewall/ad blocker

3. **Clear Browser Cache**
   ```
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear cache completely in browser settings
   ```

### Issue: "Not Authenticated" When Making API Calls

**Symptoms:**
- Can sign in successfully
- See user button/menu
- But API calls return 401 Unauthorized

**Solutions:**

1. **Check Cookies Are Enabled**
   - Clerk uses cookies for session management
   - Ensure browser allows cookies for localhost

2. **Verify clerkMiddleware Is Running**
   - Check server logs for Clerk middleware initialization
   - Restart server after changing .env

3. **Test Config Endpoint**
   ```bash
   curl http://localhost:3000/api/config
   # Should return: {"clerkPublishableKey":"pk_test_..."}
   ```

### Issue: "Forbidden" Error After Sign-In

**Symptoms:**
- Can sign in successfully
- API calls return 403 Forbidden

**Solutions:**

1. **Check ALLOWED_USER_IDS**
   ```bash
   # In .env file:
   # Option 1: Allow ALL authenticated users (recommended for testing)
   ALLOWED_USER_IDS=
   
   # Option 2: Restrict to specific users
   ALLOWED_USER_IDS=user_2abc123,user_2xyz789
   ```

2. **Find Your User ID**
   - Go to Clerk Dashboard → **Users**
   - Click on your user account
   - Copy the User ID (starts with `user_`)
   - Add it to ALLOWED_USER_IDS

### Issue: Changes Not Taking Effect

**Solutions:**

1. **Restart Server After .env Changes**
   ```bash
   # Stop server (Ctrl+C)
   npm run build
   npm start
   ```

2. **Clear Browser Cache and Cookies**
   - Especially important after changing Clerk keys
   - Sign out → Clear cache → Sign in again

## Testing Your Setup

### Quick Test Checklist

1. **Environment Variables Set?**
   ```bash
   cat .env | grep CLERK
   # Should show both CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
   ```

2. **Server Running?**
   ```bash
   npm start
   # Should show: "🚀 IDML Translation Frontend"
   # Should NOT show any Clerk errors
   ```

3. **Config Endpoint Working?**
   ```bash
   curl http://localhost:3000/api/config
   # Should return your publishable key
   ```

4. **Frontend Loading?**
   - Open http://localhost:3000
   - Should see either:
     - Sign-in form (if not logged in)
     - OR main app (if already logged in)

5. **Can Sign In?**
   - Create a test account
   - Should redirect to main app after sign-in

6. **Can Make API Calls?**
   - Try analyzing a file
   - Should NOT get 401/403 errors

## Still Having Issues?

### Enable Debug Logging

1. **Add to your server.ts** (temporarily):
   ```typescript
   // After clerkMiddleware()
   app.use((req, res, next) => {
     console.log('Auth state:', req.auth);
     next();
   });
   ```

2. **Check browser console** for Clerk errors

3. **Check server logs** for authentication errors

### Get Help

1. **Clerk Support**
   - https://clerk.com/support
   - Check Clerk's Discord community

2. **Check Clerk Status**
   - https://status.clerk.com
   - Verify no outages

3. **Verify Clerk Dashboard Settings**
   - Application → Settings
   - Ensure no IP restrictions
   - Check allowed domains

## Best Practices

1. **Development:** Always use test keys (`pk_test_`, `sk_test_`)
2. **Production:** Use live keys and set up proper domain
3. **Security:** Never commit `.env` to git
4. **Testing:** Create multiple test accounts to verify access controls
5. **Monitoring:** Check Clerk Dashboard → Analytics for user activity
