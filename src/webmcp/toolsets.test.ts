import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { benchTools } from './register'
import { runDiagnosisTool } from './diagnosis'
import { lessonStage, placeTypesForLesson, toolsetForLesson, writeToolNamesForLesson } from './toolsets'
import { useLessonTools } from './useTool'
import { useBenchStore } from '../store/useBenchStore'
import type { Terminal } from '../engine/netlist'
import type { ToolDefinition } from './model-context'
import { lessons } from '../lessons'

/**
 * A13: the toolset varies by lesson stage via provideContext-style dynamic
 * registration (useLessonTools + the matrix in toolsets.ts, surfaced to
 * agents by the browser's toolchange event):
 *
 *   - lesson 1 exposes only the minimal battery/resistor writes
 *   - run_diagnosis appears only in lessons 4+
 *   - free build exposes everything
 */

const READ_NAV = [
  'describe_workbench',
  'read_measurements',
  'get_lesson_state',
  'read_notes',
  'check_answer',
  'open_lesson',
  'focus_component',
]
const CORE_WRITES = ['place_component', 'connect', 'set_property', 'get_proposal_status']
const ALL_WRITES = [...CORE_WRITES, 'remove_component', 'add_note', 'run_diagnosis']

function namesFor(lessonId: string): string[] {
  return toolsetForLesson(lessonId, benchTools).map((t) => t.name)
}

function fresh() {
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

/** A clean, solvable two-part bench for write-tool behavior checks. */
function seedSimpleOhmsBench() {
  const s = useBenchStore.getState()
  const bat = s.addComponent('battery', { x: 100, y: 100 }) as string
  const r1 = s.addComponent('resistor', { x: 240, y: 100 }) as string
  s.connectTerminals(`${bat}:a` as Terminal, `${r1}:a` as Terminal)
  s.connectTerminals(`${r1}:b` as Terminal, `${bat}:b` as Terminal)
  useBenchStore.setState({ currentLessonId: 'ohms-law' })
}

beforeEach(() => {
  localStorage.clear()
  fresh()
})

describe('per-lesson toolset matrix (A13)', () => {
  it('lesson 1 exposes only the minimal battery/resistor writes', () => {
    expect(lessonStage('ohms-law')).toBe('guided-minimal')
    expect(namesFor('ohms-law')).toEqual([...READ_NAV, ...CORE_WRITES])
    expect(namesFor('ohms-law')).not.toContain('remove_component')
    expect(namesFor('ohms-law')).not.toContain('add_note')
    expect(namesFor('ohms-law')).not.toContain('run_diagnosis')
  })

  it('lessons 2-3 widen the writes but keep run_diagnosis hidden', () => {
    for (const id of ['series-parallel', 'switches-logic']) {
      expect(lessonStage(id)).toBe('guided')
      expect(namesFor(id)).toEqual([...READ_NAV, ...CORE_WRITES, 'remove_component', 'add_note'])
      expect(namesFor(id)).not.toContain('run_diagnosis')
    }
  })

  it('run_diagnosis joins only in lessons 4+', () => {
    expect(lessonStage('diagnose-fault')).toBe('diagnosis')
    expect(namesFor('diagnose-fault')).toContain('run_diagnosis')

    expect(lessonStage('free-build')).toBe('free')
    expect(namesFor('free-build')).toEqual([...READ_NAV, ...ALL_WRITES])
  })

  it('unknown lesson ids fall back to the minimal stage', () => {
    expect(writeToolNamesForLesson('not-a-lesson')).toEqual(CORE_WRITES)
  })

  it('every lesson id resolves against the pool without a matrix typo', () => {
    for (const lesson of lessons) {
      expect(() => toolsetForLesson(lesson.id, benchTools)).not.toThrow()
    }
  })
})

describe('per-lesson place_component palette (A13)', () => {
  it('lesson 1 keeps the agent to battery/resistor even though the human palette has meters', () => {
    expect(placeTypesForLesson('ohms-law')).toEqual(['battery', 'resistor'])
    expect(placeTypesForLesson('free-build')).toHaveLength(8)
  })

  it('place_component rejects out-of-palette types in lesson 1', async () => {
    seedSimpleOhmsBench()
    const out = (await benchTools
      .find((t) => t.name === 'place_component')!
      .execute({ type: 'ammeter' }, {})) as { status: string; allowed_types?: string[] }
    expect(out.status).toBe('error')
    expect(out.allowed_types).toEqual(['battery', 'resistor'])
  })

  it('place_component queues a proposal for an allowed lesson-1 type', async () => {
    seedSimpleOhmsBench()
    const out = (await benchTools
      .find((t) => t.name === 'place_component')!
      .execute({ type: 'resistor' }, {})) as { status: string; proposal_id?: string }
    expect(out.status).toBe('pending_approval')
    expect(out.proposal_id).toBeTruthy()
    expect(useBenchStore.getState().components).toHaveLength(2) // nothing placed yet
  })
})

describe('run_diagnosis (lessons 4+ only)', () => {
  it('is part of the canonical pool so budgets lint it', () => {
    expect(benchTools).toContain(runDiagnosisTool)
  })

  it('reports the lesson-4 faults, focuses the first probe, and logs the run', async () => {
    useBenchStore.getState().openLesson('diagnose-fault')
    const faultCount = useBenchStore.getState().faults.length
    expect(faultCount).toBeGreaterThan(0) // lesson 4 ships pre-broken circuits

    const out = (await runDiagnosisTool.execute({}, {})) as {
      status: string
      faults_found: number
      focused?: string
      probes: { probe: string; kind: string; context: string; suggestion: string }[]
    }
    expect(out.status).toBe('ok')
    expect(out.faults_found).toBe(faultCount)
    expect(out.probes).toHaveLength(faultCount)
    for (const p of out.probes) {
      expect(p.probe).toBeTruthy()
      expect(p.context).toBeTruthy()
      expect(p.suggestion).toBeTruthy()
    }
    expect(out.focused).toBeTruthy()
    expect(useBenchStore.getState().focusRequest?.id).toBe(out.focused)
    expect(useBenchStore.getState().log.some((e) => e.text.includes('guided fault diagnosis'))).toBe(true)
  })

  it('reports a clean bench without inventing faults', async () => {
    useBenchStore.setState({ currentLessonId: 'diagnose-fault', faults: [] })
    const out = (await runDiagnosisTool.execute({}, {})) as { status: string; faults_found: number }
    expect(out.status).toBe('ok')
    expect(out.faults_found).toBe(0)
  })

  it('refuses to run outside lessons 4+ even with a stale registration', async () => {
    seedSimpleOhmsBench()
    const out = (await runDiagnosisTool.execute({}, {})) as { status: string }
    expect(out.status).toBe('error')
    expect(useBenchStore.getState().focusRequest).toBeNull()
  })
})

describe('useLessonTools dynamic registration', () => {
  const doc = document as unknown as Record<string, unknown>
  let savedDoc: unknown

  beforeEach(() => {
    savedDoc = doc.modelContext
  })

  it('registers the lesson subset, then removes exactly the tools the new stage drops', () => {
    const mc = { registerTool: vi.fn(), removeTool: vi.fn() }
    doc.modelContext = mc
    try {
      useBenchStore.getState().openLesson('diagnose-fault')
      const { unmount } = renderHook(() => useLessonTools())

      const registered = mc.registerTool.mock.calls.map((c) => (c[0] as ToolDefinition).name)
      expect(registered).toEqual(namesFor('diagnose-fault'))

      const registersAfterMount = mc.registerTool.mock.calls.length
      act(() => {
        useBenchStore.getState().openLesson('ohms-law')
      })

      const removed = mc.removeTool.mock.calls.map((c) => c[0])
      // Exactly the stage delta leaves; the shared read/nav/core tools stay.
      expect(removed).toEqual(expect.arrayContaining(['remove_component', 'add_note', 'run_diagnosis']))
      expect(removed).not.toContain('place_component')
      expect(removed).not.toContain('describe_workbench')
      // Diffing, not re-register-everything: no redundant registrations.
      expect(mc.registerTool.mock.calls.length).toBe(registersAfterMount)

      unmount()
      // Unmount clears the model context of everything the hook registered.
      const removedAfterUnmount = mc.removeTool.mock.calls.map((c) => c[0])
      expect(removedAfterUnmount).toEqual(expect.arrayContaining(READ_NAV))
    } finally {
      if (savedDoc !== undefined) doc.modelContext = savedDoc
      else delete doc.modelContext
    }
  })

  it('registers nothing when no model context exists', () => {
    const { unmount } = renderHook(() => useLessonTools())
    expect(useBenchStore.getState().currentLessonId).toBeTruthy() // ran without throwing
    unmount()
  })
})
