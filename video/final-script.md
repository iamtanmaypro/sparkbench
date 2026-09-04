# Sparkbench demo video: script and recording plan

Method: record live, talking as you go. Pause the recorder while the agent is
thinking, resume when the result lands. Two prompts, that's it.
About 2:50 finished. Hard cap 2:55.

Talk like you're showing a friend something you're pleased with.

---

## SETUP (before you hit record)

1. Live app open in ChatGPT's in-app browser, fresh conversation.
2. Click **Reset bench**, then open **Lesson 5, Free Build**.
3. You should be looking at a completely **empty bench**. That's your starting
   point for the whole video. Nothing to explain, nothing already on screen.
4. Have both prompts copied ready to paste.
5. Close other tabs. Window about 1280x800.

---

# SEGMENT 1 (recording) Intro, over the empty bench

> Hey, I'm Tanmay, and this is Sparkbench, my submission for the WebMCP
> Challenge.

> So I'm a student, and I study with AI all the time. And the thing that always
> bugged me is that when I'm stuck on something, the AI can explain it to me
> perfectly, but it can't actually touch the thing I'm building. It just talks
> at me from a chat window.

> So this is Sparkbench. It's an electronics lab that runs in your browser, with
> a real circuit simulator behind it, so everything you see is actual physics.
> And right now it's completely empty. I'm not going to build anything myself.
> I'm going to ask my agent to do it.

Still recording, paste PROMPT 1 and hit enter.

### PROMPT 1

```
Build me a circuit from scratch with the battery and two bulbs, wired in parallel so both are bright. Ask me before each change.
```

## >>> PAUSE <<<
Resume when the first approval card shows up.

---

# SEGMENT 2 (recording) It builds, you approve

SCREEN: cards appear, you approve, parts land on the bench one by one, bulbs
light up.

> And here it goes. It's not guessing from a screenshot, it's calling tools that
> this page hands it. Everything it wants to do comes back to me as a card, and
> nothing happens until I approve it.

(approve the first card, let the part land, then batch approve the rest)

> There's the battery. And the two bulbs, wired in parallel so each one gets the
> full voltage. And they're lit. Everything the agent placed is tagged, so I can
> always see what was me and what was it.

## >>> PAUSE <<<
Click **Reset bench** so you're back to empty. Then resume and paste PROMPT 2
while you say the line below.

---

# SEGMENT 3 (recording) Something harder

> Okay, now something harder. I'm going to ask for a specific number and see if
> it can actually hit it.

### PROMPT 2

```
Make a voltage divider that outputs exactly 1.00 V.
```

## >>> PAUSE <<<
Resume when the voltmeter is reading and the bench is done.

---

# SEGMENT 4 (recording) The result

SCREEN: battery and both resistors placed by Agent, voltmeter reading 1.000 V.

> So I asked for a voltage divider that puts out exactly one volt. It chose the
> resistor values, placed every part, wired it up, put a voltmeter on the
> output, and then it checked its own work against the simulator. One point zero
> zero zero volts. It didn't just tell me it worked, it went and measured.

---

# SEGMENT 5 (recording) What else, and why WebMCP

SCREEN: scroll the lessons list briefly, then switch to Chrome with the Model
Context Tool Inspector showing the tool list.

> There's more in here than that. There are guided lessons, it can diagnose a
> broken circuit and tell you which part is dead, it can leave notes on the
> bench, and it can fill in your lab report for you.

> But the reason any of this works is WebMCP. Without it, an agent has to drive
> an app by looking at pixels. It has to find a component, guess where to click,
> drag a wire to a terminal it can't really see. That falls apart immediately.
> With WebMCP, the page just hands the agent real tools, so it can ask for real
> measurements and make real changes. That's the difference between an agent
> pretending to use your app and actually using it.

---

# SEGMENT 6 (recording) Close

SCREEN: the finished bench, then live URL and repo on screen.

> I really think this is where the web is going. Sparkbench is live and it's
> open source, so go try it, go break it. Thanks for watching.

---

## Lines to land properly

"It just talks at me from a chat window." (the problem)
"It didn't just tell me it worked, it went and measured." (the product)
"The difference between an agent pretending to use your app and actually using
it." (the argument)

## Notes

- Every segment is a separate clip because of the pauses, so if one take goes
  wrong you only re-record that segment.
- If the agent wires the bulbs in series instead of parallel, just say "and it
  wired them so both stay bright" and move on. Don't fight it on camera.
- Running long? Cut the "there's more in here than that" paragraph. Never cut
  the WebMCP one.
