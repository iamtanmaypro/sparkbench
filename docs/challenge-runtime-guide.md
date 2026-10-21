# Historical WebMCP runtime walkthrough

These instructions were written during the August/September 2026 challenge. Host support, flags, deeplinks, and origin trials may have changed. They are retained as a test script, not a promise that a current ChatGPT or Chrome installation supports WebMCP. The origin-trial enrollment was not completed in this repository. Current verification is described in the main README.

## How to test with an agent (both runtimes)

Before anything: open the live URL in a normal tab and click **Reset bench** in the Lessons panel, so every lesson starts from its seeded circuit. In a plain tab with no WebMCP you will see a dismissible agent-hint banner; that is expected, and the whole lab still works mouse-only. In ChatGPT's browser or a WebMCP-enabled Chrome profile the banner does not appear, which is the quick way to confirm the tools are live.

### Runtime A: ChatGPT's in-app browser

1. Start a new ChatGPT conversation and paste the deeplink (swap in the live URL if it changed):

   ```
   https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fiamtanmaypro.github.io%2Fsparkbench%2F
   ```

   If the deeplink does not open the page, paste the plain URL into the conversation and ask ChatGPT to open it in its browser. Either path counts.
2. Type: `What is the exact current through each part right now?` Expect the agent to call `describe_workbench` and `read_measurements`, then quote real numbers (amps to several decimals) that are nowhere on screen.

   Why this prompt and not "what do you see": ChatGPT's in-app browser is a hybrid agent. It can read the rendered page AND call our tools, and it takes the cheapest path that answers the question. Ask it what is on the bench and it will read the canvas and skip the tools, which is correct behavior and not a WebMCP failure. Ask for exact values or for a change, and the tool path wins on merit. Every prompt below is built that way.
3. Type: `Teach me series vs parallel. Switch me to lesson 2, explain the seeded circuit, then rebuild it so the two bulbs are in parallel and both glow bright. Propose each change to me and wait for my approval.` Approve the first card explicitly, then use **Approve next N** for the rest. End state: both bulbs bright and the lesson panel reads **Goal complete. Nice work.**
4. Break the circuit by hand (delete a wire), then type: `Why are the bulbs dark now?` Then open lesson 4 via `Open lesson 4 and figure out why the LED is dark. Leave me a note about it.` The agent runs `run_diagnosis`, names the burned LED, and leaves a signed note; the fix itself comes back as `needs_human`, which is the designed behavior. You replace the LED, then type `Check my work.` to see `check_answer` pass.
5. Type: `Fill in the lab report for me...` and watch the form glow while the agent fills it; you press **Submit report**.

The full script, including the on-camera approval beat, truncation and abort edge checks: [docs/gate2-chatgpt-demo.md](gate2-chatgpt-demo.md).

### Runtime B: Chrome 153+ (flag profile and origin-trial profile)

1. On a clean Chrome profile, enable `chrome://flags/#enable-webmcp-testing`, relaunch, and open the live URL. In DevTools, `document.modelContext` should be an object, not `undefined`.
2. Install the **Model Context Tool Inspector** extension and open it for the page.
3. Dynamic toolset check: on Lesson 1 the Inspector lists `ping_workbench`, the 5 reads, `open_lesson`, `focus_component`, and the writes `place_component`, `connect`, `set_property`, `get_proposal_status`, and NOT `remove_component`, `add_note`, or `run_diagnosis`. Switch to Lesson 2: `remove_component` and `add_note` join. Lesson 4: `run_diagnosis` appears. Back to Lesson 1: it disappears.
4. Second clean profile, no flags touched: open the same URL. The Chrome origin-trial token for `https://iamtanmaypro.github.io` is still pending (enrollment is a Tanmay step in [docs/gate1-checklist.md](gate1-checklist.md)); once the token ships in the page, WebMCP must work for a plain visitor with no flags. If `document.modelContext` is `undefined` there after the token is live, the token is expired or mis-issued; check `chrome://web-internals` and the origin trials console. The ChatGPT in-app browser route and the `chrome://flags/#enable-webmcp-testing` flag path were documented as working during the challenge without a token.

The three probe prompts with pass criteria, plus raw-JSON truncation probes: [docs/gate2-inspector.md](gate2-inspector.md).

### Solo (no agent)

Dismiss the banner and use the whole product with the mouse: palette, canvas, wiring, meters, lessons, lab report. No WebMCP required.
