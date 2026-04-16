#!/bin/bash
cd /home/audira/pjtaudirabot

# Find the production database network
NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' pjtaudi-db | head -n1)

echo "Using network: $NET"

# 1. Cleanup stalled records
echo "Cleaning up stalled migrations..."
docker exec pjtaudi-db psql -U pjtaudi -d pjtaudi -c "DELETE FROM \"_prisma_migrations\" WHERE finished_at IS NULL;"

# 2. Resolve 'ticket_clustering'
echo "Resolving ticket_clustering..."
docker run --rm \
  --network "$NET" \
  --env-file .env.production \
  --env-file ~/.config/pjtaudi/secrets.env \
  -v /home/audira/pjtaudirabot:/workspace \
  -w /workspace \
  node:20 \
  sh -lc "npm i -g pnpm >/dev/null 2>&1 && pnpm install --frozen-lockfile --ignore-scripts >/dev/null && pnpm --filter @pjtaudirabot/database exec prisma migrate resolve --applied ticket_clustering --schema /workspace/packages/database/schema.prisma"

# 3. Resolve '20260415225655_sla_alignment_expansion'
echo "Resolving 20260415225655_sla_alignment_expansion..."
docker run --rm \
  --network "$NET" \
  --env-file .env.production \
  --env-file ~/.config/pjtaudi/secrets.env \
  -v /home/audira/pjtaudirabot:/workspace \
  -w /workspace \
  node:20 \
  sh -lc "npm i -g pnpm >/dev/null 2>&1 && pnpm install --frozen-lockfile --ignore-scripts >/dev/null && pnpm --filter @pjtaudirabot/database exec prisma migrate resolve --applied 20260415225655_sla_alignment_expansion --schema /workspace/packages/database/schema.prisma"

echo "Prisma recovery completed."
