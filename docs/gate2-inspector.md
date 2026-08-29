# Gate 2, test B: Chrome 153+ Model Context Tool Inspector, both profiles

The Inspector runs a Gemini-Flash-class model against the page's registered
tools, which is exactly the class of model we must satisfy. Run everything on
**two profiles**: the flag profile proves the app works under the testing flag;
the origin-trial profile proves the shipped `sparkbench.pages.dev` enables
WebMCP for real visitors with no flags at all. The three probe prompts below
are the tool-description iteration targets (they are also the three prompts on
the app's own hint panel).

---

## Setup A: flag profile (clean profile)

1. Chrome 153 or newer (`chrome://settings/help`). Use a **clean profile** with no other extensions.
2. `chrome://flags/#enable-webmcp-testing` > Enabled > Relaunch.
3. Install the **Model Context Tool Inspector** extension, open it from the extensions menu.
4. Open `https://sparkbench.pages.dev`.
5. DevTools console: `document.modelContext` should be an object, not `undefined`. (If only `navigator.modelContext` exists, note it: we register against `document` first, `navigator` as fallback, so tools still register, but the record matters.)

**Dynamic toolset check (do this before any probe):** with the app on Lesson 1,
the Inspector should list exactly:

- `ping_workbench` plus the five reads (`describe_workbench`, `read_measurements`, `get_lesson_state`, `read_notes`, `check_answer`), `open_lesson`, `focus_component`
- writes: `place_component`, `connect`, `set_property`, `get_proposal_status`
- and **not** `remove_component`, `add_note`, `run_diagnosis` (lesson 1 is the minimal stage).

Then click **2. Series vs Parallel** in the app's Lessons panel: the toolset
gains `remove_component` and `add_note`. Click **4. Diagnose the Fault**:
`run_diagnosis` appears. Back to Lesson 1 and it disappears again. If the
Inspector's tool list does not follow the lesson, record it: that is the
`toolchange` story failing on a live runtime.

## Setup B: origin-trial profile (second clean profile, no flag)

1. Same Chrome, second clean profile, **no flags touched**.
2. Open `https://sparkbench.pages.dev`. The page ships the origin-trial token in its `<meta http-equiv="origin-trial">` tag, so WebMCP must be active for a plain visitor.
3. DevTools console: `document.modelContext` should again be an object. If it is `undefined` here: the token is expired, spent, or issued for a different origin. Check `chrome://web-internals` (origin trial section) and the origin trials console, fix, redeploy, and re-check. This failure mode is precisely what this profile exists to catch.
4. Repeat the dynamic toolset check from Setup A.

## The three probe prompts (run in both profiles, fresh bench each time)

Click **Reset bench** and pick the right lesson before each probe, so every
probe starts from the seeded state.

### Probe 1: "What is wrong with my circuit?"

Bench: **Lesson 4** (ships with `led1` burned out, everything else healthy).

In the Inspector's model chat, type the prompt exactly:

> What is wrong with my circuit?

Pass if the small model:

1. grounds itself first with `describe_workbench` and/or `read_measurements` (reading the real state instead of guessing), and
2. either calls `run_diagnosis` (registered on this lesson) or reports from measurements that `led1` is burned out (0 V across it, no current through it), and
3. names the fix: replace `led1`, keep `r1` in series as the current limiter.

Watch for: `focus_component` or the diagnosis jumping the canvas to `led1` with
the pulse highlight. A call to `check_answer` or `open_lesson` here is a
mispick: write it down.

### Probe 2: "Build me a voltage divider"

Bench: **Lesson 5** (free build, full toolset, empty bench).

Type:

> Build me a voltage divider

Pass if the model:

1. calls `describe_workbench` first, then
2. proposes `place_component` (a battery and two resistors, sensible values) and `connect` calls, each returning `pending_approval` with approval cards stacking on the canvas, and
3. after you approve them, confirms with `get_proposal_status` and explains the divider ratio.

Approve the first card explicitly, then use **Approve next N** for the rest.
Common small-model failure to watch for: hallucinating terminal ids (calling
`connect` with `r1:a` before any `place_component` was approved). The connect
description says ids look like `bat1:a`; if the model still guesses, note the
exact wording it saw and move on to the iteration list.

### Probe 3: "Why is the LED dark?"

Bench: **Lesson 4** again. If you already fixed the LED during Probe 1, click
**Reset bench** to restore the broken state.

Type:

> Why is the LED dark?

Pass if the model reads the real state (`read_measurements` and/or
`run_diagnosis`) and answers with `led1` burned out rather than a generic
"check your wiring" answer. Bonus signal: it quotes the measurement (0 V
across, no current) instead of only the fault label.

## Truncation probes (either profile)

Free build, then place 30+ resistors: palette click, then repeated canvas
clicks is fastest. In the Inspector, invoke directly (not via the model):

1. `describe_workbench`
2. `read_measurements`

Check the raw JSON the Inspector shows:

- [ ] serialized length ≤ 1500 characters
- [ ] when the bench is big: `truncated: true` present, plus `components_total` / `measurements_total`
- [ ] valid JSON to the last character (never clipped mid-string)
- [ ] on `describe_workbench` with a mid-size bench: `layout_omitted: true` and no `x`/`y` fields on rows (the coordinates step)

Then ask the model "summarize my bench": pass if it acknowledges seeing a
partial list when `truncated` was set, instead of claiming to have seen
everything.

## Abort checks (either profile)

- Unit level (already green, listed here so the record is complete): all 15
  tool executes return `{status:"aborted"}` on a pre-aborted signal and do no
  work. Suites: `reads.test.ts`, `nav.test.ts`, `approvals.test.ts`,
  `diagnosis.test.ts`, `presence.test.ts` (ping).
- Inspector level: start a model request that triggers tools and cancel it
  mid-flight (if the Inspector exposes a stop), then re-run. The agent chip
  must not stay stuck on "working…", and no bench change may have applied
  without an approval click.
- ChatGPT-side stop-button abort is covered in `gate2-chatgpt-demo.md`, Step 4.

## The one iteration round (this is what Gate 2 is for)

For every mispick, hallucinated argument, or confused answer, one row:

| Probe | Profile | What the model did | Tool whose description to edit | Proposed edit |
|---|---|---|---|---|
| | | | | |

Then:

1. Edit the description (or param description) in `src/webmcp/register.ts`, `approvals.ts`, or `diagnosis.ts`. Budgets are law: ≤ 500 chars per description, ≤ 150 per param description, names ≤ 30.
2. `npx vitest run src/webmcp/budgets.test.ts` to keep the lint green, `npm run build`, redeploy to Cloudflare Pages.
3. Re-run only the failed probes on the flag profile.
4. Log the final probe results in the table below. One round only; if a probe still fails after the round, record it and move on (it feeds the README's prompts-to-try honesty).

| Probe | Flag profile: pass/fail after round | Origin-trial profile: pass/fail | First tool picked | Notes |
|---|---|---|---|---|
| What is wrong with my circuit? | | | | |
| Build me a voltage divider | | | | |
| Why is the LED dark? | | | | |
