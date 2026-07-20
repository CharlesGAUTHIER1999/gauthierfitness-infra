#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  GauthierFitness - Staging deployment (OVH)
#  Run by GitHub Actions runner over SSH
#  Expected variables : IMAGE_TAG, GITHUB_REPOSITORY, GITHUB_ACTOR
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/gauthierfitness-staging}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GauthierFitness - Staging deployment"
echo "  Image tag : ${IMAGE_TAG:-latest}"
echo "  Date : $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# 1. Pull the code
echo "→ Git pull (develop)..."
git pull origin develop

# 2. Pull Docker images
echo "→ Pull des images (tag: ${IMAGE_TAG:-latest})..."
export IMAGE_TAG="${IMAGE_TAG:-latest}"
$COMPOSE pull

# 3. DB migrations
echo "→ Migrations Laravel..."
$COMPOSE run --rm backend php artisan migrate --force

# 4. Restart services
echo "→ Redémarrage des conteneurs..."
$COMPOSE up -d --remove-orphans

# Restart nginx
$COMPOSE restart nginx

# Wait for backend to be ready
sleep 5

# 5. Laravel optimizations
echo "→ Optimizations (config, routes, view cache)"
$COMPOSE exec -T backend php artisan config:cache
$COMPOSE exec -T backend php artisan route:cache
$COMPOSE exec -T backend php artisan view:cache

# 6. Clean up unused images
echo "→ Docker images clean-up"
docker image prune -f

echo ""
echo "Staging deployed successfully !"
echo "URL : ${STAGING_URL:-https://staging.gauthierfitness.fr}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
