import { beforeEach, describe, expect, it } from 'vitest'
import { useBenchStore } from '../store/useBenchStore'
import {
  describeWorkbenchTool,
  readMeasurementsTool,
  getLessonStateTool,
  readNotesTool,
  checkAnswerTool,
} from './register'
import type { Terminal } from '../engine/netlist'
import { MAX_OUTPUT_CHARS } from './output'

/**
 * A09: read tools return correct grounded data against seeded store states —
 * describe_workbench (compact netlist + layout), read_measurements (solver
 * output incl. fault flags), get_lesson_state, read_notes (untrustedContentHint
 * true), check_answer (pass/fail + failing predicate, never the full solution).
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

beforeEach(() => {
  localStorage.clear()
  fresh()
})

describe('describe_workbench', () => {
  it('grounds the lesson-1 bench: ids, types, resolved values, layout, wiring', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await describeWorkbenchTool.execute({}, {})) as {
      lesson: string
      components: { id: string; type: string; value?: number; x: number; y: number }[]
      connections: string[]
    }
    expect(out.lesson).toContain("Ohm's Law")
    const bat = out.components.find((c) => c.id === 'bat1')
    expect(bat?.type).toBe('battery')
    // Seeded value 0 means "model default"; the tool resolves the nominal 3V.
    expect(bat?.value).toBe(3)
    expect(typeof bat?.x).toBe('number')
    expect(out.components.find((c) => c.id === 'r1')?.value).toBe(100)
    expect(out.connections).toContain('bat1:a -> r1:a')
    expect(out.connections).toContain('r1:b -> bat1:b')
  })

  it('keeps every compaction step inside the 1.5K budget as the bench grows', async () => {
    // Gate 2 truncation edge: the layout-omitted step used to append its flag
    // AFTER the budget check, so a near-limit compact payload could slip past
    // 1.5K by the flag's own length. Grow the bench through both compaction
    // steps (drop coordinates, then trim rows) and hold the line at every size.
    const add = () => useBenchStore.getState().addComponent('resistor', { x: 40, y: 40 })
    let sawLayoutOmitted = false
    let sawTrimmed = false
    for (let i = 0; i < 70; i++) {
      // Varying value digit-lengths shifts row size so the sweep crosses the
      // budget boundary at several different offsets, not just one.
      if (i % 7 === 3) useBenchStore.getState().setProperty(useBenchStore.getState().components.at(-1)!.id, 10 ** (i % 5))
      add()
      const out = (await describeWorkbenchTool.execute({}, {})) as {
        components: { id: string; x?: number; y?: number }[]
        layout_omitted?: boolean
        truncated?: boolean
        components_total?: number
      }
      const raw = JSON.stringify(out)
      expect(raw.length).toBeLessThanOrEqual(MAX_OUTPUT_CHARS)
      if (out.layout_omitted) {
        sawLayoutOmitted = true
        // The step that names itself must actually have dropped the layout.
        expect(out.components.every((c) => c.x === undefined && c.y === undefined)).toBe(true)
      }
      if (out.truncated) {
        sawTrimmed = true
        expect(out.components_total).toBe(useBenchStore.getState().components.length)
        expect(out.components.length).toBeLessThan(out.components_total!)
      }
    }
    // Both compaction steps were genuinely exercised by the sweep.
    expect(sawLayoutOmitted).toBe(true)
    expect(sawTrimmed).toBe(true)
  })
})

describe('read_measurements', () => {
  it('matches the live solver output for the current bench', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const store = useBenchStore.getState()
    const out = (await readMeasurementsTool.execute({}, {})) as {
      solved: boolean
      measurements: { id: string; V: number; I: number; P: number }[]
      faults: unknown[]
    }
    expect(out.solved).toBe(true)
    const bat = out.measurements.find((m) => m.id === 'bat1')!
    const live = store.solution.readings['bat1']!
    expect(Math.abs(bat.I - live.current)).toBeLessThan(1e-3)
    // 3V over 100.5 ohm -> about 30mA through the battery.
    expect(bat.I).toBeGreaterThan(0.02)
    expect(bat.I).toBeLessThan(0.04)
    expect(out.faults).toHaveLength(0)
  })

  it('surfaces fault flags on the pre-broken lesson-4 circuit', async () => {
    useBenchStore.getState().openLesson('diagnose-fault')
    const out = (await readMeasurementsTool.execute({}, {})) as {
      solved: boolean
      faults: { kind: string; element: string }[]
    }
    expect(out.solved).toBe(true)
    expect(out.faults.some((f) => f.kind === 'open_circuit' && f.element === 'led1')).toBe(true)
  })

  it('reports an unsolvable bench honestly instead of faking numbers', async () => {
    // Free build starts empty: solve() returns ok:false for zero components.
    const out = (await readMeasurementsTool.execute({}, {})) as { solved: boolean; note?: string }
    expect(out.solved).toBe(false)
    expect(typeof out.note).toBe('string')
  })
})

describe('get_lesson_state', () => {
  it('reports lesson, goal, progress, and predicate status', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await getLessonStateTool.execute({}, {})) as {
      lesson_id: string
      title: string
      goal: string
      lesson_number: number
      lesson_total: number
      completed_lessons: string[]
      hints_revealed: number
      hints_available: number
      passed: boolean
      failing: string[]
    }
    expect(out.lesson_id).toBe('ohms-law')
    expect(out.title).toContain("Ohm's Law")
    expect(out.goal.length).toBeGreaterThan(0)
    expect(out.lesson_number).toBe(1)
    expect(out.lesson_total).toBe(5)
    expect(out.hints_available).toBe(3)
    // Lesson 1 starts with one resistor; the goal needs two in series.
    expect(out.passed).toBe(false)
    expect(out.failing.some((f) => f.includes('resistor'))).toBe(true)
  })
})

describe('read_notes', () => {
  it('is annotated untrustedContentHint and returns authored notes', async () => {
    expect(readNotesTool.annotations?.untrustedContentHint).toBe(true)
    const s = useBenchStore.getState()
    s.addNote('maybe the switch is broken?', 10, 10, 'You')
    s.addNote('measured 12mA through r1', 20, 20, 'Agent')
    const out = (await readNotesTool.execute({}, {})) as {
      count: number
      notes: { id: string; author: string; text: string }[]
    }
    expect(out.count).toBe(2)
    expect(out.notes.map((n) => n.author)).toEqual(['You', 'Agent'])
    expect(out.notes[1]!.text).toContain('12mA')
    // The tool itself tells the agent the content is unverified.
    expect(JSON.stringify(out)).toContain('unverified')
  })

  it('caps long note text instead of blowing the budget', async () => {
    useBenchStore.getState().addNote('x'.repeat(500), 0, 0, 'You')
    const out = (await readNotesTool.execute({}, {})) as {
      notes: { text: string }[]
    }
    expect(out.notes[0]!.text.length).toBeLessThanOrEqual(161)
    expect(out.notes[0]!.text.endsWith('…')).toBe(true)
  })
})

describe('check_answer', () => {
  it('fails with the specific failing predicate, never the solution', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await checkAnswerTool.execute({}, {})) as {
      lesson: string
      passed: boolean
      failing: string[]
      message: string
    }
    expect(out.passed).toBe(false)
    expect(out.failing.some((f) => f.includes('resistor'))).toBe(true)
    // Grounded coaching only: never dump the predicate tree or the netlist.
    const raw = JSON.stringify(out)
    expect(raw).not.toContain('successPredicate')
    expect(raw).not.toContain('initialNetlist')
    expect(raw).not.toContain('current_within')
  })

  it('passes once the student wires the second resistor in series', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const s = useBenchStore.getState()
    // The student's fix: break the return wire, insert r2 in series.
    s.removeWire('lw1')
    const r2 = s.addComponent('resistor', { x: 250, y: 110 })
    s.connectTerminals(`${r2}:a` as Terminal, 'r1:b' as Terminal)
    s.connectTerminals(`${r2}:b` as Terminal, 'bat1:b' as Terminal)
    const out = (await checkAnswerTool.execute({}, {})) as {
      passed: boolean
      failing: string[]
    }
    // 3V over 200.5 ohm = ~15mA, inside the goal's 5-25mA window.
    expect(out.passed).toBe(true)
    expect(out.failing).toHaveLength(0)
  })
})

describe('abort handling', () => {
  it('every read tool respects a pre-aborted signal', async () => {
    const ac = new AbortController()
    ac.abort()
    for (const tool of [describeWorkbenchTool, readMeasurementsTool, getLessonStateTool, readNotesTool, checkAnswerTool]) {
      const out = await tool.execute({}, { signal: ac.signal })
      expect(out).toEqual({ status: 'aborted' })
    }
  })
})
