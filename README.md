# Sparkbench

A browser electronics lab where a student and their AI agent share one workbench through WebMCP. The student builds real DC circuits; the agent reads live measurements, proposes changes that only execute after the student approves them, diagnoses broken circuits, and leaves signed sticky notes. Every component the agent touches glows on screen, so the canvas itself tells the collaboration story.

Built during the OpenAI WebMCP Challenge, Aug 26 to Sep 3, 2026. All work in this repo is new; the first commit lands inside the submission window.

## Live app

https://iamtanmaypro.github.io/sparkbench/

The app is statically hosted on GitHub Pages (project site, served from the `/sparkbench/` subpath). Before submitting, confirm the URL serves this app and not something else:

```sh
curl -s https://iamtanmaypro.github.io/sparkbench/ | grep -o "<title>[^<]*</title>"
# expected: <title>Sparkbench - build circuits with your AI agent</title>
```

To rebuild the GitHub Pages bundle locally, run `npm run build:pages` (it sets the `/sparkbench/` base path; plain `npm run build` keeps the root base for other hosts, such as a later Cloudflare Pages move, which is documented as an optional alternative in [docs/gate1-checklist.md](docs/gate1-checklist.md)).

## What it is

- A real DC simulation: modified nodal analysis (about 150 lines of TypeScript, Gaussian elimination, no physics engine), with batteries (including internal resistance), resistors, LEDs (forward drop and burnout), bulbs (brightness from power), switches, fuses, ammeters, and voltmeters. Faults are detected and named: short circuit, open circuit, LED burnout, blown fuse.
- Fifteen WebMCP tools over one shared canvas, registered against `document.modelContext` (with a feature-detected `navigator.modelContext` fallback, since that path is deprecated): 5 reads, 2 navigation, 6 writes plus a proposal-status read, and a lesson-gated diagnosis tool.
- A human in the loop by design: every write returns a proposal, an on-canvas card waits for the student's click, and `remove_component` carries an honest `destructiveHint`. Sticky notes the agent leaves are annotated `untrustedContentHint`.
- Five lessons as plain JSON a teacher could edit: Ohm's Law, Series vs Parallel, Switches and Logic, Diagnose the Fault (ships pre-broken), Free Build. Toolsets follow the lesson via `provideContext`/`toolchange`.
- Both registration surfaces: the 15 imperative tools plus a declarative Lab Report `<form toolname="submit_lab_report">` with no `toolautosubmit`, so the agent fills it and the human always presses Submit.
- Fully usable with no agent: dismiss the banner and the whole product works mouse-only. That is deliberate; it has to be a coherent product on its own.

## How to test with an agent (both runtimes)

Before anything: open the live URL in a normal tab, click **Reset bench** in the Lessons panel, and confirm the page renders without the "Open in ChatGPT's browser" banner. A fresh bench state keeps every lesson at its seeded circuit.

### Runtime A: ChatGPT's in-app browser

1. Start a new ChatGPT conversation and paste the deeplink (swap in the live URL if it changed):

   ```
   https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fiamtanmaypro.github.io%2Fsparkbench%2F
   ```

   If the deeplink does not open the page, paste the plain URL into the conversation and ask ChatGPT to open it in its browser. Either path counts.
2. Type: `Open my electronics workbench and tell me what tools you can see there.` Expect the agent to call `ping_workbench`, then `describe_workbench`, and list the bench: 5 lessons, a battery and a resistor on it.
3. Type: `Teach me series vs parallel. Switch me to lesson 2, explain the seeded circuit, then rebuild it so the two bulbs are in parallel and both glow bright. Propose each change to me and wait for my approval.` Approve the first card explicitly, then use **Approve next N** for the rest. End state: both bulbs bright and the lesson panel reads **Goal complete. Nice work.**
4. Break the circuit by hand (delete a wire), then type: `Why are the bulbs dark now?` Then open lesson 4 via `Open lesson 4 and figure out why the LED is dark. Leave me a note about it.` The agent runs `run_diagnosis`, names the burned LED, and leaves a signed note; the fix itself comes back as `needs_human`, which is the designed behavior. You replace the LED, then type `Check my work.` to see `check_answer` pass.
5. Type: `Fill in the lab report for me...` and watch the form glow while the agent fills it; you press **Submit report**.

The full script, including the on-camera approval beat, truncation and abort edge checks: [docs/gate2-chatgpt-demo.md](docs/gate2-chatgpt-demo.md).

### Runtime B: Chrome 153+ (flag profile and origin-trial profile)

1. On a clean Chrome profile, enable `chrome://flags/#enable-webmcp-testing`, relaunch, and open the live URL. In DevTools, `document.modelContext` should be an object, not `undefined`.
2. Install the **Model Context Tool Inspector** extension and open it for the page.
3. Dynamic toolset check: on Lesson 1 the Inspector lists `ping_workbench`, the 5 reads, `open_lesson`, `focus_component`, and the writes `place_component`, `connect`, `set_property`, `get_proposal_status`, and NOT `remove_component`, `add_note`, or `run_diagnosis`. Switch to Lesson 2: `remove_component` and `add_note` join. Lesson 4: `run_diagnosis` appears. Back to Lesson 1: it disappears.
4. Second clean profile, no flags touched: open the same URL. I am still pending on the Chrome origin-trial token for `https://iamtanmaypro.github.io` (enrollment is a Tanmay step in [docs/gate1-checklist.md](docs/gate1-checklist.md)); once the token ships in the page, WebMCP must work for a plain visitor with no flags. If `document.modelContext` is `undefined` there after the token is live, the token is expired or mis-issued; check `chrome://web-internals` and the origin trials console. The ChatGPT in-app browser route and the `chrome://flags/#enable-webmcp-testing` flag path both work today without any token.

The three probe prompts with pass criteria, plus raw-JSON truncation probes: [docs/gate2-inspector.md](docs/gate2-inspector.md).

### Solo (no agent)

Dismiss the banner and use the whole product with the mouse: palette, canvas, wiring, meters, lessons, lab report. No WebMCP required.

## Prompts to try

These three are also on the app's own hint panel:

- `What is wrong with my circuit?` (open Lesson 4 first; the bench ships with a burned LED)
- `Build me a voltage divider` (Lesson 5, free build, full toolset)
- `Why is the LED dark?` (Lesson 4; the honest answer reads the meters, not a guess)

And the full-tour prompt from the demo: `Teach me series vs parallel. Switch me to lesson 2, explain the seeded circuit, then rebuild it so the two bulbs are in parallel and both glow bright. Propose each change to me and wait for my approval.`

## Tool catalog

All names are 30 characters or fewer, descriptions 500 or fewer, parameter descriptions 150 or fewer, and serialized outputs 1,500 characters or fewer, enforced by [src/webmcp/budgets.test.ts](src/webmcp/budgets.test.ts). Outputs that would overflow truncate honestly: `truncated: true` plus a `*_total` count, never a clipped string.

| Tool | Kind | Input | The agent gets |
|---|---|---|---|
| `ping_workbench` | health check | none | App name and greeting; the first call that proves the connection |
| `describe_workbench` | read | none | Compact netlist: every component's id, type, value, and wiring (coordinates dropped first if over budget, flagged `layout_omitted`) |
| `read_measurements` | read | none | Voltage, current, and power per component plus fault flags (short, open, LED burnout, blown fuse) |
| `get_lesson_state` | read | none | Current lesson, goal, progress through the 5-lesson track, and success-predicate status |
| `read_notes` | read (`untrustedContentHint`) | none | Sticky notes on the canvas; claims in them are user-authored and unverified |
| `check_answer` | read | none | Pass or fail against the lesson goal with the failing checks; never the full solution |
| `open_lesson` | navigation | `lesson_id` | Switches the lesson; the per-lesson toolset change follows (`toolchange`) |
| `focus_component` | navigation | `id` | Pan, zoom, and pulse-highlight: "look here" |
| `place_component` | write | `type`, `x?`, `y?`, `value?` | A proposal; appears only after the student approves |
| `connect` | write | `from_terminal`, `to_terminal` | A proposal to wire two terminals, e.g. `bat1:a` to `r1:b`; the bench re-solves after approval |
| `set_property` | write | `id`, `value` or `closed` | A proposal to change a resistance, voltage, fuse rating, or switch state |
| `remove_component` | write (`destructiveHint`) | `id` | A proposal to remove a part and its wires |
| `add_note` | write, auto-executes | `text`, `x?`, `y?` | A sticky note signed "Agent", applied immediately because notes change nothing |
| `get_proposal_status` | read | `proposal_id` | Approved, rejected, or still pending, so the agent never assumes a change landed |
| `run_diagnosis` | guided mode | none | Lessons 4+ only (dynamic toolset): an ordered probe list naming the faulty part and the fix, with the canvas jumping to the first suspect |

## Architecture

```
      human clicks                    agent tool calls (WebMCP)
  React Flow canvas, panels    src/webmcp/ tool pool, per-lesson subsets
              \                        /
        both call the SAME Zustand store actions (no parallel mutation path)
                          |
              Zustand store (single source of truth)
                          |
        pure TypeScript engine: netlist, MNA solver, component models, faults
                          |
        re-solve, then measurements and faults land back in the store
```

Module map:

```
src/
  engine/   netlist types, MNA solver, component models, fault detection (pure, framework-free)
  store/    useBenchStore: components, wires, lesson state, notes, proposals, action log, agent presence
  webmcp/   useTool.ts hook, register.ts (tool pool), schemas.ts (plain JSON-Schema literals),
            approvals.ts (proposal flow), diagnosis.ts, toolsets.ts (per-lesson matrix), budgets.test.ts
  lessons/  schema + 5 lesson JSON files + success-predicate evaluator
  ui/       Workbench (React Flow), ApprovalCard, AgentChip, ActionLog, LabReportForm, HintPanel, ...
```

Rules that keep the agent honest:

- Tools wrap store actions only, the exact same actions a human click calls. No agent-only mutation path.
- Escalation over guessing: on a faulted bench, tools return `{status:"needs_human", context, suggestion}` naming the part to look at.
- Every `execute` honors the host AbortSignal, and the SPA never navigates during execution.
- localStorage access is guarded with try/catch.
- Feature detection: `document.modelContext ?? navigator.modelContext`; when neither exists, a dismissible banner points at these instructions and the app stays fully usable.

### The approval flow

A write tool returns immediately with `{status:"pending_approval", proposal_id, summary}`. A card renders on the canvas ("wants to: connect sw1:b to bulb2:b") with Approve and Reject, plus a batch control to approve the next N proposals after the first explicit yes. `get_proposal_status` lets the agent await the outcome instead of assuming it.

### The declarative surface

The Lab Report panel is a `<form toolname="submit_lab_report" tooldescription="...">` with no `toolautosubmit`: the agent fills the fields, the form glows while it works (`:tool-form-active`, with a JS-mirror class on runtimes that do not ship the pseudo-class yet), and only the human presses Submit.

## Development

```sh
npm install
npm run dev       # local dev server
npm run build     # tsc -b + vite production bundle in dist/
npx vitest run    # 195 unit tests across 21 files, including the tool-budget lint
```

The registration code a reviewer wants is in `src/webmcp/register.ts` and `src/webmcp/approvals.ts`.

## License

MIT, see [LICENSE](LICENSE). The GitHub About sidebar should show it; the checklist in [docs/github-publish.md](docs/github-publish.md) verifies that after the first push.
