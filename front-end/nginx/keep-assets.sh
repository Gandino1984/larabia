#!/bin/sh
# front-end/nginx/keep-assets.sh — runs at container start (/docker-entrypoint.d).
#
# Every build has new content-hashed file names (index-<hash>.js, chunks like
# PaisajeEditor-<hash>.js). A page opened before a deploy still asks for the
# files of ITS build when it loads code on demand; if they're gone it breaks.
# So this copies every build's /assets/ into a store (a docker volume, see
# docker-compose.yml) that keeps them KEEP_DAYS days; nginx.conf falls back to
# it for any /assets/ file the current build doesn't have.
# Never fatal: the entrypoint stops the container if a script fails, and the
# current build is served without the store anyway.
set -u

BUILD=/usr/share/nginx/html/assets
STORE=/usr/share/nginx/asset-store/assets
KEEP_DAYS=30

{
  mkdir -p "$STORE" &&
  # Copy (overwriting) the current build: this also refreshes its mtime, so
  # the files still in use never expire.
  cp -rf "$BUILD"/. "$STORE"/ &&
  # Drop what no build has shipped for KEEP_DAYS days.
  find "$STORE" -type f -mtime +"$KEEP_DAYS" -delete &&
  echo "keep-assets: $(find "$STORE" -type f | wc -l) files in the asset store"
} || echo "keep-assets: could not update the asset store (serving this build only)"
exit 0
