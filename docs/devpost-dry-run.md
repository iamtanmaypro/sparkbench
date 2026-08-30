# Devpost form dry-run checklist (Tanmay)

START THE DRAFT TODAY (Devpost's own halfway email: "A saved draft is not a
submission... Filling in the form early shows you exactly which fields you
still need to sort out."). Open the submission form now, fill every field you
can, save as draft, and leave only the video URL for later. Then run the full
pass below on Sep 1 IST, and Submit on Sep 2 IST, never Sep 3 (the 1:00 PM PT
wall is 1:30 AM Sep 4 IST, and Devpost forms fail late).

Automated pre-checks: `sh scripts/preflight.sh [youtube-url]` runs every
machine-checkable item (live URL, fresh deploy, public repo, MIT detection,
tests, dash check, pushed tree) in one go.

## Pre-flight (everything else must be done first)

- [ ] Live app deployed and serving this app:
      `curl -s https://<live-url>/ | grep -o "<title>[^<]*</title>"` prints the
      Sparkbench title. Update the URL everywhere if the project name changed.
- [ ] GitHub repo public, MIT license visible in the About sidebar
      (docs/github-publish.md step 3).
- [ ] YouTube video public and playable signed out (video/export-checklist.md).
- [ ] Description final: copy/devpost-description.md, locked per
      copy/review-notes.md.

## The form, field by field

| Field | What to enter | Check |
|---|---|---|
| Project title | `Sparkbench` | matches repo name |
| Tagline | `A browser electronics lab where your AI agent is your lab partner, and every change waits for your approval` | one line, no em dash |
| About the project | Paste sections 1 to 7 from copy/devpost-description.md in order, headings included | read aloud once (register pass), zero em dashes after pasting |
| Live demo URL | the live app URL | opens the app (agent-hint banner in a plain tab is expected) |
| GitHub repo URL | the public repo URL | About sidebar shows MIT |
| Video URL | the public YouTube URL | plays signed out |
| Built at the hackathon | Yes, all work is new (Aug 26 to Sep 3, 2026) | matches the README statement |
| License | MIT | matches LICENSE |
| Team | individual entry (Tanmay) | no extra members |
| Technologies / tags | `WebMCP`, `TypeScript`, `React`, `React Flow`, `Zustand`, `Vite` | keep the list honest |

## Dry-run pass

1. Fill every field above.
2. Paste the description, then immediately run the em-dash check on what you
   pasted (copy it back into a scratch file):
   `sh copy/check-dashes.sh scratch.md` must print "OK: no em dashes, no en
   dashes."
3. Click Preview (not Submit). Read the preview top to bottom once, aloud.
4. Check the preview shows: both-runtime test steps, the 3 prompts, the
   built-at-hackathon statement, live URL, repo URL, video URL.
5. Screenshot the preview and save it next to the video takes (not committed).
6. Stop here. Submit on Sep 2 IST from the saved state.

## Last look before Submit (Sep 2)

- [ ] Video URL still plays (public, not processing)
- [ ] Live URL still up and serving this app
- [ ] Repo About still shows MIT license
- [ ] No teammate/entry conflicts: one submission per entrant
- [ ] Submit, then save the confirmation page URL
