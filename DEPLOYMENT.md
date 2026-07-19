# CinePurr Deployment Guide

CinePurr runs as two independent processes — the **Next.js app** and the **Socket.io server** — plus a PostgreSQL database and an optional Redis instance.

---

## Recommended Stack

| Service | Host |
|---|---|
| Next.js app | Vercel (free tier) |
| Socket.io server | Railway |
| PostgreSQL | Railway |
| Redis | Railway (optional) |

---

## Option 1: Vercel + Railway (Best Performance)

### 1a — Deploy the Next.js app on Vercel

1. Push your fork to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `npm run build` (default)
5. Add environment variables (see section below)
6. Deploy

### 1b — Deploy the Socket + Database on Railway

1. Go to [railway.app](https://railway.app) → New Project
2. Add **PostgreSQL** service → Railway auto-generates `DATABASE_URL`
3. Add **Redis** service → Railway auto-generates `REDIS_URL`
4. Add a **GitHub** service → select your repo
   - Root directory: `/` (default)
   - Build command: `npm install && npm run build`
   - Start command: `npm run server:start` (or `npx ts-node --project tsconfig.server.json server/index.ts` for dev)
   - Port: `4000`
5. Add environment variables to the Railway service (see section below)

---

## Option 2: Railway Everything

Deploy the Next.js app, socket server, PostgreSQL, and Redis all on Railway:

1. New Project → Deploy from GitHub repo
2. Add **PostgreSQL** and **Redis** services
3. The GitHub service auto-detects Next.js — set start command to `npm start`
4. Add a second GitHub service from the same repo:
   - Start command: `npm run server:start`
   - Port: `4000`
5. Set all environment variables on both services

---

## Option 3: Render (Free Tier)

1. [render.com](https://render.com) → New **Web Service** for Next.js
   - Build: `npm install && npm run build`
   - Start: `npm start`
2. New **Web Service** for Socket server
   - Start: `npm run server:start`
   - Port: `4000`
3. New **PostgreSQL** (free tier)
4. New **Redis** (free tier)

---

## Environment Variables

Set these on **both** the Next.js app and the Socket server unless marked.

```env
# === REQUIRED ===

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/cinepurr

# NextAuth (Next.js app only)
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<openssl rand -base64 32>

# Socket server URL (used by Next.js app to connect)
NEXT_PUBLIC_SOCKET_URL=https://your-socket.railway.app

# === STRONGLY RECOMMENDED ===

# TMDB (movie/TV search, film news, episode picker)
TMDB_API_KEY=your_tmdb_key

# Google Gemini (AI chatbot)
GEMINI_API_KEY=your_gemini_key

# Email — Resend (registration verification, password reset)
RESEND_API_KEY=your_resend_key
EMAIL_FROM=noreply@yourdomain.com

# Redis (rate limiting + socket scaling)
REDIS_URL=redis://default:password@host:6379

# === OPTIONAL ===

# Piped instance config (music player)
PIPED_INSTANCES_CONFIG_URL=https://gist.githubusercontent.com/you/id/raw/config.json

# CORS origin for socket server (defaults to *)
CORS_ORIGIN=https://your-app.vercel.app

# Node environment
NODE_ENV=production
PORT=4000
```

---

## Post-Deploy Checklist

```bash
# 1. Run database migrations (once, from any shell/Railway console)
npx prisma migrate deploy

# 2. Verify the socket server is reachable
curl https://your-socket.railway.app/health

# 3. Open the app and create a test room
# 4. Open a second browser tab and join the room — verify video sync
# 5. Send a chat message — verify real-time delivery
```

---

## Scaling

### Horizontal Socket Scaling

If you run multiple socket server instances, enable the Redis adapter. It is automatically activated when `REDIS_URL` is set.

### Database Connections

For high traffic, enable **PgBouncer** connection pooling on Railway/Render and append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`.

---

## Admin Setup

This public hackathon repo does not include direct user-management CLI scripts.

If you need to bootstrap an admin account for a deployment, do it through your hosting or database admin workflow, or add a temporary seed or migration in your own environment rather than committing privileged maintenance scripts to the repo.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Socket not connecting | Check `NEXT_PUBLIC_SOCKET_URL`, verify CORS_ORIGIN, check socket server logs |
| Database errors on start | Run `npx prisma migrate deploy`, verify `DATABASE_URL` |
| Email not sending | Check `RESEND_API_KEY`, verify `EMAIL_FROM` domain is configured in Resend |
| Music not playing | Add valid Piped instances to env or config URL |
| TMDB images broken | Ensure `TMDB_API_KEY` is set; images are proxied via `/api/tmdb/image` |


## Quick Deploy Options

### Option 1: Railway (Recommended - All-in-One) 🚀

Railway can host everything in one place:

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **Create Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select CinePurr**: Choose your repository
4. **Add Services**:
   - **PostgreSQL**: Click "+ New" → "Database" → "PostgreSQL"
   - **Redis**: Click "+ New" → "Database" → "Redis"
   - **Next.js App**: Railway will auto-detect and create a service
   - **Socket Server**: Click "+ New" → "GitHub Repo" → Select your repo → Set root directory to `/server` and build command to `npm install && npm run build`

5. **Environment Variables**: Add these in Railway dashboard:
   ```
   DATABASE_URL=<from PostgreSQL service>
   REDIS_URL=<from Redis service>
   NEXTAUTH_URL=https://your-app.railway.app
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.railway.app
   NODE_ENV=production
   ```

6. **Deploy**: Railway will auto-deploy on push to main branch

**Cost**: Free tier available, then ~$5-10/month

---

### Option 2: Vercel + Railway (Best Performance) ⚡

**Frontend (Vercel)**:
1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New Project" → Import your CinePurr repo
3. Configure:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Add Environment Variables:
   ```
   DATABASE_URL=<your-postgres-url>
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=<generate-secret>
   NEXT_PUBLIC_SOCKET_URL=<your-socket-server-url>
   ```

**Backend Services (Railway)**:
- Deploy Socket.io server on Railway
- Add PostgreSQL and Redis databases
- Set environment variables

**Cost**: Vercel (free), Railway (~$5-10/month)

---

### Option 3: Render (Free Tier Friendly) 🆓

1. **Sign up**: [render.com](https://render.com)
2. **PostgreSQL**: New → PostgreSQL (free tier available)
3. **Redis**: New → Redis (free tier available)
4. **Web Service (Next.js)**:
   - New → Web Service
   - Connect GitHub repo
   - Build: `npm install && npm run build`
   - Start: `npm start`
5. **Background Worker (Socket.io)**:
   - New → Background Worker
   - Same repo, root: `/server`
   - Start: `npm run server`

**Cost**: Free tier available (with limitations), then ~$7/month

---

## Step-by-Step: Railway Deployment (Easiest)

### 1. Prepare Your Repository

Make sure all your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy on Railway

1. Visit [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `lxcario/CinePurr`

### 3. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will auto-generate `DATABASE_URL`
4. Copy this URL for later

### 4. Add Redis

1. Click "+ New" → "Database" → "Redis"
2. Copy the `REDIS_URL` for later

### 5. Configure Next.js Service

Railway should auto-create a service. Configure it:

**Settings**:
- Root Directory: `/` (default)
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**Environment Variables**:
```bash
DATABASE_URL=<from-postgres-service>
REDIS_URL=<from-redis-service>
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXT_PUBLIC_SOCKET_URL=https://your-socket.railway.app
NODE_ENV=production
```

### 6. Deploy Socket.io Server

1. Click "+ New" → "GitHub Repo" → Select CinePurr
2. **Settings**:
   - Root Directory: `/server`
   - Build Command: `cd .. && npm install`
   - Start Command: `npm run server`
   - Port: `4000` (or whatever your server uses)

3. **Environment Variables**:
   ```bash
   DATABASE_URL=<same-as-above>
   REDIS_URL=<same-as-above>
   PORT=4000
   NODE_ENV=production
   CORS_ORIGIN=https://your-app.railway.app
   ```

### 7. Run Database Migrations

In Railway, open a shell for your Next.js service and run:
```bash
npx prisma migrate deploy
npx prisma generate
```

### 8. Get Your URLs

- Frontend: `https://your-app.railway.app`
- Socket Server: `https://your-socket.railway.app`

Update `NEXT_PUBLIC_SOCKET_URL` in your Next.js service with the socket server URL.

---

## Environment Variables Checklist

Make sure you have these set in your deployment platform:

### Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your frontend URL (e.g., `https://cinepurr.vercel.app`)
- `NEXTAUTH_SECRET` - Random secret (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_SOCKET_URL` - Your Socket.io server URL
- `NODE_ENV=production`

### Optional (for full features):
- `OMDB_API_KEY` - For movie search
- `YOUTUBE_API_KEY` - For YouTube search (if using)
- `REDIS_URL` - If using Redis adapter
- Email service keys (Resend, etc.)

---

## Post-Deployment

1. **Test the site**: Visit your deployed URL
2. **Check Socket.io**: Open browser console, verify connection
3. **Test features**: Create a room, invite friends
4. **Monitor logs**: Check Railway/Vercel logs for errors

---

## Troubleshooting

### Socket.io not connecting?
- Check `NEXT_PUBLIC_SOCKET_URL` matches your socket server URL
- Verify CORS is configured in `server/index.ts`
- Check socket server is running and accessible

### Database errors?
- Run `npx prisma migrate deploy` in production
- Verify `DATABASE_URL` is correct
- Check Prisma client is generated: `npx prisma generate`

### Build fails?
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

---

## Quick Deploy Commands

If using Railway CLI:
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs

Good luck! 🚀

