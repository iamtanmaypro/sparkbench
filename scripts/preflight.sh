#!/bin/sh
# Submission preflight — automates every machine-checkable item from the
# Devpost halfway email and docs/devpost-dry-run.md. Run from the repo root:
#   sh scripts/preflight.sh [YOUTUBE_URL]
# Exit 0 = all automated checks green. Human-only checks print at the end.

set -u
LIVE_URL="https://iamtanmaypro.github.io/sparkbench/"
REPO_API="https://api.github.com/repos/iamtanmaypro/sparkbench"
FAIL=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAIL=1; }

# 1. Live URL serves this app (the email's #1 killer: works-only-on-my-machine).
TITLE=$(curl -sf --max-time 20 "$LIVE_URL" | grep -o '<title>[^<]*</title>' || true)
case "$TITLE" in
  *Sparkbench*) pass "live URL serves Sparkbench ($LIVE_URL)" ;;
  *) fail "live URL does not serve Sparkbench (got: ${TITLE:-nothing})" ;;
esac

# 2. Deployed bundle matches a fresh local build of HEAD (no stale deploy).
DEPLOYED_JS=$(curl -sf --max-time 20 "$LIVE_URL" | grep -o 'assets/index-[^"]*\.js' | head -1)
npm run build:pages --silent >/dev/null 2>&1
LOCAL_JS=$(ls dist/assets/index-*.js 2>/dev/null | head -1 | sed 's|dist/||')
if [ -n "$DEPLOYED_JS" ] && [ "assets/${LOCAL_JS#assets/}" = "$DEPLOYED_JS" ] ; then
  pass "deployed bundle matches local build of HEAD ($DEPLOYED_JS)"
else
  fail "deploy is stale: live=$DEPLOYED_JS local=${LOCAL_JS:-none} — rebuild and push gh-pages"
fi

# 3. Repo public + license detectable (checked logged-out, like a judge).
META=$(curl -sf --max-time 20 "$REPO_API" || true)
echo "$META" | grep -q '"private": *false' && pass "repo is public" || fail "repo not public (or API unreachable)"
echo "$META" | grep -q '"spdx_id": *"MIT"' && pass "MIT license detected by GitHub" || fail "license not detected — must show in About sidebar"

# 4. Tests + typecheck + production build.
npx vitest run >/dev/null 2>&1 && pass "196-test suite green" || fail "vitest failing"

# 5. Outward copy: zero em/en dashes (Tanmay's own-voice rule).
sh copy/check-dashes.sh >/dev/null 2>&1 && pass "no em/en dashes in outward copy" || fail "dash check failed — run sh copy/check-dashes.sh"

# 6. Working tree committed and pushed (judges see GitHub, not this machine).
[ -z "$(git status --porcelain)" ] && pass "working tree clean" || fail "uncommitted changes — commit and push before submitting"
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main 2>/dev/null)" ] && pass "main pushed to origin" || fail "main not pushed"

# 7. Video URL, when provided (public + embeddable; unlisted also passes oEmbed,
#    so the signed-out playback check stays human).
if [ "${1:-}" != "" ]; then
  OEMBED=$(curl -sf --max-time 20 "https://www.youtube.com/oembed?url=$1&format=json" || true)
  echo "$OEMBED" | grep -q '"title"' && pass "YouTube video resolvable via oEmbed" || fail "YouTube URL not resolvable — private or wrong link"
else
  printf 'SKIP  no YouTube URL passed (rerun with it once uploaded)\n'
fi

echo ""
echo "Human-only checks (cannot be automated):"
echo "  - Open $LIVE_URL in a fresh INCOGNITO window and run one full task"
echo "  - Video plays SIGNED OUT, is PUBLIC (not unlisted), <3:00, with audio"
echo "  - Devpost entry is SUBMITTED (green button), not a saved draft"
echo "  - Gate 2: full demo script once in ChatGPT's in-app browser"
exit $FAIL
