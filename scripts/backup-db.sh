#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  GauthierFitness - Daily encrypted backup of the MySQL database
#  Run via cron (03:00) on each VPS (staging and production)
#  Requirements: awscli installed, GPG public key imported, file
#                /etc/gauthierfitness/backup.env (chmod 600, root only)
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/gauthierfitness}"
ENV_FILE="${BACKUP_ENV_FILE:-/etc/gauthierfitness/backup.env}"
GPG_RECIPIENT="backup@gauthierfitness.fr"
COMPOSE="docker compose"

# shellcheck source=/dev/null
source "$ENV_FILE"   # OVH_S3_ACCESS_KEY, OVH_S3_SECRET_KEY, OVH_S3_ENDPOINT, OVH_S3_BUCKET
# shellcheck source=/dev/null
source "$APP_DIR/.env"  # DB_DATABASE, DB_ROOT_PASSWORD

TIMESTAMP="$(date '+%Y-%m-%d_%H%M%S')"
HOSTNAME_TAG="$(hostname -s)"
WORKDIR="$(mktemp -d)"
DUMP_FILE="$WORKDIR/${DB_DATABASE}_${HOSTNAME_TAG}_${TIMESTAMP}.sql"
ENC_FILE="${DUMP_FILE}.gpg"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GauthierFitness - Backup DB ($HOSTNAME_TAG)"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$APP_DIR"

echo "→ Dump MySQL (${DB_DATABASE})..."
$COMPOSE exec -T db mysqldump -u root -p"${DB_ROOT_PASSWORD}" \
  --single-transaction --routines --triggers "${DB_DATABASE}" > "$DUMP_FILE"

echo "→ GPG encryption (recipient: ${GPG_RECIPIENT})..."
gpg --batch --yes --trust-model always \
  --recipient "$GPG_RECIPIENT" --encrypt --output "$ENC_FILE" "$DUMP_FILE"
shred -u "$DUMP_FILE" 2>/dev/null || rm -f "$DUMP_FILE"

echo "→ Uploading to OVH object storage (off-VPS)..."
AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
aws s3 cp "$ENC_FILE" "s3://${OVH_S3_BUCKET}/db-backups/$(basename "$ENC_FILE")" \
  --endpoint-url "$OVH_S3_ENDPOINT"

echo "→ Purging remote backups older than 30 days..."
CUTOFF="$(date -d '30 days ago' '+%Y-%m-%d' 2>/dev/null || date -v-30d '+%Y-%m-%d')"
AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
aws s3api list-objects-v2 --bucket "$OVH_S3_BUCKET" --prefix "db-backups/${DB_DATABASE}_${HOSTNAME_TAG}_" \
  --endpoint-url "$OVH_S3_ENDPOINT" --query "Contents[?LastModified<='${CUTOFF}'].Key" --output text 2>/dev/null \
  | tr '\t' '\n' | while read -r key; do
    [ -n "$key" ] && AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
      aws s3 rm "s3://${OVH_S3_BUCKET}/${key}" --endpoint-url "$OVH_S3_ENDPOINT" && echo "  deleted: $key"
  done

echo ""
echo "✅  Encrypted backup complete: $(basename "$ENC_FILE")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
