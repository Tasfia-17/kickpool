#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
LOCK_FILE="$REPO_ROOT/.deploy.lock"

log() {
  printf '[deploy-prod] %s\n' "$*"
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another deploy is already running. Skipping."
  exit 0
fi

cd "$REPO_ROOT"

if ! git diff --quiet --ignore-submodules HEAD --; then
  log "Working tree has local changes. Refusing to deploy over them."
  exit 1
fi

log "Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  log "Already up to date at $LOCAL_SHA"
  exit 0
fi

log "Updating $BRANCH from $LOCAL_SHA to $REMOTE_SHA"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Rebuilding and restarting Docker services"
docker compose up -d --build --remove-orphans

log "Current container status"
docker compose ps
