# KickPool — Deployment Guide

## Step 1 — Get a free PostgreSQL database (2 minutes)

1. Go to **https://neon.tech** → Sign up free
2. Create project: name `kickpool`, region `US East`
3. Copy the **connection string** — it looks like:
   `postgresql://kickpool:abc123@ep-xyz.us-east-2.aws.neon.tech/kickpool?sslmode=require`
4. Save it — you need it for both Vercel and Railway

---

## Step 2 — Deploy Frontend to Vercel (3 minutes)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select `Tasfia-17/kickpool`
4. Framework: **Next.js** (auto-detected)
5. Click **"Environment Variables"** and add ALL of these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` on any terminal, paste result |
| `NEXTAUTH_URL` | `https://kickpool.vercel.app` (update after you get actual URL) |
| `NEXT_PUBLIC_SOCKET_URL` | `https://kickpool-server.up.railway.app` (update after Railway deploy) |
| `TXLINE_BASE_URL` | `https://txline.txodds.com` |
| `TXLINE_API_TOKEN` | Leave empty (activated via UI) |
| `SOLANA_NETWORK` | `devnet` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` |
| `DEMO_MODE` | `false` |
| `GOOGLE_API_KEY` | Get free key at https://aistudio.google.com |
| `NEXT_TELEMETRY_DISABLED` | `1` |

6. Click **Deploy** — Vercel builds on their servers (takes ~3-4 min)
7. Note your URL: `https://kickpool-XXXXX.vercel.app`

---

## Step 3 — Deploy Socket Server to Railway (3 minutes)

1. Go to **https://railway.app/new**
2. Click **"Deploy from GitHub repo"**
3. Select `Tasfia-17/kickpool`
4. Railway will detect `railway.json` and use:
   - Build: `npm install --legacy-peer-deps && npx prisma generate && npm run server:build`
   - Start: `npm run server:start`
5. Go to **Variables** tab and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Same Neon connection string |
| `NEXTAUTH_SECRET` | Same secret as Vercel |
| `CORS_ORIGIN` | Your Vercel URL e.g. `https://kickpool-XXXXX.vercel.app` |
| `TXLINE_BASE_URL` | `https://txline.txodds.com` |
| `TXLINE_API_TOKEN` | Leave empty |
| `SOLANA_NETWORK` | `devnet` |
| `DEMO_MODE` | `false` |
| `GOOGLE_API_KEY` | Same Gemini key |
| `ADMIN_API_KEY` | Same value as NEXTAUTH_SECRET |
| `PORT` | `4000` |

6. Go to **Settings → Networking** → click **Generate Domain**
7. Note your Railway URL: `https://kickpool-server-XXXXX.up.railway.app`

---

## Step 4 — Update Vercel with Railway URL (1 minute)

1. Vercel Dashboard → your project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_SOCKET_URL` to your actual Railway URL
3. Go to Deployments → click **Redeploy**

---

## Step 5 — Run Database Migration (1 minute)

Once Vercel is deployed, the build script automatically runs `prisma migrate deploy`.
If not, run manually from Vercel's **Functions** tab or via:

```bash
DATABASE_URL="your-neon-url" npx prisma migrate deploy
```

---

## Step 6 — Verify

1. Open your Vercel URL
2. You should see the KickPool homepage with the TxLINE subscribe banner
3. Click **Connect Phantom & Subscribe** — follow the 3-step flow
4. Create a pool — it will load World Cup fixtures from TxLINE
5. Open a pool room — you'll see the ReplayButton for finished matches

---

## Quick Secret Generator (run this once)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
