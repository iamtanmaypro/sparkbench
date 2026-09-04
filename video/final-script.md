# Sparkbench demo video: final script

Target 2:45. Hard cap 2:55. Record screen silent first, cut the agent's thinking
time out, then lay the voiceover on top. Speak it casually, like showing a friend
something you are pleased with. Contractions are good. Do not read it stiffly.

---

## Beat 1 (0:00 to 0:12) Cold open, already mid-action

SCREEN: ChatGPT's in-app browser on Sparkbench, lesson 2, an approval card up.
You click Approve, the wire lands, the bulbs come up bright.

> That's my AI agent, and it's building a circuit on my workbench right now.
> See this card? It can't touch anything until I say yes.

## Beat 2 (0:12 to 0:35) The problem

SCREEN: plain ChatGPT explaining series vs parallel in text, slow scroll.
Then hard cut back to the Sparkbench canvas.

> Here's the thing about learning with an AI. It can explain a circuit
> beautifully. It just can't touch the one I'm actually building. It can't see
> my wiring, it can't read my meters, it can't show me anything. So I built
> Sparkbench.

## Beat 3 (0:35 to 1:30) The rewire. This is the hero.

SCREEN: lesson 2, two dim bulbs. Type the prompt. Agent calls tools, proposes,
cards stack. Approve the first one explicitly. Use Approve next N for the rest.
Bulbs go bright. Panel reads Goal complete.

PROMPT: Rewire this so both bulbs are bright, and ask me before each change

> Two bulbs in series, and they're dim. So I ask my agent to fix it. Watch what
> it does, because it isn't guessing from a screenshot. It calls this page's
> tools, reads the actual circuit solver, and then it asks. Every change comes
> back as a card I have to approve. I approve, and the wire appears.
> (beat)
> In series each bulb was getting one point four nine volts. In parallel it's
> two point nine. Almost four times the power, and you can just see it.

## Beat 4 (1:30 to 2:10) The one I like. Free build.

SCREEN: free build, empty bench. Type the prompt. Agent places battery, both
resistors, wires them, adds the voltmeter, badges appear, reads 1.000 V,
lesson flips to Goal complete.

PROMPT: Make a voltage divider that outputs exactly 1.00 V

> Now here's the part I like. I ask for a voltage divider that outputs exactly
> one volt. It picks the resistors, places every part, wires the whole thing,
> puts a voltmeter on the output, and then it checks its own work against the
> simulation.
> (beat)
> One point zero zero zero volts. It didn't tell me it worked. It measured.

## Beat 5 (2:10 to 2:32) Under the hood

SCREEN: Chrome with the Model Context Tool Inspector listing tools. Switch
lessons so the toolset visibly changes. Quick flash of register.ts.

> Underneath, this is fifteen WebMCP tools registered on document dot
> modelContext. The reads are always available, every write goes through that
> approval card, and the toolset changes with the lesson, so my agent only ever
> sees the tools it should have.

## Beat 6 (2:32 to 2:50) Close

SCREEN: wide shot of the finished bright circuit, then live URL and repo URL.

> Sparkbench. A human and an agent at the same bench, with real physics, and me
> on every single change. It's live, it's open source, go break it.

---

## Never cut

"It can't touch anything until I say yes" (beat 1) and "It didn't tell me it
worked. It measured." (beat 4). Those two lines are the whole project.

## Recording notes

1. Rehearse each prompt once before recording, so you know what the agent does.
2. Record the screen silent, all the way through, waits included.
3. Cut the waits. Speed up anything slow. Aim for 2:45 of picture.
4. Then record the voiceover over the cut, in one sitting.
5. Export at 2:55 max. Upload PUBLIC to YouTube, not unlisted.
