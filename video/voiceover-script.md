# Voiceover script (word for word, timed to the PLAN.md beat sheet)

Total runtime: 2:50 of narration; export at 2:55 maximum. Pace target is about
145 words per minute, conversational, first person, one take if possible
(record in one sitting per the plan). Zero em dashes in any caption or title
card. Pause marks are written as (beat). Bracketed lines are production cues,
not to be read aloud.

## Beat 1 (0:00 to 0:15) Cold open, mid-action on the live app

[On screen: ChatGPT's browser on Sparkbench, approval card visible, agent chip
in "working" state, then bulbs light up as approvals land.]

> This is Sparkbench. That's my AI agent, working at my workbench, with my
> permission. It just rewired my circuit. Every change it makes waited on a
> card like this one. (beat) And nothing moved until I approved it.

Word count: 38. Fits 15 seconds with a breath.

## Beat 2 (0:15 to 0:45) The problem, and the WebMCP line

[On screen: cut to a plain chat window with a text-only circuit explanation,
then back to the Sparkbench canvas.]

> AI tutors can explain anything. They'll happily write out how a parallel
> circuit works. What they can't do is touch my workbench. They can't see the
> circuit I actually built, read my meters, or demonstrate anything. WebMCP
> changes that: the page hands my agent real tools, structured access to the
> bench itself, instead of a screen to scrape. (beat) Here's what that looks
> like.

Word count: 71. Fits 30 seconds.

## Beat 3 (0:45 to 1:50) The demo, one continuous ChatGPT session

[On screen: docs/gate2-chatgpt-demo.md beats 0 to 3 as one take. Cues below
are timed to the script's steps; if the take drifts, re-record the matching VO
line rather than cutting the demo.]

0:45, as the prompt goes in:

> Watch this. I ask my agent to teach me series versus parallel, and to
> rebuild my circuit so both bulbs glow bright. It switches my bench to lesson
> two, reads the seeded circuit, and starts proposing changes.

0:58, on the first approval card:

> Here's the part that matters. The agent wants to connect these terminals,
> but it can't. Not until I say so. (beat) I approve, and the wire lands. You
> can see it worked: the log, the glow on the part it touched, the badge that
> says who placed it.

1:16, on batch approval:

> After the first explicit yes, I can approve a batch at a time, so long
> builds still flow, and I'm still the one in control.

1:24, on breaking the circuit:

> Now I break the circuit on purpose and ask why the bulb is dark. The agent
> doesn't guess. It reads the real measurements, runs a guided diagnosis, and
> shows me exactly which part is dead.

1:38, on the LED fix and check:

> I replace the burned LED myself, because on a broken bench the agent hands
> control back to me. Then it checks my work against the lesson goal. (beat)
> Passed.

1:46, on the lab report:

> Last step, it fills in my lab report while I watch. And I press submit.
> Always me.

Word count: 158 across 65 seconds, on pace.

## Beat 4 (1:50 to 2:20) Depth montage

[On screen: Chrome with the Model Context Tool Inspector listing tools; lesson
switch showing the toolset change; the approval card again; then a brief code
flash of the registration lines in src/webmcp/register.ts.]

> The same app in Chrome with the Model Context Tool Inspector. The toolset
> follows the lesson: the diagnosis tool only exists once I reach the
> fault-hunting lesson. My agent sees exactly what it's allowed to do. Under the hood, this is the
> whole registration: fifteen tools against document.modelContext, the current
> API, with budgets enforced by tests. And a declarative form the agent fills,
> that only I can submit.

Word count: 78. Fits 30 seconds.

## Beat 5 (2:20 to 2:50) Impact and close

[On screen: wide shot of a completed lesson, then the live URL and the GitHub
repo on screen as the end card.]

> Sparkbench is for students, teachers, and anyone learning with an AI at
> their side. The circuits are the excuse. The point is that a human and an
> agent can share one workspace, with real state, real physics, and a human in
> the loop on every single change. (beat) Try it live. Read the code. Build a
> lesson of your own. (beat) Sparkbench: humans and agents, at the same bench.

Word count: 78. Fits 30 seconds.

## Recording notes

- Record the voiceover in one sitting, reading from this file, before cutting
  the screen recordings; then cut the screen recordings to the voiceover.
- If a line runs long against its beat, cut words from the bracketed cue
  sections first, never from the claims (approval, control, escalation).
- The one line that must never be cut: "And nothing moved until I approved
  it." It is the product.
- Total spoken words: 423, about 2:50 at 145 words per minute.
