# CinePurr — Security Notes

---

## Secret Management

### Rules
- **Never commit `.env` files** — `.gitignore` covers `.env`, `.env.local`, `.env.production`
- **Never put real keys in documentation** — use `your_key_here` placeholders
- **Rotate any secret that has ever been committed** — git history is public if the repo is public
- All secrets live in platform environment variables (Railway, Vercel, Render dashboard)

### Generating a Secure NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Update the platform env var and redeploy. Users will be signed out and need to log back in.

---

## Authentication Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt (`bcryptjs`, cost factor 12) |
| Email verification | 4-digit code, 15-minute expiry |
| Password reset | Secure random token, one-time use, expiry |
| Session tokens | NextAuth JWT, signed with `NEXTAUTH_SECRET` |
| Socket identity | JWT decoded in socket middleware; mismatched identity rejected |
| Banned users | `isBanned` flag on User; all API routes and socket joins check this |

---

## Input Sanitisation

- `escapeHtml()` is applied to all user-supplied strings entering socket events (chat messages, video titles, usernames)
- Prisma parameterized queries prevent SQL injection throughout all API routes
- File uploads are not supported — no attack surface there

---

## Rate Limiting

All rate limits are Redis-backed with an in-memory fallback when Redis is unavailable:

| Target | Limit | Window |
|---|---|---|
| Chat messages | 10 | 10 seconds |
| Emoji reactions | 3 | 1 second |
| Video changes | 5 | 30 seconds |
| API routes | Varies | Per endpoint |

---

## CORS

The socket server accepts connections from the origin specified in `CORS_ORIGIN`. Set this to your exact frontend domain in production. Default is `*` (development only).

---

## Admin Access

- Admin panel at `/admin` is protected by middleware — only `admin` and `PURR_ADMIN` roles can access it
- Role changes require direct DB access (via utility scripts) or another admin

---

## Dependency Security

```bash
# Audit dependencies
npm audit

# Fix fixable vulnerabilities
npm audit fix
```

Check for known vulnerabilities in Prisma, NextAuth, and Socket.io before major deployments.

---

## Repository History

If any secrets were ever committed to git history and the repository is public:

1. **Rotate all exposed secrets immediately** (Google Cloud Console for API keys, platform dashboard for env vars)
2. Consider using `git filter-repo` to scrub history (advanced, rewrites commits)
3. Or make the repository private while cleaning up

Current status: `.env` files are gitignored, no plaintext secrets in the codebase.


## ⚠️ Important: Rotate Your Secrets

The following secrets were exposed in the git repository history:

1. **YouTube API Key**: `AIzaSy...` (example format - actual key was exposed)
   - Exposed in: Commit `35e7429` (commit message and YOUTUBE_API_SETUP.md)
   - **Action Required**: Rotate this key in Google Cloud Console

2. **NEXTAUTH_SECRET**: `[REDACTED]` (example format - actual secret was exposed)
   - Exposed in: DIGITALOCEAN_SETUP.md
   - **Action Required**: Generate a new secret and update Netlify

## Steps to Rotate

### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your YouTube Data API v3 key
3. Click "Restrict key" or "Delete key"
4. Create a new API key
5. Update Netlify environment variable `YOUTUBE_API_KEY` with the new key

### NEXTAUTH_SECRET
1. Generate a new secret:
   ```bash
   openssl rand -base64 32
   ```
2. Update Netlify environment variable `NEXTAUTH_SECRET` with the new value
3. Users will need to log in again after this change

## Current Status

✅ Secrets removed from all files
✅ .env files are in .gitignore
✅ New commits are clean

⚠️ **Note**: Secrets are still in git history. If this is a public repository, consider:
- Making the repository private, OR
- Using git filter-repo to remove secrets from history (advanced)

## Prevention

- ✅ Never commit `.env` files
- ✅ Never put real secrets in documentation
- ✅ Always use placeholders in examples
- ✅ Use Netlify environment variables for all secrets
- ✅ Review commits before pushing

