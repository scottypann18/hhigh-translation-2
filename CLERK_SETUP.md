# Clerk Authentication Setup Guide

This guide will walk you through setting up Clerk authentication for the IDML Translation Tool.

## Quick Start

### 1. Get Your Clerk API Keys

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up or log in to your account
3. Create a new application (or select an existing one)
4. Navigate to **API Keys** in the sidebar
5. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
6. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Optional: Restrict access to specific user IDs
# Leave empty to allow all authenticated users
ALLOWED_USER_IDS=
```

### 3. Configure Clerk Dashboard

In your Clerk Dashboard:

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Enable the authentication methods you want (email, Google, GitHub, etc.)
3. Go to **User & Authentication** → **Sign up**
4. Configure sign-up options as needed
5. Go to **Paths** and note your sign-in/sign-up URLs (defaults work fine)

### 4. Deploy and Test

1. Build your application:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open `http://localhost:3000` in your browser
4. You should see a sign-in page
5. Sign up for a new account or sign in

## How It Works

### Frontend (Public)

- **index.html**: Includes Clerk SDK and shows sign-in UI when not authenticated
- **script.js**: Initializes Clerk, manages auth state, and includes session tokens in API calls
- **style.css**: Styles for auth UI components

### Backend (Server)

- **src/server.ts**: Main Express server with Clerk middleware
- **src/middleware/auth.ts**: Custom authentication middleware
  - `requireAuth`: Protects routes (401 if not authenticated)
  - `optionalAuth`: Makes auth optional for certain routes

### Protected Routes

The following API endpoints require authentication:
- `POST /api/analyze` - Analyze IDML files
- `POST /api/submit` - Submit files for translation

### Public Routes

- `GET /api/config` - Get Clerk publishable key
- `GET /api/health` - Health check
- `GET /` - Static files (HTML, CSS, JS)

## User Management

### Allow All Authenticated Users

Leave `ALLOWED_USER_IDS` empty or remove it from `.env`:

```bash
ALLOWED_USER_IDS=
```

### Restrict to Specific Users

Set `ALLOWED_USER_IDS` to a comma-separated list of Clerk user IDs:

```bash
ALLOWED_USER_IDS=user_2abc123,user_2xyz789,user_2def456
```

To find a user's ID:
1. Go to Clerk Dashboard → **Users**
2. Click on a user
3. Copy their User ID (starts with `user_`)

## Customization

### Change Authentication Methods

In Clerk Dashboard:
1. Go to **User & Authentication**
2. Enable/disable methods:
   - Email/Password
   - Email Link (passwordless)
   - Google OAuth
   - GitHub OAuth
   - And many more...

### Customize Sign-In UI

Clerk provides a fully customizable UI. In Dashboard:
1. Go to **Customization** → **Theme**
2. Customize colors, logos, and branding

### Add Email Verification

In Clerk Dashboard:
1. Go to **User & Authentication** → **Email**
2. Enable "Require verification"

## Development vs Production

### Development (Testing)

Use test keys (start with `pk_test_` and `sk_test_`):
- Free tier
- Test mode only
- Users created in test mode won't be in production

### Production (Live)

Use live keys (start with `pk_live_` and `sk_live_`):
- Requires paid plan (starts at $25/month for 10k MAU)
- Real users
- Production-ready infrastructure

## Security Best Practices

1. **Never commit API keys**: Keep `.env` out of version control
2. **Use environment variables**: Different keys for dev/staging/prod
3. **Restrict user access**: Use `ALLOWED_USER_IDS` if needed
4. **Enable MFA**: Configure in Clerk Dashboard for extra security
5. **Monitor usage**: Check Clerk Dashboard for suspicious activity

## Troubleshooting

### "Invalid session" errors

- Make sure `CLERK_SECRET_KEY` is set correctly
- Check that the Clerk SDK is loaded in the frontend
- Verify the session token is being sent in the `Authorization` header

### Sign-in page not showing

- Check browser console for JavaScript errors
- Verify `CLERK_PUBLISHABLE_KEY` is set in `.env`
- Make sure `/api/config` endpoint returns the publishable key

### "Forbidden" error after sign-in

- If using `ALLOWED_USER_IDS`, make sure your user ID is in the list
- Check server logs for authentication errors

### Clerk SDK not loading

- Check your internet connection
- Try using a different CDN or install `@clerk/clerk-js` as an npm package

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Express SDK](https://clerk.com/docs/references/nodejs/overview)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview) (if you want to add React)
- [Clerk Support](https://clerk.com/support)

## Migration from No Auth

If you have existing users without authentication:

1. Deploy with Clerk enabled
2. Existing functionality still works (no breaking changes)
3. All users will be prompted to sign in/up on first visit
4. No data migration needed (authentication is separate)

## Cost Estimate

Clerk pricing (as of 2025):
- **Development**: Free (test mode)
- **Production**: 
  - $25/month for up to 10,000 monthly active users (MAU)
  - $99/month for up to 100,000 MAU
  - Enterprise plans available

Visit [https://clerk.com/pricing](https://clerk.com/pricing) for current pricing.
