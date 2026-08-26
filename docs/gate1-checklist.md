# Gate 0 and Gate 1 checklist (actions for Tanmay)

These are the steps only you can do. Everything else in Phase 0 is already
in the repo. Work top to bottom; Gate 1 must pass before any runtime-dependent
Phase 3 work gets built on top of assumptions.

## Gate 0 (before or alongside Phase 0)

- [ ] Register for the challenge at https://webmcp.devpost.com/ (individual entry, your name).
- [ ] Create a free Cloudflare account if you do not have one (for Pages).
- [ ] Have your GitHub account ready for the public repo.

## Gate 1 (after this scaffold deploys)

### 1. Deploy to Cloudflare Pages

1. Push this repo to GitHub (public repo, MIT license will show automatically from LICENSE at root).
2. Go to https://dash.cloudflare.com/ and open Workers & Pages > Create > Pages > Connect to Git.
3. Pick the sparkbench repo. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy. Note the URL (it should be `sparkbench.pages.dev` if you name the project `sparkbench`).

Alternative without connecting GitHub:

```sh
npm run build
npx wrangler pages deploy dist --project-name sparkbench
```

(`npx wrangler login` first if prompted.)

### 2. Enroll the deployed origin in the Chrome origin trial

1. Go to https://developers.chrome.com/origintrials/ (sign in with any Google account).
2. Find the WebMCP trial (open since Chrome 149) and register `https://sparkbench.pages.dev`.
3. Copy the issued token.
4. Paste it into `index.html`, replacing `PASTE_ORIGIN_TRIAL_TOKEN_HERE` in the existing meta tag, commit, and let Pages redeploy.

### 3. Test A: ChatGPT in-app browser

1. Open ChatGPT and try this deeplink, replacing the URL with your deployed URL:
   `https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fsparkbench.pages.dev`
   (If that deeplink format fails, just paste the app URL into a ChatGPT conversation and ask it to browse.)
2. Ask: "Do you see any tools from this page? Try calling ping_workbench."
3. Record: does the tool appear/discover? Does calling it return "Connected to the student's electronics workbench"?

### 4. Test B: Chrome with WebMCP flag

1. On a clean Chrome profile (153+), go to `chrome://flags/#enable-webmcp-testing` and enable it, then relaunch.
2. Open `https://sparkbench.pages.dev`.
3. Open DevTools and run: `document.modelContext` (it should be an object, not undefined).
4. Use the Model Context Tool Inspector extension (or ask an agent connected through the flag) to check that `ping_workbench` is listed.
5. Record: does the dummy tool register?

### 5. Report back

- [ ] Result of both tests above (tool discovered / not discovered, output seen).
- [ ] Whether annotation hints surfaced in either runtime (spot-check of single-sourced facts: the codex deeplink format and ChatGPT's tool-annotation behavior are each known from only one source).

Once both tests pass, say so and Phase 1+ continues with confidence in the real API surface.
