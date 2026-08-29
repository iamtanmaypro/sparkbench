import { beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { render } from '@testing-library/react'
import { openLessonTool, focusComponentTool } from './register'
import { useBenchStore } from '../store/useBenchStore'
import { getLesson } from '../lessons'
import { Workbench } from '../ui/Workbench'

/**
 * A10: navigation tools drive visible UI through store actions.
 * open_lesson switches the lesson and reseeds the bench (per-lesson dynamic
 * toolsets hook the same action; they land with the toolset feature).
 * focus_component pans/zooms and pulse-highlights the target via the store's
 * focusRequest, which the canvas and node renderer consume.
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

describe('open_lesson', () => {
  it('switches the lesson and reseeds the bench', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await openLessonTool.execute({ lesson_id: 'series-parallel' }, {})) as {
      status: string
      already_open: boolean
      opened: { id: string; title: string }
    }
    expect(out.status).toBe('ok')
    expect(out.already_open).toBe(false)
    expect(out.opened.id).toBe('series-parallel')

    const s = useBenchStore.getState()
    expect(s.currentLessonId).toBe('series-parallel')
    // The lesson's initial netlist is exactly what is on the bench now.
    const lesson = getLesson('series-parallel')!
    expect(s.components.map((c) => c.id).sort()).toEqual(
      lesson.initialNetlist.components.map((c) => c.id).sort(),
    )
    expect(s.wires).toHaveLength(lesson.initialNetlist.wires.length)
    // The store recomputed solver output + predicate for the new bench.
    expect(typeof s.predicate.passed).toBe('boolean')
    // The switch is visible in the shared log.
    expect(s.log.some((e) => e.text.includes('Opened Lesson 2'))).toBe(true)
  })

  it('rejects an unknown lesson id and leaves the bench untouched', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const before = useBenchStore.getState().components
    const out = (await openLessonTool.execute({ lesson_id: 'not-a-lesson' }, {})) as {
      status: string
      message: string
      available_lessons: string[]
    }
    expect(out.status).toBe('error')
    expect(out.available_lessons).toEqual([
      'ohms-law',
      'series-parallel',
      'switches-logic',
      'diagnose-fault',
      'free-build',
    ])
    const s = useBenchStore.getState()
    expect(s.currentLessonId).toBe('ohms-law')
    expect(s.components).toBe(before)
  })

  it('reports already_open when asked for the current lesson', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    // A part the student added mid-lesson must survive the no-op open.
    useBenchStore.getState().addComponent('resistor', { x: 300, y: 300 })
    const out = (await openLessonTool.execute({ lesson_id: 'ohms-law' }, {})) as {
      status: string
      already_open: boolean
    }
    expect(out.status).toBe('ok')
    expect(out.already_open).toBe(true)
    expect(useBenchStore.getState().components).toHaveLength(4) // 3 seeded + 1 added
  })
})

describe('focus_component', () => {
  it('drives the store look-here state: focusRequest, selection, log', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await focusComponentTool.execute({ id: 'r1' }, {})) as {
      status: string
      focused: string
    }
    expect(out.status).toBe('ok')
    expect(out.focused).toBe('r1')

    const s = useBenchStore.getState()
    expect(s.focusRequest).toEqual({ id: 'r1', seq: 1 })
    expect(s.selectedId).toBe('r1')
    const last = s.log.at(-1)!
    expect(last.actor).toBe('Agent')
    expect(last.text).toContain('r1')
  })

  it('bumps seq on repeated focus so the canvas re-pans', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    await focusComponentTool.execute({ id: 'r1' }, {})
    await focusComponentTool.execute({ id: 'r1' }, {})
    expect(useBenchStore.getState().focusRequest).toEqual({ id: 'r1', seq: 2 })
  })

  it('errors on an unknown id without touching focus state', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await focusComponentTool.execute({ id: 'zz9' }, {})) as {
      status: string
      message: string
      on_bench: string[]
    }
    expect(out.status).toBe('error')
    expect(out.message).toContain('zz9')
    expect(out.on_bench).toContain('bat1')
    expect(useBenchStore.getState().focusRequest).toBeNull()
  })

  it('pulse-highlights the focused node on the canvas', () => {
    useBenchStore.getState().openLesson('ohms-law')
    render(createElement(Workbench))
    expect(document.querySelector('.comp-node.focus-pulse')).toBeNull()
    act(() => useBenchStore.getState().requestFocus('r1'))
    expect(document.querySelector('.comp-node.focus-pulse')).not.toBeNull()
  })
})

describe('abort handling', () => {
  it('navigation tools respect a pre-aborted signal', async () => {
    const ac = new AbortController()
    ac.abort()
    for (const tool of [openLessonTool, focusComponentTool]) {
      const out = await tool.execute({}, { signal: ac.signal })
      expect(out).toEqual({ status: 'aborted' })
    }
    // Nothing happened: still on the fresh bench.
    expect(useBenchStore.getState().currentLessonId).toBe('free-build')
    expect(useBenchStore.getState().focusRequest).toBeNull()
  })
})
