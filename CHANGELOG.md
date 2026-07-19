# CinePurr Upgrade & Migration Changelog

This document details all changes made during the `upgrade/dependencies` branch migration, which modernized the stack, added Docker infrastructure, and resolved critical build/runtime issues.

## Dependency Upgrades

| Package | Old Version | New Version | Notes |
|---------|-------------|-------------|--------|
| `next` | `14.x` | `16.1.6` | Upgraded to latest Next.js 16 |
| `react` & `react-dom` | `18.x` | `19.0.0` | Upgraded to React 19 |
| `prisma` & `@prisma/client` | `5.x` | `6.0.0` | Upgraded ORM |
| `framer-motion` | `11.x` | **REMOVED** | Replaced by `motion` |
| `motion` | **ADDED** | `12.x` | Modern replacement for framer-motion |
| `jose` | `^4.15.9` | **REMOVED** | Removed in favor of `next-auth/jwt` |

## Breaking Changes & Migrations

- **Next.js 15/16 Async Params:** Applied the Next.js codemod to `page.tsx`, `layout.tsx`, and `route.ts` files. Route parameters (`params` and `searchParams`) are now strictly treated as Promises and must be `await`ed.
- **Middleware Refactor:** Renamed `middleware.ts` to `proxy.ts` to resolve edge runtime conflicts.
- **Rate Limiting:** Extracted rate limiting logic out of middleware and moved it to a dedicated endpoint at `/api/rate-limit/route.ts`.

## Architecture Changes

- **Socket Authentication Rewrite:** Removed the standalone `jose` dependency. The WebSocket server (`/server`) was completely rewritten to verify session tokens directly using `next-auth/jwt` for unified authentication.
- **Animation Engine Swap:** Replaced `framer-motion` with `motion` v12 across the entire codebase (68 files updated).
- **React 19 Hooks & Refs:** Fixed React 19 strict mode violations.
  - Applied `useRef` cleanup fixes across 15 components.
  - Fixed a `useState`/`useEffect` hooks ordering violation in `OnboardingTour.tsx` where hooks were conditionally called after an early return.
  - Refactored `AIChatbot.tsx` to use framer-motion `AnimatePresence` for smooth modal transitions instead of pure CSS.

## Bug Fixes

- **CSS Encoding Crash:** Fixed invalid UTF-8 byte characters inside `globals.css` that were corrupting the build process.
- **Turbopack Memory Exhaustion (OOM):** Resolved a critical issue where `npm run dev` with Turbopack would consume 32GB+ of RAM and crash.
  - Disabled `optimizeCss: true` (the experimental Rust optimizer couldn't handle the 75KB `globals.css`).
  - Removed a 60-line legacy Webpack `splitChunks` configuration that conflicted with Next.js 16 internals and caused infinite parsing loops in Turbopack.
  - Removed the stale `framer-motion` entry from `optimizePackageImports`.
  - Added temporary fallback to Webpack for local dev: `npm run dev --webpack` (Turbopack remains enabled for `next build`).

## Infrastructure

- **Docker Compose Setup Added:** Consolidated the App Platform setup into a single Droplet architecture.
  - Added `Dockerfile.nextjs` (Multi-stage, standalone output mode).
  - Added `Dockerfile.server` (Multi-stage, production dependencies).
  - Added `docker-compose.yml` (Next.js, socket_server, Redis, Nginx).
  - Added `nginx.conf` (Reverse proxy routing port 80/443, handling WebSocket upgrades for `/socket.io`).
  - Added `setup-swap.sh` to configure a 2GB swap file and optimize Linux memory parameters (`vm.swappiness`, `vm.vfs_cache_pressure`).

## Deferred / Pinned Dependencies

The following dependencies were intentionally **not** upgraded due to high risk of breaking core application functionality:

- **Tailwind CSS (Pinned at v3.4.19):** A patch bump was applied, but the v4 major upgrade was deferred. The 75KB `globals.css` contains extensive custom configurations and arbitrary values that require a dedicated, isolated migration phase to prevent styling regressions.
- **next-auth (Pinned at v4.24.13):** Deferred the upgrade to Auth.js v5. The application deeply integrates next-auth v4 across the entire stack, including the newly refactored socket server.
- **react-player (Pinned at v2.16.1):** Deferred the upgrade to v3. CinePurr directly accesses internal player methods (`getInternalPlayer()`, `seekTo()`) and HLS/DASH configuration objects which have fundamentally changed or been removed in v3.
- **Prisma (Pinned at v6.0.0):** Avoided newer minor/patch versions of v6 or v7 to ensure stability with the current database schema until thorough production testing is complete.
