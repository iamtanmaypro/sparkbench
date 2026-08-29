# Gate 2, test A: full demo script in ChatGPT's in-app browser

This is the primary-runtime rehearsal of the whole product story, and it doubles
as the recording session for the video's demo segment (PLAN.md beat sheet,
0:45 to 1:50). One continuous ChatGPT session, one camera pass if you can.

**The one shot that must be on camera:** an approval card appearing, you
clicking Approve, the ghost cursor playing on the touched component, and the
agent chip flipping states. That moment is the product.

---

## Before you start (5 minutes)

- [ ] `https://iamtanmaypro.github.io/sparkbench/` loads in a normal tab and is the latest deploy (hard refresh: Cmd+Shift+R).
- [ ] Fresh bench state: open the app, click **Reset bench** in the Lessons panel. If you want a truly clean slate: DevTools > Application > Local Storage > delete `sparkbench.v1` > reload. The app starts on Lesson 1 (Ohm's Law).
- [ ] Recording setup (only if this pass is the video take): 1080p, browser window about 1280x800 so canvas + log rail + approval layer all fit, cursor visible in the recorder, other tabs closed, no zoom.
- [ ] New ChatGPT conversation, then paste the deeplink:

  ```
  https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fiamtanmaypro.github.io%2Fsparkbench%2F
  ```

  If ChatGPT does not open the page from the deeplink, paste the plain URL and ask it to open the page in its browser. (Either path counts; note which one worked, this is the single-sourced fact we keep spot-checking.)

- [ ] Sanity signal: the page renders **without** the WebMCP banner. If you see the "Open in ChatGPT's browser, or Chrome with WebMCP" banner instead, the model context did not attach: stop, record it, and retry with the plain-URL route.

## Step 0: discovery check (about 30 seconds)

Type:

> Open my electronics workbench and tell me what tools you can see there.

Expect the agent to call `ping_workbench` first (its description tells it to),
then `describe_workbench`, and list what it found: 5 lessons, a battery and a
resistor on the bench.

Watch for: the agent chip in the top bar flips to **"working…"** while each
tool call runs, and the Bench log records the activity.

Record: which tools the agent says it can see.

## Step 1: the build, with an approval card on camera (2 to 3 minutes)

Type:

> Teach me series vs parallel. Switch me to lesson 2, explain the seeded
> circuit, then rebuild it so the two bulbs are in parallel and both glow
> bright. Propose each change to me and wait for my approval.

Expect, in order:

1. `open_lesson` (series-parallel): the canvas swaps to the two-bulb series circuit. On a live runtime this is also the toolset-change proof: `remove_component` and `add_note` join the toolset in lesson 2.
2. `describe_workbench` and/or `read_measurements` to ground itself.
3. Writes: `place_component` / `connect` / `set_property` calls that each return
   `pending_approval` and stack approval cards on the canvas.

**The camera moment (do not skip):** when the first card appears at the top
right of the canvas:

- The card reads **"Agent proposal"**, then **"wants to:"** plus the bare
  action, for example `connect sw1:b to bulb2:b`.
- The agent chip shows **"1 awaiting your approval"** with a dashed border.
- The Bench log shows `Agent proposes: connect sw1:b to bulb2:b`.
- Say out loud: "the agent wants to change my circuit; it cannot until I
  approve", then click **Approve** on camera.
- Right after: the ghost cursor plays over the touched component (a small blue
  cursor that fades over ~2 seconds), the touched part glows in agent blue, any
  agent-placed part carries the **"placed by Agent"** badge, and the log shows
  `You approved: connect sw1:b to bulb2:b`.

Rewiring note: the agent cannot delete a single wire, so it will most likely
propose `remove_component` on bulb2 (which takes its wires with it), then
re-place it and reconnect. Approve the removal, then use the **"Approve next N"**
batch control for the follow-up place/connect cards and mention it on camera:
"after the first explicit yes, I can let several through at once."

End state: both bulbs glow bright, the lesson panel shows **Goal complete. Nice
work.** If the agent stalls, prompt it: "check your proposals with
get_proposal_status, then finish the parallel rewire."

## Step 2: break it on purpose, then ask why (about 90 seconds)

Still on the lesson-2 bench, you break the circuit by hand: click the wire
between `bulb1` and `bulb2` and press Delete (or click the switch to open it).

Type:

> Why are the bulbs dark now?

Expect: `read_measurements` (never escalates, it is how the agent learns of the
fault) plus maybe `describe_workbench`; the answer names the open circuit and
points at the missing wire. If the agent proposes the rewire, approve the
card(s) and watch the bulbs come back.

Then the LED beat. Type:

> Open lesson 4 and figure out why the LED is dark. Leave me a note about it.

Expect:

1. `open_lesson` (diagnose-fault): the toolset changes again, and this time
   **`run_diagnosis` appears** (it only exists in lessons 4+).
2. `run_diagnosis`: the canvas pans/zooms to `led1` with a pulse highlight, the
   log shows `Agent started a guided fault diagnosis`, and the agent gets an
   ordered probe list naming `led1` as burned out.
3. `add_note`: a blue sticky note signed **Agent** lands on the canvas with no
   approval card (notes change nothing, so they auto-execute).
4. If the agent then tries to `place_component` or `remove_component` the fix,
   the tool returns `needs_human` with a suggestion naming `led1`. **That is the
   designed behavior**, not a bug: on a faulted bench, the agent hands control
   back to you. The agent should say so in chat.

You fix it on camera: select `led1`, delete it, place a fresh LED from the
palette, and wire it in series after `r1` (led's `a` terminal toward `r1:b`,
led's `b` terminal back to `bat1:b`). Then type:

> Check my work.

Expect: `check_answer` returns passed, the lesson panel flips to **Goal
complete. Nice work.**

## Step 3: the lab report form (about 30 seconds)

Type:

> Fill in the lab report for me: name Tanmay, what I built: the lesson 2
> parallel bulbs circuit, observed vs expected: in series both bulbs were dim
> at about 1.5 V each, in parallel each gets nearly the full 3 V and both glow
> bright.

Expect: the agent fills the three fields of the Lab report panel (bottom of the
right rail). The form gets an agent-blue glow while the agent works
(`:tool-form-active` on runtimes that ship it, the same glow via the JS mirror
everywhere else). The browser focuses **Submit report**, and the agent stops
there, because the form has no autosubmit: you always press the button. Click
**Submit report** on camera. Watch for: `Report submitted. Nice work.` and the
log line `You submitted the lab report`.

## Step 4: edge checks, truncation and abort (2 minutes, not on video)

**Truncation.** Open lesson 5 (free build), place about 25 to 30 resistors
(palette click, then canvas clicks; or ask the agent to place them and batch
approve). Then type:

> Describe the bench and read the measurements. Did any tool result come back
> truncated, and how did you know?

Expect the agent to either see the whole bench or explicitly acknowledge a
partial result (`truncated: true` plus a `*_total` count in the payload). The
raw payload check happens in the Tool Inspector pass (`gate2-inspector.md`);
here you are checking the agent copes with a slice honestly.

**Abort.** While the agent is mid-answer (tool calls in flight), press Stop in
ChatGPT. Then type:

> Is anything half-applied on the bench?

Expect: the agent chip is idle (never stuck on "working…"), any approval cards
that were pending are still pending (a stopped tool must not have mutated the
bench), and the circuit reads the same as before. If anything looks stuck,
reload the page: localStorage should restore the exact same state. Record what
you saw.

## Results to report back (feeds the one tool-description iteration round)

| Step | Tools called (expected) | Tools called (actual) | Mispick or confusion? | Notes |
|---|---|---|---|---|
| 0 discovery | ping_workbench, describe_workbench | | | |
| 1 build | open_lesson, describe_workbench, place_component, connect, set_property, get_proposal_status | | | approval card seen + approved on camera? |
| 2 break + LED | read_measurements, run_diagnosis, focus_component, add_note | | | needs_human surfaced correctly? |
| 3 lab report | declarative submit_lab_report form | | | glow + human submit seen? |
| 4 truncation | describe_workbench, read_measurements | | | agent handled partial result? |
| 4 abort | (stop mid-call) | | | chip idle, no half-applied state? |

Also note: which deeplink path worked, whether tool names and annotations were
visible in ChatGPT's UI, and anything the agent got wrong on the first try.
Every "got it wrong" row maps to one tool description to edit
(`src/webmcp/register.ts`, `approvals.ts`, or `diagnosis.ts`), then re-run
`npx vitest run src/webmcp/budgets.test.ts` and redeploy. One iteration round
only: log what changed.
