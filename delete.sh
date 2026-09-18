#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo " 🧹 AuditPulse Docker Cleanup: Removing Images, Volumes & Caches"
echo "=========================================================="

# 1. Stop and remove containers, networks, and volumes defined in compose
echo "--> Stopping and removing Docker Compose containers, networks & volumes..."
docker compose down -v --remove-orphans 2>/dev/null || true

# 2. Force remove specific project containers if lingering
echo "--> Removing any lingering containers..."
docker rm -f auditpulse-frontend auditpulse-backend auditpulse-postgres 2>/dev/null || true

# 3. Remove associated Docker images
echo "--> Removing AuditPulse Docker images..."
docker rmi -f \
  auditpulse-frontend \
  auditpulse-backend \
  audit-pulse-frontend \
  audit-pulse-backend \
  auditpulse-postgres \
  postgres:16-alpine 2>/dev/null || true

# 4. Remove associated volumes
echo "--> Removing Docker volumes..."
docker volume rm -f auditpulse_postgres-data audit-pulse_postgres-data 2>/dev/null || true

# 5. Prune build cache
echo "--> Pruning Docker build cache..."
docker builder prune -f || true

# 6. Remove local transient artifacts
echo "--> Cleaning local cache directories (.next, out, target)..."
rm -rf auditpulse-frontend/.next auditpulse-frontend/out auditpulse-backend/target auditpulse-backend/*/target

echo "=========================================================="
echo " ✅ Cleanup complete! All associated images, volumes & caches removed."
echo "=========================================================="
