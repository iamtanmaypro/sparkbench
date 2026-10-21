# Roadmap

Sparkbench's direction is a useful circuit-learning app and an inspectable example of browser agents working on shared state. These are proposed priorities; they are not release-date commitments or claims of outside adoption.

## Current foundation

- Five editable lessons, a DC solver, live readings, and fault detection.
- WebMCP tool registration with lesson-specific subsets and approval-gated circuit edits.
- Four public circuit/tool scenarios with independent expected values and reproducible scripted decisions.
- Automated checks for pull requests, contributor instructions, and a security reporting route.

## Next work

1. **Current host compatibility.** Re-run discovery, approved edits, rejected edits, lesson changes, and declarative report behaviour in supported external hosts. Publish exact host versions, dates, and failures. Origin-trial enrollment remains incomplete. Done when a new developer can follow a dated guide and reproduce the result.
2. **Independent use.** Collect reports from educators, learners, and WebMCP developers trying one scenario. Fix reproducible problems and publish feedback only with permission. Done when reports and their outcomes are public; maintainer tests alone do not establish this.
3. **Lesson authoring.** Document the JSON lesson format and work through a complete goal-predicate example. Done when another contributor can add and verify a lesson from that guide.
4. **Usability and accessibility.** Check keyboard operation, narrow-screen circuit editing, meters, approvals, and reports. Document current limits before claiming classroom readiness.
5. **Measured agent evaluations.** Reuse the public fixtures for observed agent runs with model/host details, traces, numerical tolerances, cost, and failures. Publish results only from actual runs.

## Release practice

Before tagging a release, run the full checks, verify the Pages subpath build, try manual flows in a real browser, and record known runtime limitations. Keep application code, tests, and instructions aligned. Historical challenge copy remains in its own files; it is not current support evidence.
