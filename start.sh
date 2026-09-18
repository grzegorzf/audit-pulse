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

echo ""
echo "=========================================================="
echo " 🚀 Building & Launching AuditPulse Containers"
echo "=========================================================="
echo " Services:"
echo "   - Postgres 16:      localhost:5432"
echo "   - Backend API/SSE:  http://localhost:8080"
echo "   - Terminal UI:      http://localhost:3000"
echo "=========================================================="
echo ""

# 2. Build images with no-cache and launch containers
docker compose build --no-cache
docker compose up --remove-orphans
