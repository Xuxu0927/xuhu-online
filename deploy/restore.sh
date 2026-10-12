#!/bin/sh
set -eu
if [ "$#" -ne 2 ]; then echo 'Usage: restore.sh archive-filename new-target-name'; exit 1; fi
case "$1$2" in *[!a-zA-Z0-9._-]*) echo 'Invalid filename'; exit 1;; esac
cd "$(dirname "$0")"
# Restores only into a new directory in the protected backup volume.
docker compose exec -T api python -m cms_core.cli restore --archive "/backups/$1" --target "/backups/$2"
