import { beforeEach, describe, expect, it } from 'vitest'
import { useBenchStore } from '../store/useBenchStore'
import { runDiagnosisTool } from './diagnosis'

/**
 * A16 targeted coverage: run_diagnosis is the one execute() whose abort path
 * no other suite pins (reads/nav/approvals/ping each have their own). A call
 * arriving with a pre-aborted AbortSignal must return the aborted shape and
 * do NO work: no focus request, no log entry, no fault walk.
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

describe('run_diagnosis abort path (A16)', () => {
  it('returns the aborted shape and does no work on a pre-aborted signal', async () => {
    useBenchStore.getState().openLesson('diagnose-fault')
    expect(useBenchStore.getState().faults.length).toBeGreaterThan(0) // lesson 4 ships broken
    const before = useBenchStore.getState()
    expect(before.focusRequest).toBeNull()

    const ac = new AbortController()
    ac.abort()
    const out = await runDiagnosisTool.execute({}, { signal: ac.signal })

    expect(out).toEqual({ status: 'aborted' })
    const after = useBenchStore.getState()
    // No "look here" jump, no diagnosis log line: the tool never started.
    expect(after.focusRequest).toBeNull()
    expect(after.log).toEqual(before.log)
  })

  it('answers normally when the signal is live', async () => {
    useBenchStore.getState().openLesson('diagnose-fault')
    const out = (await runDiagnosisTool.execute({}, {})) as { status: string }
    expect(out.status).toBe('ok')
  })
})
