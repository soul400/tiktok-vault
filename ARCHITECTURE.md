# AEP — TikTok LIVE Intelligence & Battle Monitoring Platform
## Enterprise Architecture Specification

### 1. Architectural Vision & Core Principles
The **AEP TikTok LIVE Intelligence** platform is an enterprise-grade real-time monitoring, audience intelligence, battle tracking, power-up inventory, and historical analytics platform.

#### Key Principles:
1. **Connector Decoupling (Universal Event Model)**:
   - TikTok connectors (like `TikTok-Live-Connector` or alternative WebSocket/reverse-engineered proxies) are treated strictly as replaceable I/O adapters.
   - Core domain logic, databases, analytics engines, and UI layers *never* consume provider-specific data structures directly.
   - Flow:
     ```
     TikTok Provider
            ↓
     Connector Adapter (e.g. TikTokLiveConnectorAdapter)
            ↓
     Universal Event Model (Envelope + Normalized Payload)
            ↓
     Event Normalizer & Deduplication Gate
            ↓
     Redis Event Bus (Streams / PubSub)
            ↓
     Workers (Batch Persistence + Projections) & Analytics Engine
            ↓
     PostgreSQL 16/18 (Raw Ledger + Aggregations)
            ↓
     WebSocket Gateway (Throttled & Backpressure Aware)
            ↓
     Next.js 15 Dark RTL Dashboard (Zustand + TanStack Query)
     ```
2. **Evidence-Based Power-Up & Battle Tracking**:
   - Zero guessing. No fake data.
   - Power-ups operate via a rigorous State Machine:
     `DETECTED` → `CLASSIFIED` → `ACQUIRED` → `AVAILABLE` → `USED`.
   - The single source of truth for power-up inventory is the immutable append-only ledger `power_up_transactions`. Inventory balances are projected from transaction ledgers and cached, never updated ad-hoc.
   - Balance is clamped at >= 0; negative balances are strictly forbidden.
3. **High Throughput & Backpressure Resilience**:
   - High-velocity live streams emit thousands of likes, comments, and viewer counts per second.
   - No direct synchronous database writes from WebSocket handlers.
   - Pipeline uses **Redis Streams** for durable ingestion buffering, batching writes in worker pools, and adaptive sampling/throttling for UI WebSocket delivery while retaining 100% of raw events in `live_events`.
4. **Multi-Tenant / Multi-Streamer Isolation**:
   - Independent connection state machines for each tracked streamer (`@user1`, `@user2`, ...).
   - Failures or disconnections on one streamer cannot cascade or degrade monitoring of other streamers.
5. **Timezone & Temporal Integrity**:
   - Universal timestamping in **UTC** across all database columns, logs, and ledger entries.
   - User presentation strictly localized to **Asia/Riyadh** (Saudi Arabia / Makkah Time), independent of client OS timezone.
6. **Data Retention & Lifecycle (30-Day Window)**:
   - 30-day retention across raw events, sessions, transactions, and metrics.
   - Partitioning / TTL scheduled batch purges to sustain millions of events without degrading queries.

---

### 2. System Architecture & Component Hierarchy

```
                                  ┌──────────────────────────────────────────────┐
                                  │          TikTok LIVE Network Gateway         │
                                  └──────────────────────┬───────────────────────┘
                                                         │ (Signaling / WebSockets)
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │     Connector Layer (@aep/tiktok-connectors)  │
                                  │ ┌───────────────────┐  ┌───────────────────┐ │
                                  │ │ TikTokLiveAdapter │  │  Mock/Alt Adapter │ │
                                  │ └─────────┬─────────┘  └─────────┬─────────┘ │
                                  └───────────┼──────────────────────┼───────────┘
                                              └──────────┬───────────┘
                                                         │ Raw Provider Events
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │    Event Pipeline (@aep/event-pipeline)      │
                                  │  - Normalizer → Universal Event Model        │
                                  │  - Hash & ID Deduplicator                    │
                                  │  - Validation & Classification Gate          │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │         Redis Infrastructure Layer           │
                                  │  - Stream: `stream:events:raw`               │
                                  │  - PubSub: `pubsub:live:{streamerId}`        │
                                  │  - State Cache: Connection Health & Dedup    │
                                  └──────────────┬───────────────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
┌──────────────────────────────────────┐                   ┌──────────────────────────────────────┐
│       Background Ingestion Worker    │                   │       API & Realtime Gateway         │
│  (@aep/worker)                       │                   │  (@aep/api)                          │
│  - Consumer Groups for Redis Stream  │                   │  - Fastify HTTP REST Endpoints       │
│  - Batch Inserter → PostgreSQL       │                   │  - Socket.IO / WebSocket Engine      │
│  - Battle & Powerup State Machine    │                   │  - Throttled Live Feeds              │
│  - User Aggregator & Watchlist Match │                   │  - Connection Health Heartbeats      │
└──────────────────┬───────────────────┘                   └──────────────────┬───────────────────┘
                   │                                                          │
                   ▼                                                          ▼
┌──────────────────────────────────────┐                   ┌──────────────────────────────────────┐
│     PostgreSQL Database (Prisma)     │                   │       Next.js 15 Web Dashboard       │
│  - live_events (Append-only Ledger)  │                   │  (@aep/dashboard)                    │
│  - battle_sessions & participants    │                   │  - RTL-First / Dark Executive UI     │
│  - power_up_transactions & inventory │                   │  - Virtualized Event Feed & Chat     │
│  - tracked_streamers & sessions      │                   │  - Real-Time Battle / PK Matrix      │
│  - 30-Day Retention Automated Purge  │                   │  - ECharts / Recharts Analytics      │
└──────────────────────────────────────┘                   └──────────────────────────────────────┘
```

---

### 3. Monorepo Structure

We organize the codebase as a pnpm workspace with strict boundary enforcement:

```
aep-tiktok-intelligence/
├── apps/
│   ├── api/                     # Fastify REST API & Socket.IO real-time server
│   ├── dashboard/               # Next.js 15 App Router (React 19, Tailwind, RTL)
│   └── worker/                  # BullMQ / Redis Stream consumers, batch DB flush, cleanup
├── packages/
│   ├── database/                # Prisma schema, client, migrations, repository layer
│   ├── event-model/             # Universal Event types, schemas (Zod), status enums
│   ├── tiktok-connectors/       # Connector interface & adapters (TikTok-Live-Connector, Mock)
│   ├── event-pipeline/          # Normalizer, deduplication engine, event classification
│   ├── battle-intelligence/     # PK / Battle match engine (1v1, 2v2), score tracking, MVP
│   ├── powerup-inventory/       # Power-up catalog, transaction ledger, inventory state machine
│   ├── watchlist/               # Supporter / User alerts and trigger evaluation
│   ├── analytics/               # Aggregation queries, weekly rollup calculations, exports
│   ├── realtime/                # Shared WebSocket protocols, packet structures, backpressure
│   └── shared/                  # Common utilities (Riyadh timezone formatter, logger, math)
├── docker/
│   ├── docker-compose.yml       # Local dev: Postgres, Redis
│   └── Dockerfile               # Production multi-stage containers
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

### 4. Connection State Machine & Auto-Detection

Streamers are monitored in real time using a managed multi-streamer supervisor:

```
                    ┌─────────────────────────┐
                    │     OFFLINE STATE       │
                    └────────────┬────────────┘
                                 │
                     Periodic Room Check (Polling / Room Info)
                                 │
                                 ▼
                     Is Room Live Status == LIVE?
                    ┌────────────┴────────────┐
                 NO │                         │ YES
                    ▼                         ▼
         Wait Interval (Backoff)    ┌─────────────────────────┐
                                    │    CONNECTING STATE     │
                                    └────────────┬────────────┘
                                                 │
                                     Handshake & Room Join
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │       LIVE ACTIVE       │
                                    │ (Continuous Event Pump) │
                                    └────────────┬────────────┘
                                                 │
                         Stream End / Disconnect / Heartbeat Failure
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │    RECONNECTING STATE   │
                                    │ (Exponential Backoff)   │
                                    └────────────┬────────────┘
                                                 │
                       Max retries exceeded or Verified Stream End?
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │     FINALIZE SESSION    │
                                    │ (Rollup stats → OFFLINE)│
                                    └─────────────────────────┘
```

#### Multi-Streamer Supervisor Features:
- **Zero Cross-Talk**: Every streamer runs on an isolated instance of `StreamerSupervisorSession`.
- **Adaptive Polling**: When offline, checks status every 30-60s. When live, connection switches to persistent WebSocket stream.
- **Heartbeat & Telemetry**: Every connector reports metrics every 5 seconds:
  - `status`: `LIVE` | `OFFLINE` | `CONNECTING` | `DEGRADED` | `ERROR`
  - `eventsPerSec`: Current ingress throughput.
  - `latencyMs`: Approximate round-trip / processing lag.
  - `lastEventAt`: ISO timestamp of latest received packet.
  - `reconnectCount`: Number of reconnections in active session.

---

### 5. High-Throughput Ingestion & Backpressure Strategy

#### Write Path (Storage):
1. Connector receives WebSocket frame from TikTok.
2. In-memory normalizer creates Universal Event Model (`LiveEvent`).
3. Deduplicator checks sliding Redis hash (`EXPIRE 300s`).
4. Event is appended to Redis Stream `stream:events:raw`.
5. Background worker consumes batches (`XREADGROUP COUNT 500 BLOCK 2000`).
6. Worker executes `INSERT INTO live_events (...) VALUES (...)` in bulk transaction.
7. Specialized domain tables (`comment_events`, `gift_events`, `battle_events`) are populated concurrently in bulk.

#### Read Path (Real-time UI):
1. High-frequency events (Likes, Viewers) are throttled via an in-memory sliding buffer.
2. Likes: Aggregated in 1-second windows per user (e.g. "+150 likes" rather than 150 individual socket messages).
3. Chat Comments & Gifts: Broadcasted immediately or in 100ms micro-batches via Socket.IO room `stream:{streamerId}`.
4. Battle & Power-up actions: High priority, dispatched instantly to socket clients.
5. Front-end uses React virtualized list to render feeds up to 100,000 items without DOM bloat or UI freezes.
