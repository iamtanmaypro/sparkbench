# Sparkbench demo video: script and recording plan

Audience: the WebMCP judges. They built this standard. So no explaining what
WebMCP is, no basics. Every second goes on what they can't already know, which
is how this app uses it and what I ran into.

Method: record live, pause while the agent thinks, resume when it lands.
Two prompts. About 2:50, hard cap 2:55.

Tone: talk like you're showing this to another engineer who gets it. Direct, not
chatty, no wind-up.

---

## SETUP (before you record)

1. Live app in ChatGPT's in-app browser, fresh conversation.
2. **Reset bench**, open **Lesson 5, Free Build**. Empty bench.
3. ChatGPT's left panel wide enough that the tool trace is readable. It prints
   the tool names as they run. That is your evidence, don't crop it.
4. Both prompts copied and ready.

---

# SEGMENT 1 (recording) What it is, and why a canvas

SCREEN: empty bench.

> Hey, I'm Tanmay. This is Sparkbench.

> It's an electronics lab in the browser with a real circuit solver behind it,
> and it registers fifteen WebMCP tools so a student and their agent can work
> the same bench at the same time.

> I picked a circuit simulator on purpose, because a canvas is close to the
> worst case for an agent. There's no DOM worth reading, there's no button that
> means connect this terminal to that one, and the ground truth is numbers a
> solver computed a frame ago. Without tools there's genuinely nothing to work
> with. So here WebMCP isn't a nicer path, it's the only way in.

> Bench is empty. I'll let the agent build it.

Paste PROMPT 1.

### PROMPT 1

```
Build me a circuit from scratch with the battery and two bulbs, wired in parallel so both are bright. Ask me before each change.
```

## >>> PAUSE <<<
Resume when the first approval card appears.

---

# SEGMENT 2 (recording) The trace, and the write path

SCREEN: cursor on the tool trace, then the cards, then parts landing.

> There's the trace. It grounds itself with describe_workbench, then
> place_component and connect.

> And the writes don't execute. They return a proposal, the page renders an
> approval card, and the mutation only runs when I click it. Reads are flat and
> always registered, writes have to ask. requestUserInteraction isn't shipped
> yet, so that approval flow lives in the page.

(approve the first card, let it land, batch approve the rest)

> Battery, two bulbs in parallel, lit. Everything the agent placed stays tagged.

## >>> PAUSE <<<
**Reset bench.** Resume, paste PROMPT 2 as you say the next line.

---

# SEGMENT 3 (recording)

> Now one with a number in it.

### PROMPT 2

```
Make a voltage divider that outputs exactly 1.00 V.
```

## >>> PAUSE <<<
Resume when the voltmeter reads.

---

# SEGMENT 4 (recording) It checks itself

SCREEN: parts placed by Agent, voltmeter at 1.000 V.

> It chose the resistor values, placed and wired everything, put a voltmeter on
> the output, then called read_measurements and checked itself against the
> solver. One point zero zero zero volts. It measured instead of claiming.

---

# SEGMENT 5 (recording) What's underneath, and the thing I didn't expect

SCREEN: Chrome with the Model Context Tool Inspector, tool list visible. Switch
a lesson so the toolset changes on screen.

> Underneath: the toolset moves with the lesson, so the diagnosis tool doesn't
> exist until you reach the fault lesson. Reads carry readOnlyHint, sticky notes
> carry untrustedContentHint because a human wrote them, and every output stays
> inside the character budget.

> And the thing I didn't expect. In ChatGPT's in-app browser the agent can read
> the rendered page and call my tools, and it takes whichever is cheaper. Ask it
> what's on the bench and it just looks at the canvas and never calls anything,
> which is correct of it. So the tools have to return what looking can't
> produce: exact solver values, terminal level wiring, the specific check that's
> failing. Designing for that competition was most of the actual work.

---

# SEGMENT 6 (recording) Close

SCREEN: finished bench, then live URL and repo.

> Sparkbench is live, it's open source, and the registrations are in
> src/webmcp. Thanks for watching.

---

## Lines to land

"Without tools there's genuinely nothing to work with."
"It measured instead of claiming."
"The tools have to return what looking can't produce."

## Notes

- Pauses make each segment its own clip. A bad take costs one segment.
- If it wires them in series, say "wired so both stay lit" and move on.
- Long? Cut the first paragraph of Segment 5. Never cut the second.
