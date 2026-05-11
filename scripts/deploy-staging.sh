#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  GauthierFitness — Déploiement Staging (OVH)
#  Exécuté par le runner GitHub Actions via SSH (appleboy/ssh-action)
#  Variables attendues : IMAGE_TAG, GITHUB_REPOSITORY, GITHUB_ACTOR
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/gauthierfitness-staging}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀  GauthierFitness — Déploiement Staging"
echo "  📦  Image tag : ${IMAGE_TAG:-latest}"
echo "  📅  Date : $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

# 1. Pull du code (pour docker-compose.yml mis à jour)
echo "→ Git pull..."
git pull origin develop

# 2. Pull des images Docker
echo "→ Pull des images (tag: ${IMAGE_TAG:-latest})..."
export IMAGE_TAG="${IMAGE_TAG:-latest}"
$COMPOSE pull

# 3. Migrations DB
echo "→ Migrations Laravel..."
$COMPOSE run --rm backend php artisan migrate --force

# 4. Redémarrage des services
echo "→ Redémarrage des conteneurs..."
$COMPOSE up -d --remove-orphans

# Attendre que le backend soit prêt
sleep 5

# 5. Optimisations Laravel
echo "→ Optimisations (config, route, view cache)..."
$COMPOSE exec -T backend php artisan config:cache
$COMPOSE exec -T backend php artisan route:cache
$COMPOSE exec -T backend php artisan view:cache

# 6. Nettoyage images inutilisées
echo "→ Nettoyage images Docker..."
docker image prune -f

echo ""
echo "✅  Staging déployé avec succès !"
echo "🔗  URL : ${STAGING_URL:-https://staging.gauthierfitness.fr}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
