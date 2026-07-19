# CinePurr Next.js 14 → 16.1.6 Upgrade Analysis

## Executive Summary

This document provides a comprehensive analysis and upgrade plan for migrating CinePurr from Next.js 14.2.35 to Next.js 16.1.6.

### Current Project State

| Aspect | Current Version | Notes |
|--------|-----------------|-------|
| Next.js | 14.2.35 | App Router |
| React | 18.x | Standard React 18 |
| Node.js | 20.x | Per .nvmrc |
| TypeScript | 5.x | Latest |
| next-auth | 4.24.13 | Credentials provider |
| Prisma | 5.22.0 | PostgreSQL ORM |
| Tailwind CSS | 3.3.0 | Stable |
| Framer Motion | 11.18.2 | Animation library |

### Project Architecture Overview

- **App Router**: Full Next.js App Router implementation
- **API Routes**: 70+ Route Handlers in `/api/*`
- **Client Components**: 26 components using `"use client"`
- **Middleware**: Edge runtime with rate limiting & CORS
- **Real-time**: Socket.io for room synchronization
- **No Server Actions**: Traditional API-first approach
- **Custom Webpack**: Extensive bundle optimization in next.config.js

---

## Breaking Changes Analysis

### 1. Async Params (Next.js 15+)

**Impact: HIGH**

In Next.js 15+, `params` is now a Promise and must be awaited:

```typescript
// Next.js 14 (current)
export default function Page({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
}

// Next.js 15/16 (required)
export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
}
```

**Files requiring changes:**
- `src/app/room/[roomId]/page.tsx` ⚠️
- `src/app/api/rooms/[roomId]/route.ts` ⚠️
- `src/app/api/avatar/[username]/route.ts` ⚠️
- `src/app/api/user/[username]/route.ts` ⚠️
- `src/app/api/users/profile/[username]/route.ts` ⚠️
- `src/app/api/tv/[id]/route.ts` ⚠️
- `src/app/api/tmdb/find/[imdbId]/route.ts` ⚠️

### 2. React 19 Support (Next.js 16)

**Impact: MEDIUM-HIGH**

Next.js 16 requires React 19, which has breaking changes:

```typescript
// Changes needed:
- React 18 → React 19
- react-dom 18 → react-dom 19
- @types/react 18 → @types/react 19
- @types/react-dom 18 → @types/react-dom 19
```

**Potential issues:**
- `useFormState` and `useFormStatus` API changes
- Hydration mismatch handling improvements
- ref as a prop behavior changes

### 3. cookies() and headers() API Changes

**Impact: MEDIUM**

These are now async in Next.js 15+:

```typescript
// Next.js 14 (current)
import { cookies, headers } from 'next/headers';
export function GET() {
  const cookie = cookies().get('name');
  const header = headers().get('x-forwarded-for');
}

// Next.js 15/16 (required)
import { cookies, headers } from 'next/headers';
export async function GET() {
  const cookie = (await cookies()).get('name');
  const header = (await headers()).get('x-forwarded-for');
}
```

### 4. Server Components - Async Default

**Impact: LOW-MEDIUM**

Server components are now async by default. This affects some server components:

```typescript
// May need to add async
export default async function ServerPage() {
  // Now async by default
}
```

### 5. next-auth v5 (Auth.js) Migration Path

**Impact: HIGH**

next-auth 4.x will need migration to v5 for Next.js 16 compatibility:

- Configuration structure changes
- Route handler changes (`app/api/auth/[...nextauth]/route.ts`)
- Session handling improvements

### 6. Turbopack as Default

**Impact: LOW**

Turbopack is now the default in development. Some webpack-specific configs may behave differently:

- Custom webpack configurations in next.config.js should still work
- Some webpack loaders may need adjustment

---

## Detailed Upgrade Plan

### Phase 1: Preparation (Week 1)

#### 1.1 Update Node.js Version

```bash
# Update .nvmrc to Node 22 (recommended for Next.js 16)
echo "22" > .nvmrc

# Or use Node 20 if preferred (but 22 is recommended)
```

#### 1.2 Update Package Dependencies

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^5.0.0-beta.25",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "eslint-config-next": "^15.1.0"
  }
}
```

#### 1.3 Create Upgrade Branch

```bash
git checkout -b upgrade/nextjs-16
```

### Phase 2: Core Dependency Updates (Week 1-2)

#### 2.1 Install New Dependencies

```bash
npm install next@latest react@latest react-dom@latest
npm install next-auth@beta
npm install -D @types/react@latest @types/react-dom@latest typescript@latest
```

#### 2.2 Fix TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Phase 3: Code Modifications (Week 2-3)

#### 3.1 Update Dynamic Route Params

**Pattern to find:**
```typescript
// Search for: interface RoomPageProps { params: { ... } }
```

**Files to modify:**
1. `src/app/room/[roomId]/page.tsx` - Primary room page
2. `src/app/api/rooms/[roomId]/route.ts`
3. `src/app/api/rooms/[roomId]/invite-image/route.tsx`
4. `src/app/api/avatar/[username]/route.ts`
5. `src/app/api/user/[username]/route.ts`
6. `src/app/api/users/profile/[username]/route.ts`
7. `src/app/api/tv/[id]/route.ts`
8. `src/app/api/tmdb/find/[imdbId]/route.ts`

**Example fix:**
```typescript
// Before
interface PageProps {
  params: { roomId: string };
}
export default function Page({ params }: PageProps) {
  const roomId = params.roomId;
}

// After
interface PageProps {
  params: Promise<{ roomId: string }>;
}
export default async function Page({ params }: PageProps) {
  const { roomId } = await params;
}
```

#### 3.2 Update API Routes Using cookies()/headers()

**Pattern to find:**
```typescript
// Search for: cookies() or headers() without await
```

**Example fix:**
```typescript
// Before
import { cookies, headers } from 'next/headers';
export async function GET() {
  const token = cookies().get('token');
  const ip = headers().get('x-forwarded-for');
}

// After
import { cookies, headers } from 'next/headers';
export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get('token');
  const ip = headerStore.get('x-forwarded-for');
}
```

#### 3.3 NextAuth v5 Migration

The current `src/lib/auth.ts` uses next-auth v4 API. For v5:

1. Create new auth configuration:
```typescript
// src/auth.ts (new file)
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Credentials({ /* ... */ })],
  pages: { signIn: '/login' },
  session: { strategy: "jwt" }
})
```

2. Update route handler:
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

3. Update session usage throughout app:
```typescript
// Before
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// After
import { auth } from "@/auth"
const session = await auth()
```

#### 3.4 React 19 Compatibility

1. **useFormState / useFormStatus**:
```typescript
// May need updates for React 19 hooks
```

2. **Hydration**:
```typescript
// The app already handles suppressHydrationWarning
// Should continue to work
```

3. **ref prop**:
```typescript
// React 19 allows ref as prop directly
// Most existing code should work
```

### Phase 4: Testing (Week 3-4)

#### 4.1 Development Testing

```bash
npm run dev
```

**Key areas to test:**
- [ ] Home page loads
- [ ] User authentication (login/logout/register)
- [ ] Room creation and joining
- [ ] Video playback (YouTube, movies)
- [ ] Real-time chat
- [ ] User profile updates
- [ ] Admin dashboard
- [ ] All API endpoints

#### 4.2 Build Testing

```bash
npm run build
```

#### 4.3 Linting

```bash
npm run lint
```

### Phase 5: Production Deployment (Week 4+)

#### 5.1 Pre-deployment Checklist

- [ ] All environment variables validated
- [ ] Database migrations tested
- [ ] Error monitoring configured
- [ ] Rollback plan prepared

#### 5.2 Deployment Steps

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## Risk Assessment

| Risk Area | Severity | Mitigation |
|-----------|----------|------------|
| Async params migration | High | Systematic search & replace across all dynamic routes |
| NextAuth v5 migration | High | Thorough testing of auth flow |
| React 19 compatibility | Medium | Test all interactive components |
| Custom webpack config | Low | Test with Turbopack; most configs compatible |
| Middleware changes | Low | Edge runtime unchanged |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Preparation | 1 week | Dependency updates, branch creation |
| Core Updates | 1-2 weeks | Package installs, config updates |
| Code Modifications | 1-2 weeks | Params, cookies, auth updates |
| Testing | 1 week | Comprehensive testing |
| Deployment | 1 week | Staging → Production |

**Total: 5-7 weeks**

---

## Recommendations

### ✅ Go for Upgrade If:

1. You need the latest React 19 features (better performance, new hooks)
2. You want improved Turbopack dev experience (10x faster builds)
3. You plan to use Partial Prerendering (PPR)
4. You want better error boundaries and debugging
5. Security updates are important for your production app

### ❌ Consider Staying on Next.js 14 If:

1. You have a tight deadline (upgrade takes 5-7 weeks)
2. You rely heavily on next-auth v4 without resources to migrate
3. Your current setup is stable and production-critical
4. You have limited testing resources

### Suggested Approach:

1. **Create a test branch** and attempt the upgrade
2. **Run the build** to identify breaking changes
3. **Fix issues incrementally** as they appear
4. **Test thoroughly** before merging to main
5. **Deploy to staging** first, then production

---

## Additional Resources

- [Next.js 15 Upgrade Guide](https://nextjs.org/blog/upgrade-guide-15)
- [Next.js 16 Changelog](https://nextjs.org/blog) (check latest)
- [NextAuth v5 Beta Docs](https://next-auth-v5.vercel.app/)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19)

---

*Document generated for CinePurr upgrade planning*
*Analysis based on Next.js 14.2.35 → 15/16 migration patterns*
