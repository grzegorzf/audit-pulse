# AuditPulse ⚡

> High-throughput market trade ingestion engine and real-time Dead-Letter Queue (DLQ) sequence inspector.

AuditPulse consumes raw execution ticks from Coinbase Exchange WebSocket (`wss://ws-feed.exchange.coinbase.com`), validates trade sequence continuity using Domain-Driven Design (DDD) aggregates, detects sequence gaps and schema anomalies in real time, and streams low-latency updates over Server-Sent Events (SSE) to a cyber-dense Next.js terminal interface styled with StyleX and deployed on GitHub Pages.

---

## 🏛 Architecture Overview

```text
auditpulse/
├── .github/workflows/
│   ├── backend-ci.yml                 # Java 25 Maven build & unit tests
│   └── frontend-deploy.yml            # Static export & GitHub Pages deploy
├── .npmrc                             # pnpm release age policy (minimum-release-age=2880)
├── docker-compose.yml                 # 1-click orchestration (Postgres + Backend + Frontend)
├── spec.md                            # Complete technical specification
├── auditpulse-backend/
│   ├── pom.xml                        # Root POM orchestrator (Java 25 LTS, Spring Boot 3.4.x)
│   ├── auditpulse-domain/             # Pure Java 25: 0 framework dependencies
│   │   ├── model/                     # ProductPair VO, TradeMatch, DeadLetter, SequenceTracker Aggregate
│   │   ├── event/                     # Sealed DomainEvent hierarchy (TradeIngested, SequenceGap, Duplicate)
│   │   └── port/                      # Inbound & Outbound Ports (Publisher, DlqRepo, Metrics)
│   ├── auditpulse-application/        # Application Orchestration & Use Cases
│   │   ├── usecase/                   # IngestTradeUseCase, QueryDlqUseCase, ReconcileDlqUseCase, StreamMetricsUseCase
│   │   └── dto/                       # IngestionCommand, MetricsSnapshot
│   ├── auditpulse-infrastructure/     # Netty WS, SSE Controllers, Ring Buffer, Record Pattern Deserializer
│   └── auditpulse-boot/               # Spring Boot Application & Bean Wiring (Virtual Threads)
└── auditpulse-frontend/
    ├── package.json                   # Next.js 14, React 18, @stylexjs/stylex, @tanstack/react-virtual
    ├── next.config.mjs                # output: 'export', distDir: 'out', StyleX plugin
    └── src/
        ├── app/                       # Cyber-dense terminal dashboard
        ├── components/                # Virtual list table, DLQ inspection drawer, Sparkline, JSON Diff Modal
        ├── styles/tokens.stylex.ts    # StyleX cyberpunk design tokens
        ├── lib/                       # SSE client, Zustand state store, TypeScript types
        └── worker/                    # Web Worker simulation & intentional sequence gap injection
```

---

## 🚀 Quickstart & Running Locally

### Centralized Port Configuration (`.env`)
AuditPulse uses dedicated, collision-resistant unique ports defined centrally in `.env`:
* **Frontend UI (Next.js + StyleX):** `${AUDITPULSE_FRONTEND_PORT:-3840}` → [http://localhost:3840](http://localhost:3840)
* **Backend API & SSE (Spring Boot):** `${AUDITPULSE_BACKEND_PORT:-8840}` → [http://localhost:8840](http://localhost:8840)
* **PostgreSQL 16:** `${AUDITPULSE_POSTGRES_PORT:-5842}` → `localhost:5842`

---

### Option 1: 1-Click Docker Compose
```bash
./start.sh
# or: docker compose up --build
```
- **Terminal UI:** [http://localhost:3840](http://localhost:3840)
- **Spring Boot API & SSE:** [http://localhost:8840](http://localhost:8840)
- **Postgres Database:** `localhost:5842`

To completely purge all containers, images, volumes, and caches:
```bash
./delete.sh
```

---

### Option 2: Run Backend & Frontend Separately

#### 1. Backend (Java 25 LTS)
```bash
cd auditpulse-backend
mvn clean test
mvn spring-boot:run -pl auditpulse-boot
```
API runs on `http://localhost:8840`:
- `GET /api/v1/stream/trades?product=BTC-USD` (SSE Trade Stream)
- `GET /api/v1/stream/dlq` (SSE Anomaly & Gap Stream)
- `GET /api/v1/stream/metrics` (SSE Telemetry Stream every 1000ms)
- `GET /api/v1/dlq` (REST Filtered Quarantined Entries)
- `POST /api/v1/dlq/{id}/reconcile` (REST Reconciliation)

#### 2. Frontend (Next.js + StyleX)
```bash
cd auditpulse-frontend
pnpm install --frozen-lockfile
pnpm dev
```
Open [http://localhost:3840](http://localhost:3840).

#### 3. Static Export for GitHub Pages
```bash
cd auditpulse-frontend
pnpm build
```
Generates fully static HTML/JS/CSS assets in `out/` with zero runtime Node.js dependency.

---

## 🧪 Verification & Acceptance Criteria Met

- [x] **Clean Architecture:** `auditpulse-domain` has zero third-party dependencies outside standard Java 25 library (`CleanArchitectureRuleTest` verifies every import).
- [x] **Java 25 Features:** Record patterns and switch expressions used for polymorphic WebSocket message deserialization. Sealed interfaces used for domain events and messages. Virtual threads enabled in Spring Boot.
- [x] **pnpm Policy:** `.npmrc` enforces `minimum-release-age=2880` (48 hours) and `prefer-frozen-lockfile=true`.
- [x] **StyleX Zero-Runtime Styling:** Meta's StyleX compiled via Babel and `@stylexjs/nextjs-plugin` with design tokens.
- [x] **Static Export:** Next.js static export generates `out/` directory ready for GitHub Pages with Web Worker fallback engine.
- [x] **One-Liner Run:** `docker compose up` provisions backend, frontend, and PostgreSQL.
