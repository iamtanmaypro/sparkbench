import { beforeEach, describe, expect, it } from 'vitest'
import {
  placeComponentTool,
  connectTool,
  setPropertyTool,
  removeComponentTool,
  needsHumanEscalation,
} from './approvals'
import { readMeasurementsTool } from './register'
import { useBenchStore } from '../store/useBenchStore'
import type { Terminal } from '../engine/netlist'

/**
 * A12: tools invoked against faulted/unsolvable circuits return
 * {status:"needs_human", context, suggestion} instead of throwing, and the
 * suggestion references the specific faulty element. Reads stay grounding:
 * they keep reporting fault data so the agent can diagnose; only writes
 * refuse to act until a human fixes the fault.
 */

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

function expectNeedsHuman(out: unknown): { status: string; context: string; suggestion: string } {
  const o = out as { status: string; context: string; suggestion: string }
  expect(o.status).toBe('needs_human')
  expect(typeof o.context).toBe('string')
  expect(o.context.length).toBeGreaterThan(0)
  expect(typeof o.suggestion).toBe('string')
  expect(o.suggestion.length).toBeGreaterThan(0)
  return o
}

beforeEach(() => {
  localStorage.clear()
  fresh()
})

describe('short circuit escalates writes', () => {
  // A battery with a wire straight across its terminals: ~6A, far over the 5A
  // short threshold. A spare resistor sits unwired so connect has valid args.
  function seedShort(): { bat: string; r: string } {
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery', { x: 10, y: 10 })
    const r = s.addComponent('resistor', { x: 150, y: 10 })
    s.connectTerminals(`${bat}:a` as Terminal, `${bat}:b` as Terminal)
    expect(useBenchStore.getState().faults[0]).toMatchObject({ kind: 'short_circuit', element: bat })
    return { bat, r }
  }

  it('every write tool returns needs_human with the faulty element named', async () => {
    const { bat, r } = seedShort()
    const place = await placeComponentTool.execute({ type: 'led' }, {})
    const wire = await connectTool.execute({ from_terminal: `${r}:a`, to_terminal: `${r}:b` }, {})
    const tune = await setPropertyTool.execute({ id: bat, value: 6 }, {})
    const remove = await removeComponentTool.execute({ id: r }, {})

    for (const out of [place, wire, tune, remove]) {
      const e = expectNeedsHuman(out)
      expect(e.context).toContain(bat)
      expect(e.suggestion).toContain(bat)
    }
    // Escalation is not a proposal: nothing queued, bench untouched.
    const s = useBenchStore.getState()
    expect(s.proposals).toHaveLength(0)
    expect(s.components).toHaveLength(2)
  })

  it('helper returns the fault context and a re-measure continuation', () => {
    seedShort()
    const e = needsHumanEscalation()
    expect(e).not.toBeNull()
    expect(e!.context).toContain('Short circuit')
    expect(e!.suggestion.toLowerCase()).toContain('re-measure')
  })

  it('reads stay grounding on the faulted bench (no needs_human)', async () => {
    seedShort()
    const out = (await readMeasurementsTool.execute({}, {})) as {
      solved: boolean
      faults: { kind: string; element: string }[]
    }
    expect(out.solved).toBe(true)
    expect(out.faults.some((f) => f.kind === 'short_circuit' && f.element === 'bat1')).toBe(true)
    expect(JSON.stringify(out)).not.toContain('needs_human')
  })
})

describe('open circuit escalates writes', () => {
  it('the pre-broken lesson-4 bench escalates and names the dead LED', async () => {
    useBenchStore.getState().openLesson('diagnose-fault')
    const fault = useBenchStore.getState().faults[0]!
    expect(fault.kind).toBe('open_circuit')

    const out = expectNeedsHuman(await connectTool.execute({ from_terminal: 'bat1:a', to_terminal: 'r1:a' }, {}))
    expect(out.context).toContain(fault.element)
    expect(out.suggestion).toContain(fault.element)
    expect(useBenchStore.getState().proposals).toHaveLength(0)
  })
})

describe('LED burnout escalates writes', () => {
  it('an over-current LED (below the latch threshold) returns needs_human naming led1', async () => {
    // 3V battery + 33 ohm series resistor + LED: ~30mA. Over the LED's 20mA
    // fault limit, under the 50mA latch threshold, so the burnout fault
    // persists instead of instantly latching the LED dead.
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery', { x: 10, y: 10 })
    const r = s.addComponent('resistor', { x: 150, y: 10 })
    s.setProperty(r, 33)
    const led = s.addComponent('led', { x: 290, y: 10 })
    s.connectTerminals(`${bat}:a` as Terminal, `${r}:a` as Terminal)
    s.connectTerminals(`${r}:b` as Terminal, `${led}:a` as Terminal)
    s.connectTerminals(`${led}:b` as Terminal, `${bat}:b` as Terminal)
    expect(useBenchStore.getState().faults[0]).toMatchObject({ kind: 'led_burnout', element: led })

    const out = expectNeedsHuman(await setPropertyTool.execute({ id: r, value: 100 }, {}))
    expect(out.context).toContain(led)
    expect(out.suggestion).toContain(led)
    expect(useBenchStore.getState().proposals).toHaveLength(0)
  })
})

describe('normal build states do NOT escalate (writes stay usable)', () => {
  it('an unfinished loop mid-build (battery + unwired resistor) still proposes', async () => {
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery', { x: 10, y: 10 })
    const r = s.addComponent('resistor', { x: 150, y: 10 })
    // The engine reports a generic open_circuit here; that is build progress,
    // not a fault, so the write tool queues a proposal instead of escalating.
    expect(useBenchStore.getState().faults[0]!.kind).toBe('open_circuit')
    expect(needsHumanEscalation()).toBeNull()

    const out = (await placeComponentTool.execute({ type: 'led' }, {})) as { status: string }
    expect(out.status).toBe('pending_approval')
    expect(bat).toBeTruthy()
    expect(r).toBeTruthy()
  })

  it('a simply-open switch is a control state, not a fault: set_property proposes', async () => {
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery', { x: 10, y: 10 })
    const sw = s.addComponent('switch', { x: 150, y: 10 })
    s.connectTerminals(`${bat}:a` as Terminal, `${sw}:a` as Terminal)
    s.connectTerminals(`${sw}:b` as Terminal, `${bat}:b` as Terminal)
    expect(useBenchStore.getState().faults[0]).toMatchObject({ kind: 'open_circuit', element: sw })
    expect(needsHumanEscalation()).toBeNull()

    const out = (await setPropertyTool.execute({ id: sw, property: 'closed', value: true }, {})) as {
      status: string
    }
    expect(out.status).toBe('pending_approval')
  })
})

describe('unsolvable bench escalates, empty bench does not', () => {
  it('a non-empty bench that cannot be solved escalates with a contradiction context', async () => {
    // Singular-matrix state (e.g. contradictory sources): craft via setState —
    // the escalation helper reads exactly what the store holds.
    useBenchStore.setState({
      components: [{ id: 'bat1', type: 'battery', value: 3 }],
      nodes: [{ id: 'bat1', type: 'battery', x: 10, y: 10 }],
      wires: [],
      solution: { ok: false, nodes: [], readings: {} },
      faults: [],
    })
    const out = expectNeedsHuman(await placeComponentTool.execute({ type: 'resistor' }, {}))
    expect(out.context).toContain('cannot be solved')
    expect(useBenchStore.getState().proposals).toHaveLength(0)
  })

  it('an empty free-build bench stays writable: building from scratch must work', async () => {
    expect(needsHumanEscalation()).toBeNull()
    const out = (await placeComponentTool.execute({ type: 'battery' }, {})) as { status: string }
    expect(out.status).toBe('pending_approval')
    expect(useBenchStore.getState().proposals).toHaveLength(1)
  })
})
