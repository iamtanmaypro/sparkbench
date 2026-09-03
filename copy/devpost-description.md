# Devpost description (draft for copy/paste)

Tanmay: paste each section below into the Devpost "About the project" field in
this exact order. The tagline goes in the short tagline field. After pasting,
run the em-dash grep in review-notes.md one final time on what you pasted,
read it aloud once (register pass), and only then submit. The review record
lives in copy/review-notes.md.

Suggested title: Sparkbench
Suggested tagline: A browser electronics lab where your AI agent is your lab partner, and every change waits for your approval.

---

## 1. Inspiration

I'm a student, and I study with AI. Every day a tutor model can explain a circuit to me in fluent prose, and every day it cannot touch the circuit I am actually building. That is the gap: AI tutors can explain, but the interactive content a student works on, the simulator, the canvas, the lab bench, sits on the other side of an unreadable glass. The chat window can say "in parallel, each bulb gets nearly the full voltage." It cannot wire that parallel circuit in front of me, watch my meters, or notice that I put the switch in the wrong branch. I built Sparkbench to close that gap.

## 2. What it does

Sparkbench is a browser electronics lab (batteries, resistors, LEDs, bulbs, switches, fuses, meters) running a real DC simulation, built so a student and their AI agent work at the same workbench through WebMCP. Three roles share one canvas. The student acts: dragging parts, wiring terminals, flipping switches. The agent reads real state: it calls tools to see every component, every wire, and the live measurements a circuit solver just computed, not a screenshot and not a guess. The agent acts only with approval: when it proposes placing a part or wiring a terminal, the tool returns a proposal, an approval card appears on the canvas, and nothing happens until the student clicks Approve. The agent has an identity chip, its own cursor glow on the parts it touches, a timestamped action log, and "placed by Agent" badges, so the canvas itself tells the story of who did what.

## 3. Why this use case fits WebMCP

A circuit simulation drawn on an HTML canvas is exactly what DOM scraping cannot read: there is no markup listing the components, and the ground truth is numbers computed by a solver. Tools are the only structured access, which makes this a natural fit for the callable web: the page hands the agent structured tools instead of screen automation. Five flat reads ground the agent (workbench summary, live measurements, lesson state, notes, answer check), two navigation tools direct attention, and the write tools are where the human in the loop is native: every mutating call returns a proposal and waits for a tap on an approval card rendered by the page itself. Sticky notes are free text written by whoever pinned them, so the read_notes tool is annotated untrustedContentHint and claims in notes stay unverified until checked against the meters. The whole agent experience, chip, glow, log, and badges, makes the machine a visible lab partner instead of a ghost. And reliability and precision come from physics: every claim the agent makes is checkable against the app's own meters, and a faulted circuit escalates back as needs_human with the exact component to look at.

## 4. What people and agents accomplish together that wasn't feasible before

An AI tutor that demonstrates on your actual workbench. Ask it to teach series versus parallel and it rewires the bench under your approvals. Break the circuit on purpose and ask "why is the LED dark?": it reads the real measurements, runs a guided diagnosis, focuses the canvas on the burned part, and leaves a signed sticky note explaining the fix. It verifies your work against ground truth with a check_answer call instead of complimenting a screenshot, fills the lab report form for you to submit, and hands control back to you the moment the bench is faulted. That loop of demonstrate, observe, verify, and escalate is not possible over screenshots or chat text. It needs a page that gives the agent real state and real hands, which is the potential impact of the pattern: any interactive simulator, from chemistry to orbital mechanics, can copy it.

## 5. How we built it, and the thoughtful use of WebMCP

I built it with a boring stack on purpose: Vite, TypeScript, React, React Flow for the canvas, Zustand as the single store, and a hand-written modified nodal analysis solver of about 150 lines with Gaussian elimination. The WebMCP layer is where the thoughtful use of WebMCP lives:

- Registration against document.modelContext, the current API, with a feature-detected navigator.modelContext fallback. Most tutorials still teach the deprecated path alone.
- Dynamic per-lesson toolsets via provideContext and toolchange: lesson 1 exposes a minimal set, lesson 2 adds removal and notes, lessons 4 and up add run_diagnosis, and free build unlocks everything. The toolset visibly follows the lesson.
- A read, navigation, and write taxonomy with correct hints: readOnlyHint on all reads, untrustedContentHint on user-authored notes, destructiveHint on removal, and navigation flagged honestly as non-mutating.
- Tools written to beat the screen. ChatGPT's in-app browser is a hybrid agent: it can read the rendered page and it can call my tools, and it takes the cheapest path that answers the question. Ask it what is on the bench and it will read the canvas, correctly, without touching a tool. So every tool here returns what looking cannot produce: exact solver values, terminal-level wiring, the specific failing lesson checks, the cause behind a visible symptom. Designing for that competition, rather than assuming an agent will call a tool just because it exists, is the part of WebMCP work that only shows up once you test in a real runtime.
- Character budgets respected and enforced by a test (names 30 or fewer, descriptions 500 or fewer, parameter descriptions 150 or fewer, outputs 1.5K or fewer), with outputs that truncate honestly: a truncated flag plus totals, never a clipped string.
- Both API surfaces: the 15 imperative tools plus a declarative Lab Report form with toolname and tooldescription and deliberately no toolautosubmit, which glows with :tool-form-active while the agent fills it, and only the human presses Submit.
- An in-page approval flow with batch approval (approve the next N proposals after the first explicit yes), because requestUserInteraction is spec-draft, and structured needs_human escalation returns with context and a suggestion on faulted benches.
- Origin-trial enrollment for the hosted origin (`https://iamtanmaypro.github.io`), pending as I write this; the token ships in a meta tag once issued. Meanwhile WebMCP is testable today two ways: ChatGPT's in-app browser needs nothing extra, and Chrome's `chrome://flags/#enable-webmcp-testing` flag enables it in any profile.

The usefulness comes from a real audience of students and self-learners; the originality from a shared object that is a live physical simulation with ground truth, not a document; the execution from a 196-test suite that includes a lint for the budget law; and the quality of the human-agent experience is the product itself, not a feature bolted on. The WebMCP leverage is the full API surface, both registration surfaces included, that most entries will not touch, and the creativity and ambition show up in treating an agent as a lab partner with its own identity rather than a macro recorder.

## 6. Challenges / What's next

The hard parts were writing tool descriptions a small inspector model picks correctly the first time, building an approval UI the API does not ship yet, and keeping every agent action visible without cluttering the canvas. Next: lesson authoring, so teachers can write their own benches as JSON (the five lessons already are JSON), and more domains with ground truth, starting with chemistry titrations and logic gates.

## 7. How to test it

Live app: https://iamtanmaypro.github.io/sparkbench/ (open it first and click Reset bench; in a plain tab you will see a dismissible agent-hint banner, which is expected, and in a WebMCP runtime it disappears). The app is statically hosted on GitHub Pages. Repo: the tool registration lives in src/webmcp/register.ts and src/webmcp/approvals.ts.

ChatGPT (primary runtime):

1. In a new ChatGPT conversation, paste: https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fiamtanmaypro.github.io%2Fsparkbench%2F
   If the deeplink does not open the page, paste the plain URL and ask ChatGPT to open it in its browser.
2. Type: "What is the exact current through each part right now?" The agent calls describe_workbench and read_measurements and quotes numbers that are nowhere on screen. (Ask it instead what is on the bench and it will just read the canvas and skip the tools: ChatGPT's browser can both see the page and call tools, and it takes the cheapest path. Sparkbench's tools are designed to return what the screen cannot, so the tool path wins on merit.)
3. Type: "Teach me series vs parallel. Switch me to lesson 2, explain the seeded circuit, then rebuild it so the two bulbs are in parallel and both glow bright. Propose each change to me and wait for my approval." Approve the cards (batch approve after the first).
4. Break the circuit, then type: "Why are the bulbs dark now?" Then: "Open lesson 4 and figure out why the LED is dark. Leave me a note about it." Fix the burned LED yourself when the agent hands control back.
5. Type: "Fill in the lab report for me: name Tanmay, what I built: the lesson 2 parallel bulbs circuit, observed vs expected: in series both bulbs were dim, in parallel both glow bright." Press Submit yourself.

Chrome 153+:

1. On a clean profile, enable chrome://flags/#enable-webmcp-testing and relaunch.
2. Open the live app; the tools register with no install. Use the Model Context Tool Inspector extension.
3. On a second clean profile with no flags, open the same URL: once the origin-trial token is live in the page (enrollment pending at submission time), WebMCP works for a plain visitor. Until then, the flag route above is the reliable Chrome path.

Three prompts to try: "What is the exact current through each part right now?" (any lesson), "Rewire this so both bulbs are bright, asking me before each change" (lesson 2, this is the approval-card moment), and "Open lesson 4 and diagnose the dead part from the readings" (lesson 4).

No agent needed: dismiss the banner and the full lab works mouse-only.
