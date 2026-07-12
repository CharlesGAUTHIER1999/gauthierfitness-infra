#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  GauthierFitness - Monthly restore test (run LOCALLY only,
#  never on a VPS: this is the only script that needs the private
#  GPG key, which must never leave the candidate's machine)
#
#  Usage: ./restore-db-test.sh <staging|production>
#  Requirements: awscli, gpg (private key backup@gauthierfitness.fr
#                imported), docker
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

TARGET="${1:?Usage: restore-db-test.sh <staging|production>}"
ENV_FILE="${BACKUP_ENV_FILE:-./backup.env}"
# shellcheck source=/dev/null
source "$ENV_FILE"   # OVH_S3_ACCESS_KEY, OVH_S3_SECRET_KEY, OVH_S3_ENDPOINT, OVH_S3_BUCKET

# Backup filenames are tagged with the VPS hostname (hostname -s), not "staging"/"production" —
# map the friendly label to the actual hostname substring here.
case "$TARGET" in
  staging)    HOST_FILTER="${STAGING_HOSTNAME:?Set STAGING_HOSTNAME in backup.env (e.g. vps-22f8ea7f)}" ;;
  production) HOST_FILTER="${PROD_HOSTNAME:?Set PROD_HOSTNAME in backup.env (e.g. vps-a933dda1)}" ;;
  *)          HOST_FILTER="$TARGET" ;;  # allow passing the raw hostname directly too
esac

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "→ Looking up the latest backup for ${TARGET} (hostname: ${HOST_FILTER})..."
LATEST_KEY=$(AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
  aws s3api list-objects-v2 --bucket "$OVH_S3_BUCKET" --prefix "db-backups/gauthier_fitness_${TARGET}" \
  --endpoint-url "$OVH_S3_ENDPOINT" --query "sort_by(Contents,&LastModified)[-1].Key" --output text)

if [ -z "$LATEST_KEY" ] || [ "$LATEST_KEY" = "None" ]; then
  echo "No backup found for ${TARGET}"
  exit 1
fi
echo "  latest backup: $LATEST_KEY"

echo "→ Downloading..."
AWS_ACCESS_KEY_ID="$OVH_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$OVH_S3_SECRET_KEY" \
  aws s3 cp "s3://${OVH_S3_BUCKET}/${LATEST_KEY}" "$WORKDIR/backup.sql.gpg" --endpoint-url "$OVH_S3_ENDPOINT"

echo "→ Decrypting (local private key required)..."
gpg --batch --yes --output "$WORKDIR/backup.sql" --decrypt "$WORKDIR/backup.sql.gpg"

echo "→ Restoring into a disposable MySQL container..."
docker rm -f gf-restore-test >/dev/null 2>&1 || true
docker run -d --name gf-restore-test -e MYSQL_ROOT_PASSWORD=test -e MYSQL_DATABASE=restore_test \
  -p 3399:3306 mysql:8.0 >/dev/null
echo "  waiting for MySQL to start..."
# mysql:8.0 restarts internally after its init (temporary server -> final server):
# an isolated ping can succeed against the temporary server before the final
# password is in place. We require two consecutive positive pings, spaced apart,
# to be sure the final server is the one responding.
READY=0
for i in $(seq 1 40); do
  if docker exec gf-restore-test mysqladmin ping -uroot -ptest --silent 2>/dev/null; then
    sleep 3
    if docker exec gf-restore-test mysqladmin ping -uroot -ptest --silent 2>/dev/null; then
      READY=1
      break
    fi
  fi
  sleep 2
done
if [ "$READY" -ne 1 ]; then
  echo "MySQL never responded reliably"
  exit 1
fi

docker exec -i gf-restore-test mysql -uroot -ptest restore_test < "$WORKDIR/backup.sql"

TABLE_COUNT=$(docker exec gf-restore-test mysql -uroot -ptest restore_test -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='restore_test';")

echo ""
if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "Restore OK: $TABLE_COUNT tables restored from $LATEST_KEY"
else
  echo "Suspicious restore: 0 tables found"
  exit 1
fi

docker rm -f gf-restore-test >/dev/null 2>&1
echo "→ Test container cleaned up."
