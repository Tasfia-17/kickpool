# KickPool

**World Cup group sweepstakes with live AI commentary and on-chain settlement.**

Create a pool with friends for any World Cup match, predict the score, watch live data roll in from TxLINE, get AI pundit commentary on every goal and card, then receive automatic prize payout settled on Solana with a cryptographic Merkle proof.

Built for the TxLINE World Cup Hackathon 2026.



---

## What It Does

1. **Create a pool** for any World Cup fixture from TxLINE live fixture data
2. **Invite friends** via a shareable link, each making a score prediction and USDC entry stake
3. **Watch the match live** with a real-time scoreboard, odds bar, and floating emoji reactions
4. **AI Pundit commentary** fires on every goal, card, VAR decision, penalty, and odds shift via Google Gemini + TxLINE events
5. **Auto-settlement** when TxLINE emits `game_finalised` (statusId=100): prize distribution calculated, Merkle proof fetched and displayed, winners paid

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, motion/react |
| Real-time | Socket.io 4 (separate server), TxLINE SSE streams |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis (rate limiting, write-behind cache) |
| Auth | NextAuth.js (credentials) |
| AI Commentary | Google Gemini 1.5 Flash, rule-based fallback |
| Solana | Phantom wallet connect, USDC escrow (devnet/demo mode) |
| Data | TxLINE by TxODDS (World Cup scores + StablePrice odds) |

---

## TxLINE Integration

KickPool uses TxLINE as its live data backbone:

**Endpoints used:**

- `GET /api/fixtures/snapshot?competitionId=15` - World Cup fixture list for pool creation
- `GET /api/scores/snapshot/{fixtureId}` - Initial score state on pool bootstrap
- `GET /api/scores/stream` - SSE stream: live score events, goals, cards, VAR, half time, full time
- `GET /api/odds/stream` - SSE stream: real-time StablePrice consensus odds
- `GET /api/scores/stat-validation?fixtureId=&seq=&statKeys=1,2` - Merkle multiproof for on-chain settlement verification

**Settlement flow:**

TxLINE emits `action=game_finalised, statusId=100, period=100` on the scores SSE stream. The server detects this, fetches a Merkle proof for statKeys 1 and 2 (P1 Goals, P2 Goals), calculates prize distribution, and broadcasts `match:finalised` with the proof to all pool members. The proof is shown in the UI so users can verify the result was cryptographically anchored to Solana.

**Free World Cup tier used:** Service Level 12 (real-time). No TxL tokens required.

---

## Architecture

```
Browser (Next.js)
     |
     | Socket.io (ws)
     v
Socket Server (port 4000)
  - matchHandler.ts        TxLINE SSE consumer + broadcaster
  - chatHandler.ts         Write-behind cached group chat
  - presenceHandler.ts     Room presence
     |
     | TxLINE SSE (scores + odds)
     v
TxLINE API (txline.txodds.com)
     |
     v
PostgreSQL (Prisma)   Redis (rate limiting, cache)
```

**Per-pool flow:**

1. Pool created in DB with TxLINE `fixtureId`
2. `bootstrapPoolMatchStream()` starts SSE streams for fixture
3. Score/odds events broadcast via Socket.io to `pool:{poolId}` room
4. Notable events trigger `generateAICommentary()` async, result broadcast as `pundit:commentary`
5. `isMatchFinalised()` triggers Merkle proof fetch and prize settlement

---

## Scoring System

Points awarded per entry after match:

| Prediction | Points |
|---|---|
| Correct winner (or draw) | +3 |
| Correct score for Team 1 | +2 |
| Correct score for Team 2 | +2 |
| Exact scoreline bonus | +5 |

Highest scorer(s) share the prize pool. Platform takes 10% rake.

---

## Local Setup

### Prerequisites

- Node.js 22+
- PostgreSQL database (Neon.tech free tier recommended)
- Redis (optional, falls back to memory)
- TxLINE API token (free for World Cup via on-chain subscribe)

### Steps

```bash
git clone https://github.com/Tasfia-17/kickpool
cd kickpool
npm install --legacy-peer-deps

cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, TXLINE_API_TOKEN
```

Run database migration:

```bash
npx prisma migrate dev --name kickpool-init
npx prisma generate
```

Start dev servers (two terminals):

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Socket server
npm run server
```

Open `http://localhost:3000`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for session signing |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Socket server URL (http://localhost:4000) |
| `TXLINE_BASE_URL` | No | TxLINE base URL (default: https://txline.txodds.com) |
| `TXLINE_API_TOKEN` | Yes | TxLINE API token from on-chain subscribe |
| `DEMO_MODE` | No | Set to `true` to skip real Solana txs (uses simulated wallet) |
| `SOLANA_NETWORK` | No | `devnet` or `mainnet-beta` (default: devnet) |
| `GOOGLE_API_KEY` | No | Gemini API key for AI commentary (falls back to templates) |
| `REDIS_URL` | No | Redis connection (falls back to in-memory) |

---

## Vercel Deployment

This app deploys to Vercel for the Next.js frontend. The Socket.io server deploys separately to Railway or Render.

**Vercel config** (`vercel.json` at root):

```json
{
  "buildCommand": "npx prisma generate && next build",
  "installCommand": "npm install --legacy-peer-deps"
}
```

Set all environment variables in the Vercel dashboard under Settings > Environment Variables.

For the socket server, deploy `server/index.ts` to Railway:

```bash
railway init
railway up
```

Set `NEXT_PUBLIC_SOCKET_URL` in Vercel to point to the Railway socket server URL.

---

## Key Files

```
src/
  app/
    page.tsx                     Homepage: pool listings + hero
    pool/
      create/page.tsx            Create pool flow
      join/page.tsx              Join via invite code
      [poolId]/page.tsx          Live pool room (scoreboard + pundit + chat + standings)
      [poolId]/join/page.tsx     Direct join redirect
  api/
    pools/                       Pool CRUD API
    txline/fixtures/             TxLINE fixture proxy (cached 5min)
  components/
    match/
      MatchScoreboard.tsx        Live score display with goal animation
      AIPunditFeed.tsx           Scrolling AI commentary feed
      MatchReactions.tsx         Floating emoji reactions on match events
      SettlementScreen.tsx       Win screen with Merkle proof display
    pool/
      PoolLeaderboard.tsx        Live pool standings
      WalletConnect.tsx          Phantom wallet connect + demo mode
  hooks/
    useMatchSocket.ts            Socket.io match event subscriptions
  lib/
    txline.ts                    TxLINE API client (SSE + REST)
    aiPundit.ts                  AI commentary engine (Gemini + fallback)
    solana.ts                    Wallet connect + USDC prize settlement

server/
  handlers/
    matchHandler.ts              TxLINE SSE consumer, Socket.io broadcaster, settlement
  index.ts                       Express + Socket.io server

prisma/
  schema.prisma                  MatchPool, PoolEntry, AICommentary models
```

---

## Judges Criteria

| Criterion | Implementation |
|---|---|
| Fan Accessibility and UX | Progressive wallet onboarding (wallet only required at stake time), invite link flow, one-tap score prediction, mobile-responsive dark theme |
| Real-Time Responsiveness | TxLINE SSE with Last-Event-ID resume, Socket.io broadcast, spring-animated score digits, 5-emoji burst on goal, data staleness indicator after 90s no update |
| Originality and Value Creation | No product combines group sweepstakes + AI commentary + verified on-chain settlement in one consumer app |
| Commercial Path | 10% platform rake on paid pools, free pools for acquisition, proven DraftKings-style model with crypto-native instant settlement |
| Completeness and Execution | Full end-to-end: create pool, join with prediction, live match, AI pundit fires on every event, settlement with Merkle proof on final whistle |

---

## Hackathon Notes

**TxLINE endpoints used:** fixtures/snapshot, scores/snapshot, scores/stream (SSE), odds/stream (SSE), scores/stat-validation (Merkle proof)

**World Cup Final fixture ID:** 18257739 (Spain vs Argentina, July 19 2026 19:00 UTC)

**Feedback on TxLINE API:**
- The two-header auth system (JWT + API token) is well-designed for security
- SSE with Last-Event-ID resume support is excellent for resilience
- The Merkle proof endpoints are the killer feature: `scores/stat-validation` with multi-stat support makes trustless settlement genuinely possible
- Friction point: the on-chain subscribe requirement adds 3-4 steps for a new developer (install wallet, get SOL, submit tx, activate token). A hosted devnet subscribe flow would reduce time-to-first-request from ~30min to under 2min
- The free World Cup tier (Service Level 12 real-time) is a great developer experience decision

---

## License

MIT
