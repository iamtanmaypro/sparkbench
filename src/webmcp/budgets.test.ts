import { beforeEach, describe, expect, it } from 'vitest'
import { benchTools, pingTool, describeWorkbenchTool, readMeasurementsTool } from './register'
import { useBenchStore } from '../store/useBenchStore'
import type { Terminal } from '../engine/netlist'
import type { ToolDefinition } from './model-context'

/**
 * A08: the Chrome secure-tools budgets are law, so they are enforced as a
 * lint over EVERY registration (plus the ping tool the banner registers):
 *
 *   name <= 30 chars, description <= 500 chars,
 *   each parameter description <= 150 chars,
 *   serialized tool output <= 1.5K chars for representative states.
 *
 * New tools must join `benchTools` in register.ts to be covered here.
 */
const NAME_MAX = 30
const DESC_MAX = 500
const PARAM_DESC_MAX = 150
const OUTPUT_MAX = 1536 // 1.5K

/** Everything a runtime could ever execute, including the banner's ping. */
const ALL_TOOLS: ToolDefinition[] = [...benchTools, pingTool]

function expectBudgets(tool: ToolDefinition): void {
  expect(tool.name.length).toBeLessThanOrEqual(NAME_MAX)
  expect(tool.description.length).toBeLessThanOrEqual(DESC_MAX)
  for (const [param, schema] of Object.entries(tool.inputSchema?.properties ?? {})) {
    expect(param.length).toBeLessThanOrEqual(NAME_MAX)
    const desc = (schema as { description?: string }).description
    if (typeof desc === 'string') expect(desc.length).toBeLessThanOrEqual(PARAM_DESC_MAX)
  }
}

async function outputChars(tool: ToolDefinition): Promise<number> {
  const out = await tool.execute({}, {})
  return JSON.stringify(out)?.length ?? 0
}

function fresh(): void {
  useBenchStore.setState({
    components: [],
    nodes: [],
    wires: [],
    origins: {},
    selectedId: null,
    solution: { ok: false, nodes: [], readings: {} },
    faults: [],
    notes: [],
    log: [],
    proposals: [],
    agentActive: false,
    focusRequest: null,
    currentLessonId: 'free-build',
    completedLessonIds: new Set<string>(),
    predicate: { passed: false, failures: [] },
    hintsShown: 0,
  })
}

beforeEach(() => {
  localStorage.clear()
  fresh()
})

describe('WebMCP budget lint (A08)', () => {
  it.each(benchTools)('$name keeps name/description/parameter budgets', (tool) => {
    expectBudgets(tool)
  })

  it('ping_workbench (registered by the banner) keeps budgets too', () => {
    expectBudgets(pingTool)
  })

  it('every tool output fits 1.5K on a guided-lesson bench', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    for (const tool of ALL_TOOLS) {
      expect(await outputChars(tool)).toBeLessThanOrEqual(OUTPUT_MAX)
    }
  })

  it('every tool output fits 1.5K on a busy free-build bench', async () => {
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery', { x: 100, y: 100 })
    const r1 = s.addComponent('resistor', { x: 240, y: 60 })
    const r2 = s.addComponent('resistor', { x: 240, y: 140 })
    const led = s.addComponent('led', { x: 380, y: 100 })
    s.addComponent('switch', { x: 380, y: 200 })
    s.addComponent('bulb', { x: 100, y: 220 })
    s.addComponent('fuse', { x: 240, y: 220 })
    s.addComponent('ammeter', { x: 500, y: 100 })
    s.addComponent('voltmeter', { x: 500, y: 200 })
    s.connectTerminals(`${bat}:a` as Terminal, `${r1}:a` as Terminal)
    s.connectTerminals(`${r1}:b` as Terminal, `${led}:a` as Terminal)
    s.connectTerminals(`${led}:b` as Terminal, `${bat}:b` as Terminal)
    s.connectTerminals(`${r2}:a` as Terminal, `${r1}:a` as Terminal)
    s.connectTerminals(`${r2}:b` as Terminal, `${bat}:b` as Terminal)
    s.addNote('voltage across r1 should match the divider ratio', 300, 300, 'You')
    s.addNote('measured 12mA through the LED branch; that is under the 20mA limit', 320, 340, 'Agent')
    s.propose({ kind: 'set_property', id: r2, value: 220 }, `Agent wants to: set ${r2} to 220 ohms`)
    for (const tool of ALL_TOOLS) {
      expect(await outputChars(tool)).toBeLessThanOrEqual(OUTPUT_MAX)
    }
  })

  it('every tool output fits 1.5K on a 40-part stress bench (truncation engages)', async () => {
    const s = useBenchStore.getState()
    for (let i = 0; i < 40; i++) {
      s.addComponent('resistor', { x: 40 + (i % 10) * 90, y: 60 + Math.floor(i / 10) * 80 })
    }
    const bat = s.addComponent('battery', { x: 60, y: 420 })
    // Dead short across the battery: one loud fault, exercise fault summaries.
    s.connectTerminals(`${bat}:a` as Terminal, `${bat}:b` as Terminal)
    s.addNote('x'.repeat(400), 200, 420, 'You')
    s.addNote('short-lived note', 220, 460, 'Agent')

    for (const tool of ALL_TOOLS) {
      expect(await outputChars(tool)).toBeLessThanOrEqual(OUTPUT_MAX)
    }

    // And prove the outputs were compacted honestly, not silently clipped:
    // over-budget tools report what they left out.
    const described = (await describeWorkbenchTool.execute({}, {})) as {
      truncated?: boolean
      components: unknown[]
      components_total?: number
    }
    expect(described.truncated).toBe(true)
    expect(described.components_total).toBe(41)
    expect(described.components.length).toBeLessThan(41)

    const measured = (await readMeasurementsTool.execute({}, {})) as {
      measurements: unknown[]
      measurements_total?: number
      faults: { kind: string; element: string }[]
    }
    expect(measured.measurements_total).toBe(41)
    expect(measured.measurements.length).toBeLessThan(41)
    expect(measured.faults.some((f) => f.kind === 'short_circuit' && f.element === bat)).toBe(true)
  })
})
