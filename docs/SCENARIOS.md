# Reproducible circuit and tool scenarios

The JSON files in [fixtures/scenarios](../fixtures/scenarios) describe circuits, expected numerical readings, tool calls, and scripted human decisions. They are reusable examples for developers integrating agents with shared application state. They are not measurements of a model's ability or WebMCP host conformance.

```sh
npm ci
npm run test:scenarios
```

The replay uses the actual solver, fault detector, tools, proposal queue, decision actions, and proposal-status tool. No API key, model, network service, or WebMCP browser host is used. The test environment provides browser storage in memory.

## Cases and independent expected values

The battery model has 0.5 ohms of internal resistance. Switches are ideal when closed; bulbs use a fixed 30 ohm resistance. Values use volts, amperes, watts, and ohms.

| Fixture | Expected result and derivation |
|---|---|
| series-switch.json | Open switch: zero current. After approved closure, I = 3 / (30 + 30 + 0.5), V per bulb = I x 30 = 1.487603306 V. |
| parallel-veto.json | Two 30 ohm bulbs in parallel give 15 ohms. V = 3 x 15 / 15.5 = 2.903225806 V. Each branch has I = V / 30 and P = V squared / 30. Rejecting removal preserves the netlist and readings. |
| divider-correction.json | Initially Vout = 3 x 100 / (200 + 100 + 0.5) = 0.9983361065 V. Replacing 200 with 199.5 gives exactly 1 V in this model, after approval. |
| burned-led.json | A latched burned LED is open, so no current flows. Diagnosis must identify led1; a removal attempt must return needs_human and leave the netlist unchanged. |

## Format

Each file has an id, title, netlist, initial readings, and steps. A netlist uses the engine's component and wire format; wire terminals are component-id:a or component-id:b. Each reading names a component, quantity, expected value, and positive absolute tolerance in the corresponding SI unit. Each step supplies a tool, args, and the expected partial response, with optional decision (approve/reject) and post-decision readings.

The replay checks that tools leave circuit data unchanged before a human decision. It also checks the recorded proposal outcome, rejected-change invariance, and the expected numerical results. New tool types must be explicitly added to the replay's tool map. Keep new fixtures small enough that a reviewer can calculate their expected results independently.

To add a fixture, add its JSON and include its id in the discovery assertion in [replay.test.ts](../src/scenarios/replay.test.ts). The full test suite runs the fixtures automatically. A regression in a tool result, decision, or expected measurement fails the run.

## External-agent runs

For an actual agent evaluation, record the host/browser version, model, date, tool transcript, human decisions, cost, and failures. Confirm discovery and execution through the host, then compare final readings with the fixture. Keep those observations separate from the deterministic replay. This repository does not yet publish such a scored evaluation.
