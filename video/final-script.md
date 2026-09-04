# Sparkbench demo video: script

Roughly 2:50 spoken. Hard cap 2:55 on export.
Talk like you're showing this to a friend. Contractions, normal pace, let
sentences run into each other. Do not clip the words short.

IMPORTANT: keep the app alive on screen from the very first frame, with the
agent already mid-build, so the project is visibly working while you introduce
yourself.

---

## 1. Intro (0:00 to 0:30)

SCREEN: Sparkbench in ChatGPT's in-app browser, agent working, an approval card
sitting there, bulbs coming up bright as you talk.

> Hey, I'm Tanmay, and this is Sparkbench, my submission for the WebMCP
> Challenge. So I'm a student, and like a lot of people now, I study with AI.
> And one thing always bugged me. When I'm stuck on a circuit, the AI can
> explain it to me perfectly, it'll write me paragraphs about voltage and
> current, but it cannot touch the circuit I'm actually building. It can't see
> my wiring, it can't read my meters, it can't fix anything. It's just talking
> at me from a chat window.

## 2. What it is (0:30 to 0:52)

SCREEN: slow pan over the bench, palette, meters, the lessons list.

> So that's what I built. Sparkbench is a little electronics lab that runs in
> your browser, with a real circuit simulator behind it, so the numbers you see
> are actual physics. And the whole idea is that my AI agent works at the same
> bench I do. Same canvas, same circuit, at the same time.

## 3. Demo one, the rewire (0:52 to 1:35)

SCREEN: lesson 2. Type the prompt. Cards stack, approve the first, batch the
rest, bulbs go bright, panel reads Goal complete.

PROMPT: Rewire this so both bulbs are bright, and ask me before each change

> Here I've got two bulbs wired in series, and they're dim. So I just ask my
> agent to fix it. And watch, because it isn't guessing from a screenshot. It's
> calling tools that this page hands it, reading the real solver values, and
> then proposing every single change back to me. Nothing happens until I
> approve it. I hit approve, the wire lands, and the bulbs go bright. In series
> each bulb was getting one point four nine volts. In parallel, two point nine.

## 4. Demo two, the divider (1:35 to 2:05)

SCREEN: free build, empty bench. Type the prompt. Agent places everything,
badges appear, voltmeter reads 1.000 V, lesson completes.

PROMPT: Make a voltage divider that outputs exactly 1.00 V

> This one's my favourite. I ask for a voltage divider that outputs exactly one
> volt. It picks the resistor values, places every part, wires it up, puts a
> voltmeter on the output, and then it measures its own work. One point zero
> zero zero volts. It didn't just tell me it worked, it went and checked.

## 5. Why WebMCP (2:05 to 2:38)

SCREEN: Chrome with the Model Context Tool Inspector open, tool list visible.
Switch a lesson so the toolset visibly changes. Brief flash of register.ts.

> And this is really why WebMCP matters, because without it an agent has to do
> all of that by looking at pixels. It has to find the component, guess where
> to click, drag a wire across a canvas to a terminal it can't properly see.
> That's close to impossible, and it breaks the second anything moves. With
> WebMCP, the page just hands the agent real tools. There's fifteen of them
> here. It asks for measurements and gets actual numbers back. It says connect
> this terminal to that one, and it works, every time. That's the difference
> between an agent pretending to use your app and genuinely using it.

## 6. Close (2:38 to 2:52)

SCREEN: wide shot of the finished bright circuit, then the live URL and repo.

> Honestly, I think this is where the web is heading. Sparkbench is live and
> it's open source, so go try it, go break it. Thanks for watching.

---

## Lines to land properly

"It's just talking at me from a chat window." (the problem, in one line)
"It didn't just tell me it worked, it went and checked." (the product)
"The difference between an agent pretending to use your app and genuinely
using it." (the argument)

## Recording

1. Rehearse both prompts once so nothing surprises you on camera.
2. Screen record everything silent, waits included.
3. Cut the waits out, speed up anything slow, get the picture to about 2:50.
4. Record the voiceover over the finished cut, one sitting, reading this.
5. Export 2:55 max. Upload PUBLIC to YouTube.

## If your take runs long

418 spoken words, about 2:47 at a normal pace. If you land over 2:55, cut from
section 2 first (the demo shows what it is anyway). Never cut from section 5,
that's the argument the whole submission rests on.
