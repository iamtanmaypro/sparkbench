# GitHub push instructions and About-license checklist (Tanmay)

The rules require a public repo with an open-source license visible in the
About sidebar. The LICENSE file is already at the repo root; the visibility
check is on you after the push. Work top to bottom.

## 1. Create the repo

1. Go to https://github.com/new and create a **public** repo named `sparkbench`.
2. Do NOT initialize it with a README, LICENSE, or .gitignore: the repo already
   has all three, and initializing would create a conflicting first commit.

## 2. Push from this directory

The repo currently has no remote configured. From `/Users/tanmaypro/Documents/Programming/sparkbench`:

```sh
git remote add origin git@github.com:<your-username>/sparkbench.git
git push -u origin main
```

(HTTPS works too: `https://github.com/<your-username>/sparkbench.git`, with a
personal access token when prompted.)

## 3. About sidebar checklist (the free points entries die on)

Open the repo page and check the About box in the top right:

- [ ] The About sidebar shows **"MIT license"** (GitHub detects it from
      LICENSE at the root automatically; if it does not appear within a few
      minutes, open LICENSE on github.com and confirm it renders as the MIT
      text, then re-check).
- [ ] Click the gear icon next to About and fill in:
  - [ ] Description: `A browser electronics lab where your AI agent is your lab partner (WebMCP)`
  - [ ] Website: the live app URL (e.g. `https://sparkbench.pages.dev`)
  - [ ] Topics: `webmcp`, `education`, `circuits`, `mcp`, `ai-agents`, `react`
- [ ] Default branch is `main` and the latest commit is the final package
      commit.

## 4. Rules-requirement spot checks

- [ ] `LICENSE` is at the repo root and renders on github.com.
- [ ] `src/webmcp/` is visible from the repo root landing page (the
      tool-registration code must be findable in 5 seconds: register.ts and
      approvals.ts).
- [ ] The commit history shows the submission window: first commit `Phase 0`
      (Aug 26, 2026) through today, one coherent commit per phase.
- [ ] README renders with the live URL, both-runtime test steps, the tool
      catalog table, the architecture sketch, prompts to try, and the built
      Aug 26 to Sep 3 2026 statement.

## 5. After the push

- Update the Devpost form's GitHub URL (docs/devpost-dry-run.md).
- Keep the repo public and the default branch stable through judging
  (Sep 4 to 21); fix-forward with small commits if anything needs a change.
