#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  GauthierFitness - Production deployment (OVH)
#  Run by GitHub Actions runner over SSH
#  Expected variables : IMAGE_TAG, GITHUB_REPOSITORY, GITHUB_ACTOR
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/gauthierfitness}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GauthierFitness - Production Deployment"
echo "  Image tag : ${IMAGE_TAG:-latest}"
echo "  Triggered by : ${GITHUB_ACTOR:-unknown}"
echo "  Date : $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# 1. Pull the code
echo "→ Git pull (main)..."
git pull origin main

# 2. Pull images
echo "→ Pulling Docker images..."
export IMAGE_TAG="${IMAGE_TAG:-latest}"
$COMPOSE pull

# 3. Maintenance mode
echo "→ Maintenance mode enabled..."
$COMPOSE exec -T backend php artisan down --retry=5 || true

# 4. Migrations
echo "→ Laravel migrations..."
$COMPOSE run --rm backend php artisan migrate --force

# 5. Restart
echo "→ Restarting containers..."
$COMPOSE up -d --remove-orphans

# Restart nginx
$COMPOSE restart nginx

# Wait for PHP-FPM
sleep 8

# 6. Cache and optimizations
echo "→ Laravel optimizations..."
$COMPOSE exec -T backend php artisan config:cache
$COMPOSE exec -T backend php artisan route:cache
$COMPOSE exec -T backend php artisan view:cache
$COMPOSE exec -T backend php artisan event:cache

# 7. Back online
echo "→ Disabling maintenance mode..."
$COMPOSE exec -T backend php artisan up

# 8. Clean up
echo "→ Cleaning up Docker images..."
docker image prune -f

# 9. Health check
echo "→ Health check..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL:-https://gauthierfitness.fr}/api/health" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "Health check OK (HTTP $HTTP_STATUS)"
else
  echo "Health check returned HTTP $HTTP_STATUS (check manually)"
fi

echo ""
echo "Production deployed successfully !"
echo "URL : ${PROD_URL:-https://gauthierfitness.fr}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
