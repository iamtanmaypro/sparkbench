#!/bin/sh
# Zero em/en dashes in all outward-facing copy (mission hard rule).
# Usage: sh copy/check-dashes.sh [paths...]   (defaults to the package files)
#
# Matches the UTF-8 byte sequences for em dash (\xe2\x80\x94) and en dash
# (\xe2\x80\x93) at byte level, so this works with macOS's BSD grep, which
# has no -P flag.
paths="${*:-README.md copy/devpost-description.md copy/review-notes.md video/ docs/github-publish.md docs/devpost-dry-run.md}"
if LC_ALL=C grep -rn -e $'\xe2\x80\x94' -e $'\xe2\x80\x93' $paths; then
  echo "FOUND dashes above: rewrite with commas, parentheses, or separate sentences."
  exit 1
else
  echo "OK: no em dashes, no en dashes."
fi
