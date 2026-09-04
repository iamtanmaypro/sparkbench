# Sparkbench demo video: script and recording plan

Method: record live, talking as you go. Pause the recorder whenever the agent is
thinking, resume when the answer lands. The pauses do your editing for you.
Roughly 2:50 of finished video. Hard cap 2:55.

Talk like you're showing this to a friend. Contractions, normal pace, let the
sentences run into each other.

---

## SETUP (before you hit record)

1. Live app open in ChatGPT's in-app browser, fresh conversation.
2. Click **Reset bench**, then open **Lesson 2 (Series vs Parallel)**.
3. **Click the switch sw1 so it closes.** This matters. Left open, every reading
   is 0 A and the demo has no numbers. Closed, both bulbs sit dim and lit.
4. Have the two prompts below copied somewhere you can paste from fast.
5. Close other tabs. Window about 1280x800 so canvas, cards and log all fit.

---

# SEGMENT 1 (recording) Intro and what it is

SCREEN: the bench, lesson 2, two dim bulbs.

> Hey, I'm Tanmay, and this is Sparkbench, my submission for the WebMCP
> Challenge. So I'm a student, and like a lot of people now, I study with AI.
> And one thing always bugged me. When I'm stuck on a circuit, the AI can
> explain it to me perfectly, it'll write me paragraphs about voltage and
> current, but it cannot touch the circuit I'm actually building. It can't see
> my wiring, it can't read my meters, it can't fix anything. It's just talking
> at me from a chat window.

> So that's what I built. Sparkbench is a little electronics lab that runs in
> your browser, with a real circuit simulator behind it, so the numbers you see
> are actual physics. And the whole idea is that my AI agent works at the same
> bench I do. Same canvas, same circuit, at the same time.

NOW, still recording, paste PROMPT 1 and press enter while you say:

> Here I've got two bulbs wired in series, and they're dim. So I'll just ask my
> agent to fix that.

### PROMPT 1 (paste this)

```
Both bulbs are dim right now. Tell me exactly what each one is getting, then rewire it so both are bright. Ask me before each change.
```

## >>> PAUSE THE RECORDING <<<
Let the agent work. Resume the moment the first approval card appears.

---

# SEGMENT 2 (recording) The rewire, with approvals on camera

SCREEN: approval cards stacked. You click Approve on the first one, then use
Approve next N for the rest. Bulbs go bright. Panel reads Goal complete.

> And watch this, because it isn't guessing from a screenshot. It's calling
> tools that this page hands it, reading the real solver values, and then
> proposing every single change back to me. Nothing happens until I approve it.

(click Approve here, let the wire land, then batch approve the rest)

> I hit approve, the wire lands, and the bulbs go bright. In series each bulb
> was getting one point four nine volts. In parallel, two point nine.

NOW, still recording, paste PROMPT 2 and press enter while you say:

> This next one's my favourite. I'm going to ask it for something properly hard.

### PROMPT 2 (paste this)

```
Make a voltage divider that outputs exactly 1.00 V.
```

## >>> PAUSE THE RECORDING <<<
Let it switch to free build and build the whole thing. Resume when the voltmeter
is reading and the lesson shows complete.

---

# SEGMENT 3 (recording) The divider result

SCREEN: free build, battery and both resistors placed by Agent, voltmeter on the
output reading 1.000 V, Goal complete.

> I asked for a voltage divider that outputs exactly one volt. It picked the
> resistor values, placed every part, wired it up, put a voltmeter on the
> output, and then it measured its own work. One point zero zero zero volts. It
> didn't just tell me it worked, it went and checked.

## >>> PAUSE THE RECORDING <<<
Switch over to Chrome with the Model Context Tool Inspector open on the app.

---

# SEGMENT 4 (recording) Why WebMCP

SCREEN: Chrome, Tool Inspector showing the tool list. Switch a lesson so the
toolset visibly changes. Quick flash of src/webmcp/register.ts.

> And this is really why WebMCP matters, because without it an agent has to do
> all of that by looking at pixels. It has to find the component, guess where
> to click, drag a wire across a canvas to a terminal it can't properly see.
> That's close to impossible, and it breaks the second anything moves. With
> WebMCP, the page just hands the agent real tools. There's fifteen of them
> here. It asks for measurements and gets actual numbers back. It says connect
> this terminal to that one, and it works, every time. That's the difference
> between an agent pretending to use your app and genuinely using it.

---

# SEGMENT 5 (recording) Close

SCREEN: back to the finished bright circuit, then the live URL and repo on screen.

> Honestly, I think this is where the web is heading. Sparkbench is live and
> it's open source, so go try it, go break it. Thanks for watching.

---

## Optional third demo (only if you're under time)

Drop this in after Segment 3 if the video is running short. Costs about 20
seconds of narration.

```
Open lesson 4 and diagnose the dead part from the readings.
```

> And when something's actually broken, it finds it. That's lesson four, it
> ships with a burned out LED, and the agent reads the meters, points at the
> dead part, and hands control back to me to replace it.

---

## Lines to land properly

"It's just talking at me from a chat window." (the problem)
"It didn't just tell me it worked, it went and checked." (the product)
"The difference between an agent pretending to use your app and genuinely
using it." (the argument)

## If a take goes wrong

Re-record just that segment. The pauses mean every segment is already a separate
clip, so one bad take doesn't cost you the whole video.

## If your take runs long

418 spoken words, about 2:47 at a normal pace. If you land over 2:55, cut from
the "so that's what I built" paragraph in Segment 1. The demo shows what it is
anyway. Never cut Segment 4, that's the argument the submission rests on.
