#!/usr/bin/env bash
# Pull a copy of the live database off the Railway volume and check that it is
# readable. Run this before anything risky, and on a schedule you can keep.
#
#   tools/backup.sh [destination]
#
# Needs two things:
#   - the railway CLI, logged in, linked to the clientroom project
#   - an unencrypted SSH key registered with Railway, because volume file access
#     goes over SSH and the CLI cannot type a passphrase in a script
#
#     ssh-keygen -t ed25519 -f ~/.ssh/clientroom_backup -N ''
#     railway ssh keys add --key ~/.ssh/clientroom_backup
#
# Override the volume with CLIENTROOM_VOLUME=<id> if volume list finds the wrong one.
set -euo pipefail

DB=${DATABASE_FILE:-clientroom.db}
DEST=${1:-backups/$(date +%Y%m%d-%H%M%S)}

if [[ -z ${CLIENTROOM_VOLUME:-} ]]; then
  VOLUME=$(railway volume list --json 2>/dev/null |
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d['volumes'][0]['id'])")
else
  VOLUME=$CLIENTROOM_VOLUME
fi

echo "volume $VOLUME"
echo "destination $DEST"
mkdir -p "$DEST"

# The database runs in WAL mode. The main file alone can be missing the most
# recent writes, so the write-ahead log travels with it.
for suffix in '' '-wal' '-shm'; do
  source_path="/data/$DB$suffix"
  output=$(railway volume files --volume "$VOLUME" download "$source_path" "$DEST/$DB$suffix" 2>&1 || true)
  if grep -q 'Downloaded' <<<"$output"; then
    echo "got $DB$suffix"
  else
    echo "missing $DB$suffix (fine if the database has not been written yet)"
  fi
done

# Verify a scratch copy so the downloaded files stay exactly as they came off the
# volume. Opening the original would checkpoint it and merge the log in place.
VERIFY=$(mktemp -d)
trap 'rm -rf "$VERIFY"' EXIT
cp "$DEST/$DB" "$VERIFY/"
[[ -f $DEST/$DB-wal ]] && cp "$DEST/$DB-wal" "$VERIFY/"

if ! command -v sqlite3 >/dev/null; then
  echo "sqlite3 not installed, skipping the integrity check"
  exit 0
fi

echo "--- integrity ---"
sqlite3 "$VERIFY/$DB" 'pragma integrity_check;'

echo "--- row counts ---"
for table in users projects items share_links; do
  printf '%s %s\n' "$table" "$(sqlite3 "$VERIFY/$DB" "select count(*) from $table;")"
done

echo
echo "A copy on one laptop is not a backup against losing the laptop. Move this"
echo "directory somewhere else as well."
