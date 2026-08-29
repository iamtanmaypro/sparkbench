# Gate 0 and Gate 1 checklist (actions for Tanmay)

These are the steps only you can do. Everything else in Phase 0 is already
in the repo. Work top to bottom; Gate 1 must pass before any runtime-dependent
Phase 3 work gets built on top of assumptions.

## Gate 0 (before or alongside Phase 0)

- [x] Register for the challenge at https://webmcp.devpost.com/ (individual entry, your name).
- [x] Have your GitHub account ready for the public repo.

## Gate 1 (after this scaffold deploys)

### 1. Deploy: DONE

- [x] Deployed to GitHub Pages as a project site on 2026-08-29. Live URL:
  https://iamtanmaypro.github.io/sparkbench/
- [x] The site is statically hosted there; the build command is
  `npm run build:pages` (it sets the `/sparkbench/` base path).

Quick check that the URL serves this app and not something else:

```sh
curl -s https://iamtanmaypro.github.io/sparkbench/ | grep -o "<title>[^<]*</title>"
# expected: <title>Sparkbench - build circuits with your AI agent</title>
```

Optional alternative hosting path (not the plan): Cloudflare Pages also works
with a Vite SPA, and `npm run build` (root base) builds for it. Note the
project name `sparkbench` is already taken on Cloudflare by an unrelated site
at `sparkbench.pages.dev`, so that URL can never be ours. Only revisit this
path if GitHub Pages ever stops meeting the submission requirements.

### 2. Enroll the deployed origin in the Chrome origin trial (optional)

1. Go to https://developers.chrome.com/origintrials/ (sign in with any Google account).
2. Find the WebMCP trial (open since Chrome 149) and register the origin
   `https://iamtanmaypro.github.io`.
3. Copy the issued token and paste it to the orchestrator; it goes into
   `index.html`, replacing `PASTE_ORIGIN_TRIAL_TOKEN_HERE` in the existing
   meta tag, then gets committed and redeployed.
4. This step is optional: until the token is live, WebMCP is still testable
   today through ChatGPT's in-app browser (Test A, no setup at all) and
   Chrome's flag mode (Test B).

### 3. Test A: ChatGPT in-app browser

1. Open ChatGPT and try this deeplink:
   `https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fiamtanmaypro.github.io%2Fsparkbench%2F`
   (If that deeplink format fails, just paste the app URL into a ChatGPT conversation and ask it to browse.)
2. Ask: "Do you see any tools from this page? Try calling ping_workbench."
3. Record: does the tool appear/discover? Does calling it return "Connected to the student's electronics workbench"?

### 4. Test B: Chrome with WebMCP flag

1. On a clean Chrome profile (153+), go to `chrome://flags/#enable-webmcp-testing` and enable it, then relaunch.
2. Open `https://iamtanmaypro.github.io/sparkbench/`.
3. Open DevTools and run: `document.modelContext` (it should be an object, not undefined).
4. Use the Model Context Tool Inspector extension (or ask an agent connected through the flag) to check that `ping_workbench` is listed.
5. Record: does the dummy tool register?

### 5. Report back

- [ ] Result of both tests above (tool discovered / not discovered, output seen).
- [ ] Whether annotation hints surfaced in either runtime (spot-check of single-sourced facts: the codex deeplink format and ChatGPT's tool-annotation behavior are each known from only one source).
- [ ] Send both results to the orchestrator; they feed the one tool-description iteration round.

Once both tests pass, say so and Phase 1+ continues with confidence in the real API surface.
