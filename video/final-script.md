# Sparkbench demo video: script and recording plan

Two rules this script holds to, so it stops drifting:
  1. Sound like Tanmay. First person, warm, the real reason you built it.
  2. Never explain what WebMCP is. The judges wrote it. Spend that time on how
     you used it and what you hit.

Method: record live, pause while the agent thinks, resume when it lands.
Two prompts. About 2:50, hard cap 2:55.

---

## SETUP (before you record)

1. Live app in ChatGPT's in-app browser, fresh conversation.
2. **Reset bench**, open **Lesson 5, Free Build**. Empty bench on screen.
3. ChatGPT's left panel wide enough to read the tool trace. That's your
   evidence, don't crop it out.
4. Both prompts copied ready to paste.

---

# SEGMENT 1 (recording) Over the empty bench

> Hey, I'm Tanmay, and this is Sparkbench.

> So I'm a student, and I study with AI basically every day. And the thing that
> always got me is that when I'm stuck on something like a circuit, the AI can
> explain it to me perfectly, but it can't touch the thing I'm actually
> building. It's just talking at me from a chat window while I'm the one
> fumbling with the wires.

> So I built the bench where it can. It's a proper electronics lab with a real
> circuit solver behind it, and it registers fifteen WebMCP tools, so my agent
> and I are working the same bench at the same time.

> And I picked a circuit canvas on purpose, because it's about the worst thing
> you can hand an agent. No DOM worth reading, nothing on screen that means
> connect this terminal to that one, and the real answer is a number the solver
> worked out a frame ago. Without tools there's just nothing there.

> Anyway, it's empty right now. Let's let it build.

Paste PROMPT 1.

### PROMPT 1

```
Build me a circuit from scratch with the battery and two bulbs, wired in parallel so both are bright. Ask me before each change.
```

## >>> PAUSE <<<
Resume when the first approval card appears.

---

# SEGMENT 2 (recording) The trace, and the approvals

SCREEN: cursor on the tool trace, then the cards, then the parts landing.

> And there's the trace on the left. It grounds itself with describe_workbench,
> then place_component and connect to actually build the thing.

> This is the part I care about most. The writes don't just run. They come back
> as a proposal, the page puts up an approval card, and nothing changes until I
> click it. Reads are open, writes have to ask. requestUserInteraction isn't
> shipped yet, so that flow lives in the page.

(approve the first, let it land, batch approve the rest)

> Battery, two bulbs in parallel, both lit. And everything it placed stays
> tagged as the agent's, so I can always see who did what.

## >>> PAUSE <<<
**Reset bench.** Resume and paste PROMPT 2 as you say the next line.

---

# SEGMENT 3 (recording)

> Okay, now one with a number in it.

### PROMPT 2

```
Make a voltage divider that outputs exactly 1.00 V.
```

## >>> PAUSE <<<
Resume when the voltmeter reads.

---

# SEGMENT 4 (recording) It checks its own work

SCREEN: parts placed by Agent, voltmeter at 1.000 V.

> So it chose the resistor values itself, placed everything, wired it up, put a
> voltmeter on the output, and then called read_measurements and checked itself
> against the solver. One point zero zero zero volts. It measured, instead of
> just telling me it worked.

---

# SEGMENT 5 (recording) Underneath, and the bit I didn't expect

SCREEN: Chrome with the Model Context Tool Inspector, tool list visible. Switch
a lesson so the toolset visibly changes.

> A few things underneath. The toolset moves with the lesson, so the diagnosis
> tool doesn't even exist until you reach the fault lesson. Reads carry
> readOnlyHint, the sticky notes carry untrustedContentHint because a human
> wrote them, and every output stays inside the budget.

> And here's the bit I genuinely didn't expect. In ChatGPT's browser the agent
> can read the rendered page and call my tools, and it'll take whichever is
> cheaper. Ask it what's on the bench and it just looks at the canvas and never
> calls anything, which is fair enough. So the tools have to hand back what
> looking can't give you: the exact solver values, the terminal level wiring,
> the specific check that's failing. Designing around that was most of the
> actual work.

---

# SEGMENT 6 (recording) Close

SCREEN: finished bench, then live URL and repo.

> That's Sparkbench. It's live, it's open source, and the tool registrations are
> all in src/webmcp. Thanks for watching.

---

## Lines to land

"It's just talking at me from a chat window while I'm the one fumbling with the
wires."
"It measured, instead of just telling me it worked."
"The tools have to hand back what looking can't give you."

## Notes

- Each segment is its own clip, so a bad take costs one segment.
- If it wires them in series, say "wired so both stay lit" and move on.
- Long? Cut the first paragraph of Segment 5. Never cut the second.
