#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker compose exec -T api python -m cms_core.cli backup --archive "/backups/site-$(date -u +%Y%m%d-%H%M%S).tar.gz"
