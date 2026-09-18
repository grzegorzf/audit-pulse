#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo " ⚡ AuditPulse: Clean Start Engine (Purging Caches & Starting)"
echo "=========================================================="

# 1. Run full deletion and cache purge first
if [ -f "./delete.sh" ]; then
  bash ./delete.sh
fi

# Load centralized port configuration from .env if present
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "--> Loading port configuration from .env..."
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

FRONTEND_PORT="${AUDITPULSE_FRONTEND_PORT:-3840}"
BACKEND_PORT="${AUDITPULSE_BACKEND_PORT:-8840}"
POSTGRES_PORT="${AUDITPULSE_POSTGRES_PORT:-5842}"

echo ""
echo "=========================================================="
echo " 🚀 Building & Launching AuditPulse Containers"
echo "=========================================================="
echo " Services:"
echo "   - Postgres 16:      localhost:${POSTGRES_PORT}"
echo "   - Backend API/SSE:  http://localhost:${BACKEND_PORT}"
echo "   - Terminal UI:      http://localhost:${FRONTEND_PORT}"
echo "=========================================================="
echo ""

# 2. Build images with no-cache and launch containers
docker compose build --no-cache
docker compose up -d --remove-orphans

echo ""
echo "=========================================================="
echo " ✨ AuditPulse successfully started!"
echo " 🌐 Terminal UI:     http://localhost:${FRONTEND_PORT}"
echo " ⚡ Backend Stream:  http://localhost:${BACKEND_PORT}/api/v1/stream/trades"
echo " 📊 Metrics:         http://localhost:${BACKEND_PORT}/api/v1/metrics"
echo " To view live logs:  docker compose logs -f"
echo " To stop services:   ./delete.sh"
echo "=========================================================="
