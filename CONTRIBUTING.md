# Contributing to AuditPulse

Thank you for your interest in contributing to **AuditPulse**! We welcome contributions from developers of all skill levels.

---

## Architectural Principles

AuditPulse is built around **Clean Domain-Driven Design (DDD)** and **Clean Architecture**:

1. **Separation of Concerns:**
   - **Domain Layer:** Pure business entities, invariants, and ports. Zero framework or third-party I/O dependencies.
   - **Application Layer:** Orchestrates use cases and transaction boundaries using injected repository/stream ports.
   - **Infrastructure Layer:** Framework-specific adapters (Spring WebFlux, Netty WebSocket, PostgreSQL R2DBC/JPA, Next.js Web Worker).
   - **Interface Layer:** HTTP REST controllers, Server-Sent Events (SSE) endpoints, and Web Worker message dispatchers.

2. **Dual-Execution Mode:**
   - **Full Backend Mode (Docker / Local):** High-throughput Java 25 LTS reactive pipeline ingesting live Coinbase WebSocket frames, persisting quarantined items to PostgreSQL, and broadcasting via Reactor Netty SSE.
   - **Mock Engine Mode (GitHub Pages / Isolated):** Multi-layered browser engine executing entirely inside a dedicated Web Worker using the exact same DDD layering (Domain, Application, Infrastructure, Interface).

---

## Local Development Setup

### Prerequisites
- **Java 25 LTS** (or Java 21 LTS with preview enabled)
- **Apache Maven 3.9+**
- **Node.js 22 LTS** and **pnpm 11.18+**
- **Docker & Docker Compose** (for multi-container orchestration)

### Quick Start with Docker
```bash
# Start all services (frontend on :3840, backend on :8840, postgres on :5842)
./start.sh

# Clean up all containers, images, volumes, and build caches
./delete.sh
```

### Running Backend Locally
```bash
cd auditpulse-backend
mvn clean verify
mvn --projects auditpulse-boot spring-boot:run
```

### Running Frontend Locally
```bash
cd auditpulse-frontend
pnpm install
pnpm dev
```

---

## Testing Standards

All code contributions must be accompanied by comprehensive tests:

### Backend Tests
```bash
cd auditpulse-backend
mvn clean test
```
- Unit tests for domain models and sequence trackers.
- Use case tests using Mockito.
- Slice tests for WebFlux controllers and serialization logic.

### Frontend & Mock Engine Tests
```bash
cd auditpulse-frontend
pnpm test
pnpm tsc --noEmit
```
- Unit tests for the multi-layered mock engine (`src/mock-engine/__tests__/`).
- Type verification with strict TypeScript compiler checks.

---

## Commit Guidelines

- Write concise, imperative commit messages: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`.
- Keep commits focused on a single logical change.
- Ensure all CI checks pass before submitting a pull request.
