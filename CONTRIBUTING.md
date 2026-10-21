# Contributing

Sparkbench welcomes focused fixes, new teaching scenarios, and reports from people trying the lab or WebMCP integration. The [roadmap](docs/ROADMAP.md) describes current priorities. Maintainer: [Tanmay Sharma](https://github.com/iamtanmaypro).

## Start locally

Use Node.js 22.12 or later in the 22.x line, or Node.js 24 or later. From your fork:

```sh
npm ci
npm run dev
```

No account, backend, or API key is needed for manual use or deterministic tests. WebMCP requires a compatible external host; see the README for the limits of the historical runtime instructions.

## Before a pull request

```sh
npm run lint
npm test
npm run build
npm run build:pages
```

Explain the problem, the resulting behaviour, and the checks you actually ran. For a canvas or panel change, also try the relevant interaction in a real browser at wide and narrow widths. AI-assisted contributions are welcome; contributors are responsible for verifying their work.

For a new circuit scenario, start with [docs/SCENARIOS.md](docs/SCENARIOS.md). Calculate expected results independently, name the model assumptions, and supply tolerances. Do not use output from the solver being tested as the expected answer.

## Contracts to preserve

- Circuit-changing agent tools queue proposals. Keep human approval and rejection observable, including the status returned to the agent.
- Tools and UI call the same state actions. Do not introduce an agent-only circuit mutation path.
- Notes are untrusted text. Tool outputs must remain within the budgets tested in src/webmcp/budgets.test.ts.
- Respect abort signals and keep manual use working when WebMCP is unavailable.
- New tests should check outcomes, including readings or unchanged circuit state when approval is withheld.

## Reporting problems

[Open a bug report](https://github.com/iamtanmaypro/sparkbench/issues/new/choose) with the browser/host version, lesson, steps, and expected versus actual results. For circuit errors, include component values and wiring; for agent errors, include tool arguments and the human decision. Remove private information first. Follow [SECURITY.md](SECURITY.md) for sensitive reports.

Contributions are made under the repository's [MIT license](LICENSE).
