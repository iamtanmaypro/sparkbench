# Sparkbench

A browser electronics lab where a student and their AI agent share one workbench through WebMCP. The agent places components, wires circuits, takes measurements, and diagnoses faults while the student stays in control of every change.

Built during the OpenAI WebMCP Challenge (Aug 26 to Sep 3, 2026); all work is new.

## Status

Phase 0 scaffold. The full workbench, circuit engine, lesson system, and 14-tool WebMCP inventory land in later phases.

Already working:

- Vite + TypeScript (strict) + React app shell
- `src/webmcp/useTool()` hook feature-detecting `document.modelContext ?? navigator.modelContext`
- One dummy tool (`ping_workbench`) registered when WebMCP is present
- Dismissible banner pointing at setup instructions when WebMCP is absent
- Origin-trial meta placeholder in `index.html`

## Live URL

Coming after Gate 1 deploy: https://sparkbench.pages.dev

## How to test with an agent (both runtimes)

See [docs/gate1-checklist.md](docs/gate1-checklist.md) for step-by-step instructions for ChatGPT's in-app browser and Chrome's WebMCP flag/origin trial.

Solo (no agent): the app is fully usable without WebMCP. Just dismiss the banner.

## Development

```sh
npm install
npm run dev       # local dev server
npm run build     # tsc + vite production bundle in dist/
npx vitest run    # unit tests
```

## License

MIT, see [LICENSE](LICENSE).
