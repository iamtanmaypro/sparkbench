#!/bin/sh
# Deploy the current build to the gh-pages branch (GitHub Pages serves it at
# https://iamtanmaypro.github.io/sparkbench/). Run from the repo root:
#   sh scripts/deploy.sh
# Safe to re-run. Verifies the live bundle matches the build when it finishes.

set -eu
BRANCH=gh-pages
WORKTREE=$(mktemp -d)/gh-pages
LIVE_URL="https://iamtanmaypro.github.io/sparkbench/"

[ -z "$(git status --porcelain)" ] || { echo "Commit your changes first."; exit 1; }

echo "Building with the /sparkbench/ base path..."
npm run build:pages --silent

git fetch origin "$BRANCH" --quiet
git worktree add --quiet "$WORKTREE" "$BRANCH"
# Wipe tracked files, keep .git; then copy the fresh build in.
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/
touch "$WORKTREE/.nojekyll"   # keep Pages from hiding _-prefixed assets

SHA=$(git rev-parse --short HEAD)
(cd "$WORKTREE" && git add -A && git commit -q -m "Deploy $SHA" && git push -q origin "$BRANCH")
git worktree remove --force "$WORKTREE"

echo "Pushed. GitHub Pages usually publishes within a minute."
echo "Verify with: sh scripts/preflight.sh"
echo "Live: $LIVE_URL"
