#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  GauthierFitness - Test de restauration mensuel (à lancer EN LOCAL,
#  jamais sur un VPS : c'est le seul script qui a besoin de la clé
#  privée GPG, qui ne doit jamais quitter le poste du candidat)
#
#  Usage : ./restore-db-test.sh <staging|production>
#  Prérequis : awscli, gpg (clé privée backup@gauthierfitness.fr
#              importée), docker
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

TARGET="${1:?Usage: restore-db-test.sh <staging|production>}"
ENV_FILE="${BACKUP_ENV_FILE:-./backup.env}"
# shellcheck source=/dev/null
source "$ENV_FILE"   # OVH_S3_ACCESS_KEY, OVH_S3_SECRET_KEY, OVH_S3_ENDPOINT, OVH_S3_BUCKET

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "→ Recherche du dernier backup pour ${TARGET}..."
LATEST_KEY=$(AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
  aws s3api list-objects-v2 --bucket "$OVH_S3_BUCKET" --prefix "db-backups/gauthier_fitness_${TARGET}" \
  --endpoint-url "$OVH_S3_ENDPOINT" --query "sort_by(Contents,&LastModified)[-1].Key" --output text)

if [ -z "$LATEST_KEY" ] || [ "$LATEST_KEY" = "None" ]; then
  echo "❌ Aucun backup trouvé pour ${TARGET}"
  exit 1
fi
echo "  dernier backup : $LATEST_KEY"

echo "→ Téléchargement..."
AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
  aws s3 cp "s3://${OVH_S3_BUCKET}/${LATEST_KEY}" "$WORKDIR/backup.sql.gpg" --endpoint-url "$OVH_S3_ENDPOINT"

echo "→ Déchiffrement (clé privée locale requise)..."
gpg --batch --yes --output "$WORKDIR/backup.sql" --decrypt "$WORKDIR/backup.sql.gpg"

echo "→ Restauration dans un conteneur MySQL jetable..."
docker rm -f gf-restore-test >/dev/null 2>&1 || true
docker run -d --name gf-restore-test -e MYSQL_ROOT_PASSWORD=test -e MYSQL_DATABASE=restore_test \
  -p 3399:3306 mysql:8.0 >/dev/null
echo "  attente du démarrage MySQL..."
for i in $(seq 1 30); do
  docker exec gf-restore-test mysqladmin ping -uroot -ptest --silent 2>/dev/null && break
  sleep 2
done

docker exec -i gf-restore-test mysql -uroot -ptest restore_test < "$WORKDIR/backup.sql"

TABLE_COUNT=$(docker exec gf-restore-test mysql -uroot -ptest restore_test -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='restore_test';")

echo ""
if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✅  Restauration OK : $TABLE_COUNT tables restaurées depuis $LATEST_KEY"
else
  echo "❌  Restauration suspecte : 0 table trouvée"
  exit 1
fi

docker rm -f gf-restore-test >/dev/null 2>&1
echo "→ Conteneur de test nettoyé."
