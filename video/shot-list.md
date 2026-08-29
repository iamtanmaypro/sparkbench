# Shot list (every recording needed, batched for one session)

Goal: record everything in a single sitting, in this order. The demo shot (C)
is the long one; A, D, and E are short pickups. 1080p, cursor visible, browser
window about 1280x800 so the canvas, log rail, and approval layer all fit.
Close every other tab.

Prerequisites (from Gate 2, non-negotiable):

- [ ] The full demo script (docs/gate2-chatgpt-demo.md) rehearsed at least once
      in ChatGPT's browser before recording, so the take has no surprises.
- [ ] Batch approve confirmed working: after the first explicit approval, the
      "Approve next N" control lets the build flow on camera.
- [ ] Bench reset (Reset bench) before each take so lessons start from their
      seeded circuits.
- [ ] Voiceover recorded first (see voiceover-script.md), then cut pictures to
      the audio.

File naming: shotA-take1.mov, shotC-take2.mov, and so on, into a local video/
scratch folder that is not committed.

## Shot A (0:00 to 0:15) Cold open, mid-action

Where: ChatGPT's in-app browser on the live app, lesson 2.

Staging: run the demo script up to Step 1 and stop when 3 or 4 approval cards
are stacked. Do not record the approach; record only the payoff.

Do on camera:

1. Start recording with a card visible and the agent chip showing "1 awaiting
   your approval".
2. Click Approve on the first card, then use "Approve next N" for the rest.
3. Let the bulbs come up bright.

Expected on screen: card reads "wants to:" plus the action; ghost cursor plays
over the touched part; agent-placed parts carry "placed by Agent"; the log
shows "You approved: ..."; both bulbs end bright and the lesson panel reads
"Goal complete. Nice work."

## Shot B (0:15 to 0:45) The problem

Where: a plain ChatGPT conversation, no tools involved.

Do on camera:

1. Ask ChatGPT (any chat) "explain series vs parallel circuits for a physics
   student" and record a slow scroll through its text-only answer.
2. Cut point: end on a sentence like "each bulb gets the full voltage" so the
   edit can jump straight to Shot A's bright bulbs.

Expected on screen: exactly what an agent cannot do today, words about a
circuit instead of the circuit.

## Shot C (0:45 to 1:50) The demo, one continuous take

Where: ChatGPT's in-app browser on the live app, one continuous session from
the deeplink. Follow docs/gate2-chatgpt-demo.md Steps 0 to 3. Prompts to type,
in order:

1. `Open my electronics workbench and tell me what tools you can see there.`
2. `Teach me series vs parallel. Switch me to lesson 2, explain the seeded circuit, then rebuild it so the two bulbs are in parallel and both glow bright. Propose each change to me and wait for my approval.`
3. (Hand break) delete the wire between the bulbs, then:
   `Why are the bulbs dark now?`
4. `Open lesson 4 and figure out why the LED is dark. Leave me a note about it.`
5. (Hand fix) delete the burned LED, place a fresh one from the palette, wire
   it in series after r1, then: `Check my work.`
6. `Fill in the lab report for me: name Tanmay, what I built: the lesson 2 parallel bulbs circuit, observed vs expected: in series both bulbs were dim, in parallel both glow bright.`
7. Click Submit report yourself.

Expected on screen, beat by beat (matches the VO cues):

- 0:45 open_lesson swaps the canvas to the two-bulb series circuit.
- 0:58 first approval card, explicit Approve, ghost cursor, badge, log line.
- 1:16 "Approve next N" batch control, remaining cards clear, bulbs light.
- 1:24 read_measurements plus run_diagnosis, canvas jumps to the dead part,
  signed Agent sticky note lands without a card.
- 1:38 you replace the LED, needs_human behavior visible in the agent's chat
  answer if it tried to fix it itself; check_answer returns passed, panel
  shows "Goal complete. Nice work."
- 1:46 lab report fills with the :tool-form-active glow (or the JS-mirror
  glow), Submit focused, you click it, "Report submitted. Nice work."

## Shot D (1:50 to 2:20) Depth montage

Where: Chrome 153+ with the Model Context Tool Inspector, on a profile where
WebMCP is enabled (flag or origin trial).

Do on camera, four quick cuts:

1. Inspector tool list at lesson 1 (the minimal set).
2. Click lesson 2, then lesson 4, and show the tool list changing:
   remove_component and add_note join, then run_diagnosis appears. Back to
   lesson 1 and it disappears.
3. One approval card interaction again (2 seconds is enough).
4. Code flash: open src/webmcp/register.ts in the editor, scroll to
   benchTools and a registerTool call, show about 10 lines for 3 seconds.

Expected on screen: the toolset visibly follows the lesson; the same approval
pattern in a second runtime; the registration code is short enough to read.

## Shot E (2:20 to 2:50) Impact and close

Do on camera:

1. Wide shot of the app with a completed lesson on the bench, agent chip idle,
   log full of the session's activity.
2. Cut to the GitHub repo page (About sidebar visible with the MIT license),
   then to the live URL in the address bar.

End card content (hold 5 seconds): live URL and repo URL, large and readable.
No em dashes in any on-screen text.

## Coverage checklist

- [ ] Approval card, explicit approve, ghost cursor, badge, log: on camera
- [ ] Batch approve: on camera
- [ ] Measurement-then-diagnosis, not guessing: on camera
- [ ] needs_human handoff on the faulted bench: on camera
- [ ] check_answer pass: on camera
- [ ] Lab report glow + human submit: on camera
- [ ] Toolset change between lessons: on camera
- [ ] Registration code flash: on camera
- [ ] Live URL and repo readable on the end card: on camera
