# CinePurr Architecture

CinePurr is a synchronized video watching platform with real-time chat, gamification features, and social networking capabilities. This document describes the actual technology stack, infrastructure, and implementation details based on the current codebase.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Infrastructure](#infrastructure)
3. [Database Schema](#database-schema)
4. [Socket Events](#socket-events)
5. [API Routes](#api-routes)
6. [Video Sync Algorithm](#video-sync-algorithm)
7. [Authentication Flow](#authentication-flow)
8. [Gamification System](#gamification-system)
9. [Rate Limiting](#rate-limiting)
10. [Environment Variables](#environment-variables)
11. [Deployment](#deployment)

---

## Tech Stack

### Core Framework
- **Next.js** 16.1.6 (latest)
- **React** 19
- **TypeScript** 5
- **Node.js** 22.x

### Key Dependencies (from package.json)
| Package | Version | Purpose |
|---------|---------|---------|
| next | ^16.1.6 | React framework |
| react | ^19 | UI library |
| motion | ^12.35.2 | Animations (formerly Framer Motion) |
| socket.io | ^4.8.3 | WebSocket server |
| socket.io-client | ^4.8.3 | WebSocket client |
| @prisma/client | ^6.0.0 | Database ORM |
| prisma | ^6.0.0 | Database migrations |
| next-auth | ^4.24.13 | Authentication |
| bcryptjs | ^3.0.3 | Password hashing |
| redis | ^5.11.0 | Caching & rate limiting |
| bullmq | ^5.70.4 | Job queue |
| axios | ^1.13.6 | HTTP client |
| play-dl | ^1.9.7 | Video streaming |
| react-player | ^2.16.1 | Video player |
| lucide-react | ^0.577.0 | Icons |
| recharts | ^3.8.0 | Charts |
| tailwindcss | 3.4.19 | Styling |
| resend | ^6.9.3 | Email sending |
| nodemailer | ^7.0.13 | Email transport |

### Development Dependencies
| Package | Version |
|---------|---------|
| eslint | ^9.21.0 |
| eslint-config-next | ^16.1.6 |
| typescript | ^5 |
| @types/node | ^20 |
| @types/react | ^19 |
| tailwindcss | 3.4.19 |
| postcss | ^8.5.8 |

---

## Infrastructure

### Docker Compose Services

The application runs with 4 Docker containers:

```
┌─────────────────────────────────────────────────────────────┐
│                      nginx (Alpine)                         │
│         Port 80/443 → Reverse Proxy & SSL Termination      │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐    ┌─────────────────┐
│   nextjs      │    │ socket_server   │
│   :3000       │    │   :4000         │
└───────┬───────┘    └────────┬────────┘
        │                     │
        └─────────┬───────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │    Redis      │
│   (external)  │    │   7-alpine    │
└───────────────┘    └───────────────┘
```

### Container Communication

| Service | Exposed Port | Internal URL | Purpose |
|---------|---------------|--------------|---------|
| nginx | 80, 443 | - | Reverse proxy, SSL termination |
| nextjs | 3000 | http://nextjs:3000 | Next.js application |
| socket_server | 4000 | http://socket_server:4000 | Socket.IO server |
| redis | 6379 | redis://redis:6379 | Caching, rate limiting, message queue |

### Network
- All services communicate via `cinepurr_net` bridge network
- Only nginx exposes ports to the host
- All traffic routes through nginx for SSL termination

### Redis Configuration
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru --save ""
```
- Memory capped at 128MB with LRU eviction
- Persistence disabled for simplicity

### nginx Configuration
- HTTP (port 80) redirects to HTTPS (port 443)
- SSL certificates managed by Certbot at `/etc/letsencrypt`
- Proxies Next.js app at `/` to `http://nextjs:3000`
- Proxies Socket.IO at `/socket.io/` to `http://socket_server:4000`
- WebSocket upgrade headers enabled
- Long timeouts (86400s) for WebSocket connections

---

## Database Schema

### Provider
- **PostgreSQL** (Prisma ORM)

### Models

#### User
```prisma
model User {
  id                     String    @id @default(cuid())
  username               String    @unique
  email                  String?   @unique
  password               String
  image                  String?
  bio                    String?
  role                   String    @default("USER")  // USER, ADMIN
  isBanned               Boolean   @default(false)
  isVIP                  Boolean   @default(false)
  isFounder              Boolean   @default(false)
  // VIP customization fields
  vipNameColor           String?
  vipFont                String?
  vipBadge               String?
  vipGlow                Boolean   @default(false)
  // Profile customization
  profileCardStyle       String    @default("classic")
  // Gamification
  watchTime              Int       @default(0)
  roomsJoined           Int       @default(0)
  level                 Int       @default(1)
  totalXP               Int       @default(0)
  currentStreak         Int       @default(0)
  longestStreak         Int       @default(0)
  messagesSent          Int       @default(0)
  roomsCreated          Int       @default(0)
  // Relations
  activities            Activity[]
  crates                Crate[]
  dailyQuests           DailyQuest[]
  minigameScores        MinigameScore[]
  // ... more relations
}
```

#### Room
```prisma
model Room {
  id                   String    @id
  name                 String?
  isPublic             Boolean   @default(true)
  currentVideoUrl      String    @default("")
  currentVideoTitle    String    @default("")
  currentVideoProvider String    @default("youtube")
  onlineCount          Int       @default(0)
  maxUsers             Int       @default(50)
  hostId               String?
  coHostIds            String[]  @default([])
  inviteCode           String?   @unique
  category             String?
  groupId              String?
  // ... relations
}
```

#### Message
```prisma
model Message {
  id        String   @id @default(cuid())
  text      String
  username  String
  userId    String?
  roomId    String
  reactions String?  // JSON string of {emoji: [users]}
  createdAt DateTime @default(now())
}
```

#### DailyQuest
```prisma
model DailyQuest {
  id         String   @id @default(cuid())
  userId     String
  questType  String   // "join_room", "watch_time", "send_messages", "create_room"
  progress   Int      @default(0)
  target     Int
  completed  Boolean  @default(false)
  date       DateTime @default(now())
  xpReward   Int      @default(50)
}
```

#### Crate
```prisma
model Crate {
  id        String        @id @default(cuid())
  userId    String
  crateType String        // "daily", "level_up", "achievement"
  opened    Boolean       @default(false)
  openedAt  DateTime?
  rewards   CrateReward[]
}
```

#### MinigameScore
```prisma
model MinigameScore {
  id        String   @id @default(cuid())
  userId    String
  gameType  String   // "snake", "pong", "memory"
  score     Int
  level     Int?
  time      Int?
  createdAt DateTime @default(now())
}
```

### Relationships Summary
- User → Room (host) : One-to-Many
- User → Message : One-to-Many
- Room → Message : One-to-Many (Cascade delete)
- User → DailyQuest : One-to-Many
- User → Crate : One-to-Many
- User → MinigameScore : One-to-Many

---

## Socket Events

### Client → Server Events

#### Connection & Authentication
| Event | Payload | Description |
|-------|---------|-------------|
| *(connection)* | - | Initial socket connection |
| `user:connect` | `{ id: string }` | Register user socket |
| `user:disconnect` | `{ id: string }` | Unregister user socket |

#### Room Management
| Event | Payload | Description |
|-------|---------|-------------|
| `room:join` | `{ roomId: string, user: { id, name, ... } }` | Join a room |
| `room:leave` | `{ roomId: string }` | Leave a room |
| `room:change_video` | `{ roomId: string, video: { url, title, provider } }` | Change video |
| `room:delete` | `{ roomId: string }` | Delete room (host only) |
| `room:kick` | `{ roomId: string, targetUserId: string }` | Kick user |
| `room:set-cohost` | `{ roomId, targetUserId, action: 'promote' \| 'demote' }` | Manage co-hosts |
| `room:request-control` | `{ roomId: string }` | Request host control |
| `room:grant-control` | `{ roomId: string, targetUserId: string }` | Grant co-host |
| `room:start_countdown` | `{ roomId: string, starterName: string }` | Start countdown |
| `room:queue_add` | `{ roomId: string, video: QueueItem }` | Add to queue |
| `room:queue_vote` | `{ roomId: string, queueItemId: string }` | Vote for queue item |
| `room:queue_remove` | `{ roomId: string, queueItemId: string }` | Remove from queue |
| `room:queue_play_next` | `{ roomId: string, queueItemId: string }` | Play queue item |
| `room:get_users` | `{ roomId: string }` | Get room users |

#### Player Sync
| Event | Payload | Description |
|-------|---------|-------------|
| `player:request_sync` | `{ roomId: string }` | Request video sync |
| `player:progress` | `{ roomId, timestamp, isPlaying }` | Host progress update |
| `player:update` | `{ roomId: string, state: RoomState }` | Player state update |
| `player:seek` | `{ roomId: string, timestamp: number }` | Seek video |

#### Chat
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:message` | `{ roomId, message, user }` | Send chat message |
| `chat:typing_start` | `{ roomId, user }` | Start typing |
| `chat:typing_stop` | `{ roomId, user }` | Stop typing |
| `chat:request_history` | `{ roomId: string }` | Get chat history |
| `chat:react` | `{ roomId, messageId, emoji, user }` | React to message |

#### Reactions
| Event | Payload | Description |
|-------|---------|-------------|
| `reaction:send` | `{ roomId: string, emoji: string }` | Send video reaction |

#### Direct Messages
| Event | Payload | Description |
|-------|---------|-------------|
| `dm:send` | `{ receiverId, text, sender }` | Send DM |

#### Games
| Event | Payload | Description |
|-------|---------|-------------|
| `game:create` | `{ gameType: string, user }` | Create game room |
| `game:join` | `{ gameId: string, user }` | Join game |
| `game:invite` | `{ gameId, friendId, user }` | Invite friend |
| `game:move` | `{ gameId, move, user }` | Make move |
| `game:state_update` | `{ gameId, state, user }` | Update game state |
| `game:leave` | `{ gameId: string, user }` | Leave game |
| `game:get_lobbies` | `{ gameType?: string }` | Get available games |

### Server → Client Events

#### Room Events
| Event | Payload | Description |
|-------|---------|-------------|
| `rooms:list` | `Room[]` | Public room list |
| `room:users_update` | `User[]` | User list changed |
| `room:video_changed` | `VideoSource` | Video changed |
| `room:queue_update` | `QueueItem[]` | Queue changed |
| `room:deleted` | `{ message, roomId }` | Room deleted |
| `room:kicked` | - | User was kicked |
| `room:countdown` | `{ starterName }` | Countdown started |
| `room:cohost_updated` | `{ coHostIds: string[] }` | Co-hosts updated |
| `room:control_granted` | - | Received host control |
| `room:control_requested` | `{ userId, username }` | Control requested |
| `room:error` | `{ message, code }` | Error occurred |

#### Player Events
| Event | Payload | Description |
|-------|---------|-------------|
| `player:sync` | `RoomState` | Full player state |

#### Chat Events
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:broadcast` | `Message` | New message |
| `chat:history` | `Message[]` | Chat history |
| `chat:message_saved` | `{ tempId, realId }` | Message persisted |
| `chat:typing_update` | `string[]` | Typing users |
| `chat:reaction` | `{ messageId, emoji, user }` | Message reaction |
| `chat:error` | `{ message }` | Chat error |

#### Reaction Events
| Event | Payload | Description |
|-------|---------|-------------|
| `reaction:new` | `{ emoji, senderId, timestamp }` | New reaction |

#### DM Events
| Event | Payload | Description |
|-------|---------|-------------|
| `dm:received` | `DirectMessage` | New DM received |
| `dm:sent` | `DirectMessage` | DM sent confirmation |

#### Game Events
| Event | Payload | Description |
|-------|---------|-------------|
| `game:created` | `{ gameId, players }` | Game created |
| `game:player_joined` | `{ players, user }` | Player joined |
| `game:player_left` | `{ players, user }` | Player left |
| `game:move_received` | `{ move, from }` | Move received |
| `game:state_sync` | `{ state, from }` | State sync |
| `game:lobby_updated` | `GameLobby` | Lobby changed |
| `game:lobbies_list` | `{ lobbies }` | Game list |
| `game:invitation` | `{ gameId, gameType, from }` | Game invite |
| `game:error` | `{ message }` | Game error |

#### Notification Events
| Event | Payload | Description |
|-------|---------|-------------|
| `notification:new` | `Notification` | New notification |

---

## API Routes

### Authentication
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password |
| `/api/auth/verify-email` | POST | Verify email |
| `/api/auth/verify-user` | POST | Mark user as verified |
| `/api/register` | POST | Register new user |

### User Management
| Route | Method | Description |
|-------|--------|-------------|
| `/api/user` | GET, PATCH | Get/update current user |
| `/api/user/[username]` | GET | Get user by username |
| `/api/user/level` | GET | Get user's level info |
| `/api/user/password` | POST | Change password |
| `/api/user/streak` | GET | Get user's streaks |
| `/api/user/study-streak` | GET | Get study streak |
| `/api/user/title` | POST | Set active title |
| `/api/user/vip` | GET, POST | Get/update VIP settings |
| `/api/user/xp` | GET | Get XP details |
| `/api/avatar/[username]` | GET | Generate avatar image |

### Rooms
| Route | Method | Description |
|-------|--------|-------------|
| `/api/rooms` | GET, POST | List/create rooms |
| `/api/rooms/[roomId]` | GET, PATCH, DELETE | Room CRUD |
| `/api/rooms/[roomId]/invite-image` | GET | Generate invite image |
| `/api/rooms/invite` | POST | Join via invite code |
| `/api/rooms/recommendations` | GET | Get recommendations |
| `/api/rooms/scheduled` | GET, POST | Scheduled rooms |

### Social
| Route | Method | Description |
|-------|--------|-------------|
| `/api/favorites` | GET, POST, DELETE | Favorite rooms |
| `/api/friends` | GET | List friends |
| `/api/friends/request` | POST | Send friend request |
| `/api/friends/accept` | POST | Accept request |
| `/api/friends/cancel` | POST | Cancel request |
| `/api/friends/remove` | DELETE | Remove friend |
| `/api/messages/dm` | GET, POST | Direct messages |

### Media
| Route | Method | Description |
|-------|--------|-------------|
| `/api/movies` | GET | Search movies (TMDB) |
| `/api/tv/[id]` | GET | TV show details |
| `/api/tmdb/find/[imdbId]` | GET | Find by IMDB ID |
| `/api/search` | GET | Global search |
| `/api/music/search` | GET | Search music |
| `/api/music/stream` | GET | Stream music |
| `/api/music/piped-stream` | GET | Piped proxy stream |
| `/api/music/ytdl-stream` | GET | YTDL stream |
| `/api/iptv-proxy` | GET | IPTV proxy |
| `/api/film-news` | GET | Film news |

### Gamification
| Route | Method | Description |
|-------|--------|-------------|
| `/api/achievements` | GET | Get achievements |
| `/api/challenges` | GET | Get challenges |
| `/api/crates` | GET | List crates |
| `/api/crates/daily` | POST | Claim daily crate |
| `/api/crates/open` | POST | Open a crate |
| `/api/quests/daily` | GET | Get daily quests |
| `/api/minigames/score` | POST | Submit score |
| `/api/minigames/leaderboard` | GET | Get leaderboard |
| `/api/leaderboards` | GET | Global leaderboards |

### Admin
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/ban` | POST | Ban user |
| `/api/admin/unban` | POST | Unban user |
| `/api/admin/broadcast` | POST | Global broadcast |
| `/api/admin/rooms/[id]` | GET, PATCH, DELETE | Manage rooms |
| `/api/admin/settings` | GET, POST | Site settings |
| `/api/admin/stats` | GET | Site statistics |
| `/api/admin/users/[id]` | GET, DELETE | Manage users |
| `/api/admin/users/[id]/role` | POST | Change role |
| `/api/admin/users/search` | POST | Search users |
| `/api/admin/vip/grant` | POST | Grant VIP |
| `/api/admin/vip/revoke` | POST | Revoke VIP |

### Other
| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/rate-limit` | GET | Rate limit info |
| `/api/notifications` | GET, PATCH | Notifications |
| `/api/watchlist` | GET, POST, DELETE | Watchlist |
| `/api/history` | GET | Watch history |
| `/api/groups` | GET, POST | Groups |
| `/api/activity` | GET | User activity |
| `/api/analytics` | POST | Track analytics |
| `/api/errors` | POST | Report errors |

---

## Video Sync Algorithm

### Host-Authority Model

The server uses a **host-authority** model where only the host (or co-host) controls video playback:

1. **Host** sends `player:progress` events with current timestamp and play state
2. **Server** validates the sender is host/co-host
3. **Server** accepts updates within 30 seconds of expected timestamp (allows buffering delays)
4. **Server** broadcasts sync to all viewers via `player:sync`

### Sync Flow
```
Host Player                    Server                    Viewer Players
    │                              │                           │
    ├─(player:progress)──────────>│                           │
    │  {timestamp, isPlaying}      │                           │
    │                              ├─(player:sync)─────────────>│
    │                              │  {timestamp, isPlaying,   │
    │                              │   lastUpdated}            │
    │                              │                           │
    ├─(player:seek)──────────────>│                           │
    │  {timestamp}                 │                           │
    │                              ├─(player:sync + forcedSeek)>│
    │                              │                           │
    ├─(player:update)─────────────>│                           │
    │  {state}                     │                           │
    │                              ├─(player:sync)─────────────>│
```

### Room Queue with Voting
- Users add videos to queue via `room:queue_add`
- Each video has votes (starts at 1 for adder)
- Queue sorted by votes (highest first)
- Host plays next via `room:queue_play_next`

---

## Authentication Flow

### NextAuth.js Configuration

```typescript
// Providers: Credentials only
providers: [
  CredentialsProvider({
    name: 'Credentials',
    async authorize(credentials) {
      // Rate limit check (5 attempts, 15 min lockout)
      // Find user by username
      // Compare password with bcrypt
      // Check emailVerified
      // Return user object
    }
  })
]

// Session: JWT strategy, 24 hour max age
session: {
  strategy: "jwt",
  maxAge: 24 * 60 * 60
}
```

### Socket Authentication

1. Client connects to Socket.IO
2. Client passes JWT in `socket.handshake.auth.token`
3. Server validates token using `next-auth/jwt` decode
4. On success: attaches `userId`, `userName`, `userRole` to socket
5. On failure: allows as guest (limited functionality)

### Guest Users
- Allowed without token
- Marked as `isGuest: true`
- Cannot access certain features (messaging may be restricted)

---

## Gamification System

### XP System

**Level Formula** (from `src/lib/xp.ts`):
```typescript
level = floor(sqrt(totalXP / 100)) + 1
```

**XP Requirements**:
```typescript
xpForLevel(level) = (level - 1)² * 100
```

**Examples**:
| Level | Total XP Required |
|-------|-------------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 400 |
| 5 | 1,600 |
| 10 | 8,100 |
| 20 | 36,100 |

### XP Sources
| Action | XP Reward |
|--------|-----------|
| Join room | 10 XP |
| Complete quest | 25-100 XP |
| Room creation | Varies |
| Send message | Varies |

### Daily Quests
Quests reset at midnight UTC:

| Quest Type | Target | XP Reward |
|------------|--------|-----------|
| `join_room` | 1 | 50 XP |
| `watch_time` | 1800s (30min) | 100 XP |
| `send_messages` | 5 | 25 XP |
| `create_room` | 1 | 75 XP |

### Crates
- **Daily Crates**: Claimable once per day
- **Level Up Crates**: Awarded on level advancement
- **Achievement Crates**: Awarded for achievements

### Achievements
Tracked via `ChallengeProgress` model:
- Various achievement IDs stored in `unlockedBadges` array on User

### Streaks
- `currentStreak`: Days in a row of activity
- `longestStreak`: Best streak ever
- `studyStreak`: Separate study session streak

### VIP System
Users can be granted VIP status by admins:
- Custom name colors, fonts, badges
- Profile customization (banners, borders, effects)
- Custom CSS support
- Glow effects

---

## Rate Limiting

### Middleware (Next.js)
From `src/proxy.ts`:

```typescript
// In-memory rate limiting (single instance only)
// 10 login attempts per minute
// 500 general API requests per minute
```

### Socket Server
From `src/lib/rateLimiterRedis.ts`:

**Redis-backed with memory fallback**:
- Sliding window algorithm
- Per-socket limiting for messages: 10 per 10 seconds
- Per-socket limiting for video changes: 5 per minute

### Login Protection
From `src/lib/auth.ts`:
- 5 attempts maximum
- 15 minute lockout after failures

---

## Environment Variables

### Required
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/db"

# NextAuth
NEXTAUTH_SECRET="generate-with: openssl rand -hex 32"
NEXTAUTH_URL="https://cinepurr.me"

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="CinePurr <noreply@cinepurr.me>"
```

### Optional
```env
# TMDB (movie data)
TMDB_API_KEY="..."

# Redis
REDIS_URL="redis://localhost:6379"

# CORS
CORS_ORIGIN="https://yourdomain.com"

# IPTV Proxy
IPTV_PROXY_ALLOWED_HOSTS="host1.com,host2.net"

# Development
ALLOW_PUBLIC_TUNNEL="1"
SKIP_EMAIL_VERIFICATION="true"
LOG_LEVEL="debug"
```

### Internal (Docker)
```env
# Set by docker-compose
NODE_ENV=production
SOCKET_SERVER_INTERNAL_URL=http://socket_server:4000
NEXT_PUBLIC_SITE_URL=https://cinepurr.me
NEXT_PUBLIC_SOCKET_URL=https://cinepurr.me
```

---

## Deployment

### Platform
- **Host**: DigitalOcean Droplet
- **OS**: Ubuntu 24.04
- **Domain**: cinepurr.me
- **SSL**: Certbot (Let's Encrypt)

### Docker Deployment
```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

### SSL Setup
1. Certbot obtains certificates via Let's Encrypt
2. Certificates stored at `/etc/letsencrypt`
3. nginx configured to use them
4. Auto-renewal via Certbot cron job

### Health Checks
- **nginx**: Proxies to Next.js and Socket server
- **Next.js**: `GET /api/health`
- **Socket server**: HTTP health check on port 4000
- **Redis**: `redis-cli ping`

### Cleanup
- Empty rooms deleted after 1 minute
- Stale room state cleaned every 10 minutes
- Rate limit entries cleaned every 30 seconds
- User socket mappings cleaned every 10 minutes

---

## Security Features

### Authentication
- JWT-based sessions (24h expiry)
- Bcrypt password hashing
- Email verification required for login
- Rate limiting on login attempts

### Input Validation
- XSS prevention via HTML escaping
- Bad word filter for chat
- URL sanitization
- Input length limits

### Socket Security
- JWT verification on connect
- Identity spoofing prevention
- Host-only video control
- Message rate limiting

### Headers
- Strict CSP (Content Security Policy)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- HSTS enabled

---

## File Structure

```
CinePurr/
├── server/
│   └── index.ts          # Socket.IO server
├── prisma/
│   └── schema.prisma     # Database schema
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── room/         # Room pages
│   │   └── page.tsx      # Home page
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities
│   │   ├── auth.ts       # NextAuth config
│   │   ├── xp.ts        # XP calculations
│   │   ├── rateLimiterRedis.ts
│   │   └── ...
│   └── proxy.ts          # Next.js middleware
├── docker-compose.yml
├── nginx.conf
├── Dockerfile.nextjs
├── Dockerfile.server
└── package.json
```

---

*Last updated: Based on codebase at Next.js 16.1.6, Socket.IO 4.8.3, Prisma 6.0.0*
