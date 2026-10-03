# AEP — TikTok LIVE Intelligence & Battle Monitoring Platform
## Master Implementation Plan & Execution Roadmap

### 1. Repository Audit Summary & Environment Baseline
- **Location**: `c:\Users\soulm\Desktop\tiktok`
- **Baseline State**: Fresh directory, ready for monorepo scaffolding.
- **System Tooling**:
  - Node.js v22.17.1, pnpm v10.33.0, npm v11.6.0, Git v2.49.0.
  - PostgreSQL 18 service (`postgresql-x64-18`) is active and running locally on port 5432.
  - Redis binaries available at `c:\Users\soulm\Desktop\redis` (redis-server.exe / redis-cli.exe).
  - Primary connector npm package `tiktok-live-connector` verified at current stable `v2.5.0`.

---

### 2. Multi-Stage Execution Plan

#### Stage 1: Monorepo Scaffolding & Shared Infrastructure
- Setup pnpm workspace (`pnpm-workspace.yaml`, root `package.json`, root `tsconfig.base.json`).
- Packages to scaffold:
  - `packages/shared`: Logger, Riyadh Timezone helper (`Intl.DateTimeFormat` / `date-fns-tz`), utility functions.
  - `packages/event-model`: TypeScript interfaces, Zod schemas, Universal Event Model definitions.
  - `packages/database`: Prisma schema (`schema.prisma`), client generator, seeding scripts (power-up catalog, gift catalog).

#### Stage 2: Database Layer & Prisma Migrations
- Implement schema with all 20+ models:
  - `TrackedStreamer`, `LiveSession`, `User`, `LiveEvent`, `CommentEvent`, `LikeEvent`, `ShareEvent`, `GiftEvent`, `GiftCatalog`, `BattleSession`, `BattleParticipant`, `BattleEvent`, `PowerUpCatalog`, `UserPowerUpInventory`, `PowerUpTransaction`, `Watchlist`, `StreamSessionStats`, `WeeklyPowerUpSnapshot`.
- Setup migration and verify against PostgreSQL 18.
- Seed default `PowerUpCatalog` (Gloves, Mist, Thunder, Boost x2, Boost x3, Extra Time, Match Guide).

#### Stage 3: Connector Abstraction Layer (`@aep/tiktok-connectors`)
- Interface `ITikTokLiveConnector` with standardized lifecycle:
  - `connect(username, options)`, `disconnect()`, `getRoomInfo()`, event listeners.
- Production Adapter: `TikTokLiveConnectorAdapter` wrapping `tiktok-live-connector` v2.5.0.
- Simulation/Testing Adapter: `MockTikTokLiveConnectorAdapter` providing deterministic live event streams for automated verification without relying on external network conditions.
- Connection Health telemetry tracker (latency, events/sec, reconnect counter).

#### Stage 4: Event Pipeline, Deduplication & Redis Bus (`@aep/event-pipeline`)
- Event Normalizer: Converts raw connector frames into `LiveEventEnvelope`.
- Deduplication Engine: Redis sliding-window key check (`SET NX EX 300`) preventing double-counting of gifts, likes, and battle frames.
- Stream Publisher: Ingests normalized events to Redis Stream `stream:events:raw`.

#### Stage 5: Ingestion Worker & Power-Up / Battle Engines (`apps/worker`)
- Redis Stream consumer group reading event batches.
- Bulk persistence to PostgreSQL (`live_events` ledger + domain tables).
- Battle State Machine: Tracking 1v1 and 2v2 rounds, team scores, MVPs, and contributors.
- Power-Up Engine:
  - Transaction-ledger-based double entry.
  - Inventory update with \(\ge 0\) validation.
  - Weekly snapshot builder and 30-day retention cleanup cron.

#### Stage 6: REST API & Real-Time Gateway (`apps/api`)
- Fastify server with full API suite (streamers, sessions, battles, power-ups, watchlists, users, analytics).
- Socket.IO gateway with rooms per streamer (`stream:{streamerId}`) and global alerts (`alerts:powerup`, `alerts:watchlist`).
- Backpressure manager: Throttles high-frequency likes and viewer counts while dispatching gifts, comments, and battle/power-up frames instantaneously.

#### Stage 7: Executive Web Dashboard (`apps/dashboard`)
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide icons.
- Arabic-first RTL design (`<html lang="ar" dir="rtl">`) with dark executive aesthetics.
- Features:
  - Streamers Monitor: Add `@username`, auto-detect live/offline status, multi-streamer grid.
  - Live Room Dashboard: Real-time viewer count, virtualized live feed, battle matrix, supporter leaderboard.
  - Battle Intelligence View: 1v1 & 2v2 active battles, score bars, team contributors, MVP highlights.
  - Power-Up Inventory & Ledger: User inventory cards, transaction history, weekly archive snapshots.
  - Watchlist Manager: Flag VIP supporters with custom alert toggles.
  - Analytics & Data Export: Session summaries, CSV/JSON export, 30-day historical exploration.

#### Stage 8: Rigorous End-to-End Automated Testing
- Unit tests: Deduplication, Gift combo calculation, Power-up non-negative inventory clamp.
- Integration tests: Connect/disconnect lifecycle, Battle score aggregation, Weekly snapshot generation, 30-day retention purge.
