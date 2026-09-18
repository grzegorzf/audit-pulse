# AuditPulse — Technical Specification (`spec.md`)

## 1. System Overview & Objectives
**AuditPulse** is a high-throughput market trade ingestion engine and real-time Dead-Letter Queue (DLQ) inspector. It consumes raw execution ticks from the Coinbase Exchange WebSocket, validates trade sequence continuity using Domain-Driven Design (DDD) aggregates, detects anomalies/gaps, and streams low-latency updates to a Next.js static terminal interface deployed on GitHub Pages.

---

## 2. Technical Stack & Constraints

### 2.1 Backend
* **Runtime:** Java 25 LTS (utilizing Virtual Threads, Record Patterns, Sealed Interfaces).
* **Framework:** Spring Boot 4.x / 3.4.x (Reactive WebFlux / Reactor Netty).
* **Architecture:** Multi-module Hexagonal / Clean DDD (strictly isolated domain).
* **Protocol Inbound:** Coinbase Public WebSocket (`wss://ws-feed.exchange.coinbase.com`).
* **Protocol Outbound:** Server-Sent Events (SSE) / Reactive WebSocket (`text/event-stream`).

### 2.2 Frontend
* **Framework:** Next.js (App Router, static export `output: 'export'`).
* **Package Manager:** `pnpm` with strict minimum age governance (`minimum-release-age=2880` in `.npmrc`).
* **UI/Styles:** StyleX (`@stylexjs/stylex`), Radix UI primitives, Lucide Icons.
* **Streaming & State:** TanStack Virtual (for 100k+ item scrolling), Web Workers for fallback replay, SWR/Zustand for live state.
* **Target Deployment:** GitHub Pages (fully static root or sub-path).

---

## 3. Monorepo & Module Organization

```text
auditpulse/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml           # Java 25 Maven build & unit tests
│       └── frontend-deploy.yml      # Static Next.js export to GitHub Pages
├── .npmrc                           # pnpm security & release age gating
├── docker-compose.yml               # 1-click local setup (Postgres + Backend + UI)
├── spec.md
├── auditpulse-backend/
│   ├── pom.xml                      # Maven root orchestrator (Java 25)
│   ├── auditpulse-domain/           # Pure Java 25: 0 framework dependencies
│   │   └── src/main/java/com/auditpulse/domain/
│   │       ├── model/               # Aggregates, Entities, Value Objects
│   │       └── port/                # Inbound & Outbound interfaces
│   ├── auditpulse-application/      # Application orchestration & use cases
│   │   └── src/main/java/com/auditpulse/application/
│   ├── auditpulse-infrastructure/   # Adapters: Netty WS, SSE controllers, In-memory ring buffer
│   │   └── src/main/java/com/auditpulse/infrastructure/
│   └── auditpulse-boot/             # Entry point (@SpringBootApplication)
└── auditpulse-frontend/
    ├── package.json
    ├── next.config.mjs              # output: 'export', basePath configured
    └── src/
        ├── app/                     # Next.js App Router (layout, page)
        ├── components/              # Terminal layout, virtual list, stat cards
        ├── styles/                  # StyleX tokens and styles
        ├── lib/                     # SSE client, Coinbase mock generator
        └── worker/                  # Web Worker for client-side demo replay
```

---

## 4. Domain-Driven Design (DDD) Specifications

### 4.1 Domain Aggregates & Value Objects (`auditpulse-domain`)

* **`ProductPair` (Value Object):** Validated market symbol (e.g., `BTC-USD`, `ETH-USD`).
* **`TradeMatch` (Entity):**
  * `tradeId`: `long`
  * `sequence`: `long`
  * `price`: `BigDecimal`
  * `size`: `BigDecimal`
  * `side`: Enum `BUY` | `SELL`
  * `timestamp`: `Instant`
* **`SequenceTracker` (Domain Aggregate):**
  * Tracks monotonic continuity of Coinbase message sequences per `ProductPair`.
  * **Invariant:** `nextExpectedSequence == currentSequence + 1`.
  * If `currentSequence > nextExpectedSequence`, emits `SequenceGapDetectedEvent`.
  * If `currentSequence < nextExpectedSequence`, emits `DuplicateTradeEvent`.
* **`DeadLetter` (Entity):**
  * Captures malformed payloads, out-of-order sequence gaps, or desynchronized events with root cause: `GAP_DETECTED`, `SCHEMA_VIOLATION`, `UNEXPECTED_PAYLOAD`.

### 4.2 Application Use Cases (`auditpulse-application`)

* `IngestTradeUseCase`: Validates incoming payload, passes it to the `SequenceTracker`, emits a domain event to either the live stream port or the DLQ port.
* `QueryDlqUseCase`: Returns paginated and filtered dead-letter entries.
* `StreamMetricsUseCase`: Calculates a sliding 5-second window of events/second, gap rates, and latency.

---

## 5. API & Ingestion Contract

### 5.1 Inbound: Coinbase WebSocket Subscription

```json
{
  "type": "subscribe",
  "product_ids": ["BTC-USD", "ETH-USD"],
  "channels": ["matches", "heartbeat"]
}
```

### 5.2 Outbound SSE Endpoints (Spring Boot)

* `GET /api/v1/stream/trades?product=BTC-USD`
  * **Content-Type:** `text/event-stream`
  * Emits parsed `TradeMatch` events.
* `GET /api/v1/stream/dlq`
  * **Content-Type:** `text/event-stream`
  * Emits quarantined events whenever the sequence aggregate detects an anomaly.
* `GET /api/v1/stream/metrics`
  * Emits JSON payload every 1000ms:
```json
{
  "eventsPerSecond": 420,
  "totalProcessed": 125032,
  "quarantinedCount": 4,
  "lastSequence": 4920491823,
  "latencyMs": 14
}
```

---

## 6. Frontend Requirements & GitHub Pages Compatibility

### 6.1 Configuration Standards

* **`.npmrc`:**
```ini
package-manager-strict-version=true
prefer-frozen-lockfile=true
minimum-release-age=2880
```

* **`next.config.mjs`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || ''
};
export default nextConfig;
```

### 6.2 Resilient Client Ingestion (Live vs. Demo Mode)

1. **Live Mode:** Attempts connection to the Spring Boot backend (`NEXT_PUBLIC_API_URL` or `http://localhost:8080`).
2. **Fallback / Offline Replay (Web Worker):** If the backend SSE fails or is unconfigured (standard on GitHub Pages), an internal Web Worker spins up, simulating the Coinbase WebSocket feed with controlled, intentional sequence gaps to demonstrate the DLQ and virtualized viewer without requiring a running JVM.

### 6.3 UI Layout (Cyber-Dense Terminal Aesthetic)

* **Header / Telemetry Bar:**
  * Ingestion Status (`ONLINE` / `DEGRADED` / `MOCK_ACTIVE`).
  * Live throughput pill (`ev/s`), Memory footprint, Sequence Counter.
  * Target Selector dropdown (`Localhost:8080`, `Cloud JVM API`, `Browser Mock Engine`).
* **Main Pane (Left 60%):** Virtualized trade stream table. Rows flash green (`BUY`) and red (`SELL`).
* **DLQ & Inspection Drawer (Right 40%):**
  * Upper: Real-time throughput line sparkline (events/sec vs. sequence drops).
  * Lower: Quarantined trade table. Clicking an item opens a JSON diff modal comparing `expected_sequence` vs `received_sequence` with an action button to simulate reconciliation.

---

## 7. Verification & Acceptance Criteria

* [ ] **Clean Architecture:** `auditpulse-domain` has zero dependencies on Spring or third-party libraries outside Java 25 standard library.
* [ ] **Java 25 Features:** Utilizes record patterns and switch expressions for deserializing polymorphic WebSocket frames.
* [ ] **pnpm Policy:** Lockfile verification passes and rejects any dependency published less than 48 hours ago.
* [ ] **Static Export:** `pnpm build` produces a static `out/` directory deployable to GitHub Pages with zero hydration errors or runtime dependencies.
* [ ] **One-Liner Run:** Running `docker compose up` compiles the Spring Boot backend and serves the application locally with sample configurations.
