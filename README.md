# Sparkbench

**A shared circuit lab for people and browser agents.**

Build DC circuits, inspect live measurements, and let an agent propose changes through WebMCP. Circuit-changing tools use the same application state as the canvas and wait for human approval. The lab also works manually without an agent, account, API key, or backend.

[Open the lab](https://iamtanmaypro.github.io/sparkbench/) · [Run the reference scenarios](docs/SCENARIOS.md) · [Contribute](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md)

## Why this exists

A useful browser agent needs more than a way to click buttons: it needs access to application state, measurable outcomes, and clear permission boundaries. Sparkbench puts those concerns in one inspectable example. A voltage divider can look correct while measuring 0.9983 V instead of 1.00 V; a proposed deletion must leave the circuit intact when the student rejects it.

For learners, there are five editable lessons: Ohm's Law, Series vs Parallel, Switches and Logic, Diagnose the Fault, and Free Build. For developers, the repository includes the simulation engine, WebMCP tools, approval flow, and public JSON scenarios with numerical tolerances and expected decisions.

Sparkbench is an early-stage project maintained by [Tanmay Sharma](https://github.com/iamtanmaypro). It began during the OpenAI WebMCP Challenge in August/September 2026. Its development has been AI-assisted; the commit history records contributions. It is not an official OpenAI or Chrome reference implementation, a WebMCP conformance suite, or a model leaderboard.

## Try it in two minutes

1. [Open the lab](https://iamtanmaypro.github.io/sparkbench/). Dismiss the WebMCP hint if it appears.
2. Choose **Series vs Parallel** and click the switch on the canvas to close it. Both bulbs light dimly in series.
3. Select a bulb to inspect its measurements. Use the lesson hints to rebuild the circuit with parallel branches.
4. Choose **Diagnose the Fault** to inspect a circuit with a burned LED, or **Free Build** to start your own experiment.

The lab report stays in the page: you can fill it manually, or a compatible agent can fill it for you. The human submits it.

## Run locally

Use Node.js 22.12 or later in the 22.x line, or Node.js 24 or later, and npm. CI uses Node 22.

```sh
git clone https://github.com/iamtanmaypro/sparkbench.git
cd sparkbench
npm ci
npm run dev
```

```sh
npm run test:scenarios  # four reusable circuit/tool scenarios
npm test                # complete automated suite
npm run lint
npm run build           # type-check and build at /
npm run build:pages     # type-check and build at /sparkbench/
```

The GitHub Actions workflow runs tests, lint, and both builds on pull requests and pushes to main. It does not deploy the app. GitHub Pages currently serves the separately built gh-pages branch.

## Reproducible examples

| Scenario | Observable result |
|---|---|
| Series switch | No circuit change before approval; closing the switch produces about 1.4876 V per bulb. |
| Parallel veto | Each bulb reads about 2.9032 V; rejecting battery removal preserves the circuit and readings. |
| Divider correction | A 200/100 ohm divider gives 0.998336 V. Approving 199.5 ohms for the upper resistor gives 1.000000 V. |
| Burned LED | Diagnosis identifies led1, and a circuit-edit attempt returns needs_human without changing the circuit. |

The fixtures and replay instructions are in [docs/SCENARIOS.md](docs/SCENARIOS.md). These checks execute the real tools and shared store with scripted human decisions. They do not run a language model or prove that an external browser host discovers the tools.

## Agent integration

The app feature-detects `document.modelContext` and then `navigator.modelContext`. If neither is available, the hint banner appears and manual operation remains available. Agent access requires a browser host that actually exposes this experimental API; a normal tab is not enough. A missing banner alone does not prove that an agent can discover and call tools.

The [challenge runtime walkthrough](docs/challenge-runtime-guide.md), [ChatGPT demo script](docs/gate2-chatgpt-demo.md), and [Inspector probes](docs/gate2-inspector.md) are historical test procedures. Current host compatibility and origin-trial activation still need fresh external verification. Do not assume the old deeplink or Chrome flag works on your installation.

The imperative pool contains 15 tools; active subsets have 12 tools in lesson 1, 14 in lessons 2 and 3, and 15 in lessons 4 and 5. The declarative lab-report form is a separate surface whose exposure depends on the host.

| Tool | Purpose and permission |
|---|---|
| ping_workbench | Connection health check |
| describe_workbench | Components and wiring |
| read_measurements | Voltage, current, power, and faults |
| get_lesson_state | Goal and lesson progress |
| read_notes | Untrusted free-text notes |
| check_answer | Lesson predicate result |
| open_lesson | Switch lessons immediately; resets the circuit and pending proposals |
| focus_component | Focus and highlight a part immediately |
| place_component | Propose a new part; approval required |
| connect | Propose a wire; approval required |
| set_property | Propose a value or switch change; approval required |
| remove_component | Propose part removal; approval required |
| add_note | Add an Agent-labelled note immediately; no circuit change |
| get_proposal_status | Confirm whether a proposal is pending, approved, or rejected |
| run_diagnosis | Guided fault report and focus, available from lesson 4 |

Approval cards also offer an explicit control to approve the next N pending proposals. They are an application interaction boundary, not isolation from a browser extension or host with broader browser access. See [SECURITY.md](SECURITY.md).

Good prompts for a compatible host:

- `Close the switch and tell me the exact current through each bulb. Ask before changing it.`
- `Open free build and build a divider with exactly 1.00 V output. Measure it and correct it if needed.`
- `Open lesson 4 and diagnose the dead part from the readings.`

## Architecture

Both human interactions and agent tools call the same Zustand store actions. Those actions run a pure TypeScript DC solver, update readings and fault flags, evaluate the lesson goal, and persist circuit state locally.

| Directory | Responsibility |
|---|---|
| src/engine | Netlist, component models, modified nodal analysis, fault detection |
| src/store | Shared circuit state, proposals, decisions, persistence |
| src/webmcp | Tool registration, schemas, descriptions, budgets, approval wrappers |
| src/lessons | Five JSON lessons and goal predicates |
| src/ui | Canvas, meters, approval cards, notes, report, and activity log |
| fixtures/scenarios | Portable example circuits, expected values, and tool decisions |

Start with [register.ts](src/webmcp/register.ts), [approvals.ts](src/webmcp/approvals.ts), and [toolsets.ts](src/webmcp/toolsets.ts). Tool budgets are checked in [budgets.test.ts](src/webmcp/budgets.test.ts): names up to 30 characters, descriptions up to 500, parameter descriptions up to 150, and serialized outputs up to 1,500. Truncated collections carry explicit counts.

## Model limits and project status

The engine models simplified DC circuits. Batteries include 0.5 ohms of internal resistance; bulbs use fixed resistance; LEDs use a fixed forward drop and a burnout threshold. There is no AC, transient, thermal, or SPICE model. Measurements are simulation results, not physical measurements or electrical safety advice.

On 21 October 2026 the original 196 automated tests passed before this maintenance work. The added public scenario replay contributes five checks. Current external-agent compatibility, classroom use, and independent adoption have not been established by these local tests. The [roadmap](docs/ROADMAP.md) lists the next work and the evidence needed to call it done.

[Bug reports](https://github.com/iamtanmaypro/sparkbench/issues/new/choose), reproducible runtime reports, and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Original challenge copy and recording scripts are retained in copy/, video/, and the historical docs.

## License

[MIT](LICENSE). You can inspect, modify, and reuse the application and reference scenarios under that license.
