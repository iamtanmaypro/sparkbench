# Sparkbench demo video: script and recording plan

Method: record live, talking as you go. Pause while the agent thinks, resume
when the result lands. Two prompts. About 2:50 finished, hard cap 2:55.

THE POINT OF THIS VIDEO: this is a WebMCP hackathon, so WebMCP has to be visible
the whole way through, not mentioned once at the end. Three things carry it:
  1. You say what WebMCP is in the first twenty seconds.
  2. You point at ChatGPT's tool trace and read the tool names out loud.
  3. You say plainly why this is impossible without it.

---

## SETUP (before you hit record)

1. Live app in ChatGPT's in-app browser, fresh conversation.
2. **Reset bench**, then open **Lesson 5, Free Build**. Empty bench on screen.
3. Make sure ChatGPT's left panel is wide enough that the tool trace is
   readable. That panel prints the tool names as they run
   (Listed website tools, Ping workbench, Describe workbench, Read
   measurements). It is the best proof in the whole video. Do not crop it out.
4. Both prompts copied ready to paste.

---

# SEGMENT 1 (recording) Intro, and what WebMCP actually is

SCREEN: empty bench.

> Hey, I'm Tanmay, and this is Sparkbench, my submission for the WebMCP
> Challenge.

> If you haven't come across WebMCP yet, it's a new browser standard that lets a
> website hand an AI agent a set of real tools, instead of leaving it to squint
> at the screen and guess where to click.

> I'm a student, I study with AI, and what bugged me is that when I'm stuck on
> a circuit, the AI explains it perfectly but can't touch the thing I'm
> building. So this is Sparkbench: an electronics lab in the browser with a real
> circuit simulator behind it, and the page registers fifteen WebMCP tools so my
> agent can work at the bench with me. Right now it's empty, so let's give it
> something to do.

Paste PROMPT 1, hit enter.

### PROMPT 1

```
Build me a circuit from scratch with the battery and two bulbs, wired in parallel so both are bright. Ask me before each change.
```

## >>> PAUSE <<<
Resume when the first approval card appears.

---

# SEGMENT 2 (recording) Name the tools out loud, then approve

SCREEN: point your cursor at the tool trace in ChatGPT's panel while you say
this. Then the cards, then the parts landing.

> And look at the panel on the left, ChatGPT is showing every tool it calls. It
> listed the site's tools, called describe_workbench to see the bench, and now
> place_component and connect to build it.

> And here's the part I care about most. The tools that change something don't
> just run, they come back as a card I have to approve. That's how I registered
> them: reads are open, writes have to ask.

(approve the first card, let the part land, batch approve the rest)

> There's the battery, both bulbs wired in parallel, and they're lit. Everything
> the agent placed is tagged, so I can always see what was me and what was it.

## >>> PAUSE <<<
Click **Reset bench**. Resume, and paste PROMPT 2 as you say the next line.

---

# SEGMENT 3 (recording)

> Now something harder. I'll ask it for an exact number.

### PROMPT 2

```
Make a voltage divider that outputs exactly 1.00 V.
```

## >>> PAUSE <<<
Resume when the voltmeter is reading.

---

# SEGMENT 4 (recording) The result

SCREEN: parts placed by Agent, voltmeter reading 1.000 V.

> It picked the resistor values, placed every part, wired it up, and put a
> voltmeter on the output. Then it called read_measurements, which hands back
> what the simulator actually computed, not what the screen looks like. One
> point zero zero zero volts. It didn't tell me it worked, it went and measured.

---

# SEGMENT 5 (recording) Why this needs WebMCP

SCREEN: quick scroll of the lessons list, then Chrome with the Model Context
Tool Inspector open showing the fifteen tools.

> There are guided lessons in here too, it can diagnose a broken circuit and
> tell you which part is dead, and it can fill in your lab report.

> But why does any of this need WebMCP? Try it without. The agent's looking at
> a canvas. There's no button that says connect this terminal to that one, no
> text on screen saying the output is one volt. It'd have to guess coordinates
> and drag wires it can't see, and it'd break the second anything moved.

> With WebMCP none of that happens. The page declares the tools, the agent calls
> them by name, and the toolset even changes with the lesson, so it only ever
> sees the tools it should have. That's the difference between an agent
> pretending to use your app and actually using it.

---

# SEGMENT 6 (recording) Close

SCREEN: finished bench, then live URL and repo.

> I think this is where the web is going. Sparkbench is live and it's open
> source, so go try it. Thanks for watching.

---

## Lines to land properly

"It just hands the agent real tools instead of making it guess where to click."
"It didn't tell me it worked, it went and measured."
"The difference between an agent pretending to use your app and actually using
it."

## Notes

- Pauses mean every segment is its own clip. One bad take costs one segment.
- If it wires the bulbs in series, say "and it wired them so both stay lit" and
  move on.
- Running long? Cut the "guided lessons" sentence in Segment 5. Never cut the
  paragraph after it.
