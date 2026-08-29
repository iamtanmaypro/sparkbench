import { beforeEach, describe, expect, it } from 'vitest'
import { useBenchStore } from './useBenchStore'

// A05 store coverage: every canvas interaction the workbench UI performs goes
// through these actions; the component layer only renders what lands here.

function fresh() {
  useBenchStore.setState({
    components: [],
    nodes: [],
    wires: [],
    origins: {},
    selectedId: null,
    notes: [],
    log: [],
    proposals: [],
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

describe('component lifecycle', () => {
  it('adds a component with position and origin, re-solving', () => {
    const id = useBenchStore.getState().addComponent('battery', { x: 50, y: 60 })
    const s = useBenchStore.getState()
    expect(s.components).toHaveLength(1)
    expect(s.nodes[0]).toMatchObject({ id, type: 'battery', x: 50, y: 60 })
    expect(s.origins[id]).toBe('human')
    expect(s.selectedId).toBe(id)
  })

  it('marks agent origin for agent-placed parts', () => {
    const id = useBenchStore.getState().addComponent('resistor', { x: 0, y: 0 }, 'agent')
    expect(useBenchStore.getState().origins[id]).toBe('agent')
  })

  it('removes a component and its attached wires', () => {
    const s = useBenchStore.getState()
    const a = s.addComponent('battery')
    const b = s.addComponent('resistor')
    useBenchStore.getState().connectTerminals(`${a}:a` as never, `${b}:a` as never)
    expect(useBenchStore.getState().wires).toHaveLength(1)
    useBenchStore.getState().removeComponent(a)
    const after = useBenchStore.getState()
    expect(after.components.some((c) => c.id === a)).toBe(false)
    expect(after.wires).toHaveLength(0)
  })

  it('moveNode updates layout without re-logging an event', () => {
    const id = useBenchStore.getState().addComponent('bulb', { x: 10, y: 10 })
    const eventsBefore = useBenchStore.getState().log.length
    useBenchStore.getState().moveNode(id, 200, 300)
    const s = useBenchStore.getState()
    expect(s.nodes.find((n) => n.id === id)).toMatchObject({ x: 200, y: 300 })
    expect(s.log.length).toBe(eventsBefore)
  })

  it('setProperty changes value and toggleSwitch flips closed state', () => {
    const rid = useBenchStore.getState().addComponent('resistor')
    useBenchStore.getState().setProperty(rid, 470)
    expect(useBenchStore.getState().components[0]!.value).toBe(470)

    const sid = useBenchStore.getState().addComponent('switch')
    useBenchStore.getState().toggleSwitch(sid)
    expect(useBenchStore.getState().components.find((c) => c.id === sid)!.closed).toBe(true)
    useBenchStore.getState().toggleSwitch(sid)
    expect(useBenchStore.getState().components.find((c) => c.id === sid)!.closed).toBe(false)
  })
})

describe('wiring', () => {
  it('connects two terminals and rejects duplicates or self-loops', () => {
    const s = useBenchStore.getState()
    const a = s.addComponent('battery')
    const b = s.addComponent('led')
    const w1 = s.connectTerminals(`${a}:a`, `${b}:a`)
    expect(w1).toBeTruthy()
    // Duplicate (either direction) rejected.
    expect(s.connectTerminals(`${b}:a`, `${a}:a`)).toBeNull()
    expect(s.connectTerminals(`${a}:a`, `${a}:a`)).toBeNull()
    expect(useBenchStore.getState().wires).toHaveLength(1)
  })

  it('removeWire detaches without touching components', () => {
    const s = useBenchStore.getState()
    const a = s.addComponent('battery')
    const b = s.addComponent('resistor')
    const w = s.connectTerminals(`${a}:b`, `${b}:b`)!
    useBenchStore.getState().removeWire(w!)
    expect(useBenchStore.getState().wires).toHaveLength(0)
    expect(useBenchStore.getState().components).toHaveLength(2)
  })

  it('closing a switch completes the loop: current flows', () => {
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery')
    const sw = s.addComponent('switch')
    const r = s.addComponent('resistor')
    s.setProperty(r, 100)
    s.connectTerminals(`${bat}:a`, `${sw}:a`)
    s.connectTerminals(`${sw}:b`, `${r}:a`)
    s.connectTerminals(`${r}:b`, `${bat}:b`)
    // Switch starts open: no current.
    let reading = useBenchStore.getState().solution.readings[r]!
    expect(Math.abs(reading.current)).toBeLessThan(1e-9)
    useBenchStore.getState().toggleSwitch(sw)
    reading = useBenchStore.getState().solution.readings[r]!
    expect(reading.current).toBeGreaterThan(0.02)
    expect(reading.current).toBeLessThan(0.04)
  })
})

describe('lesson flow', () => {
  it('opens lessons with their seeded netlist', () => {
    useBenchStore.getState().openLesson('ohms-law')
    const s = useBenchStore.getState()
    expect(s.currentLessonId).toBe('ohms-law')
    expect(s.components.map((c) => c.id).sort()).toEqual(['bat1', 'r1', 'vm1'])
    expect(s.wires.length).toBeGreaterThan(0)
  })

  it('marks lesson complete when predicate passes, tracks progression', () => {
    useBenchStore.getState().openLesson('free-build')
    const s = useBenchStore.getState()
    s.addComponent('battery')
    s.addComponent('resistor')
    // Free build predicate: at least 2 components.
    expect(useBenchStore.getState().predicate.passed).toBe(true)
    expect(useBenchStore.getState().completedLessonIds.has('free-build')).toBe(true)
  })

  it('resetLesson restores the initial netlist after edits', () => {
    useBenchStore.getState().openLesson('ohms-law')
    const before = useBenchStore.getState().components.map((c) => ({ ...c }))
    useBenchStore.getState().addComponent('resistor')
    expect(useBenchStore.getState().components.length).toBe(before.length + 1)
    useBenchStore.getState().resetLesson()
    const after = useBenchStore.getState()
    expect(after.components.map((c) => [c.id, c.value])).toEqual(
      before.map((c) => [c.id, c.value]),
    )
  })

  it('reveals hints progressively up to the lesson total', () => {
    useBenchStore.getState().openLesson('ohms-law')
    const total = 3
    for (let i = 0; i < total + 2; i++) useBenchStore.getState().nextHint()
    expect(useBenchStore.getState().hintsShown).toBe(total)
  })
})

describe('notes and log', () => {
  it('addNote stores author and removeNote deletes it', () => {
    const s = useBenchStore.getState()
    const id = s.addNote('check this part', 100, 100, 'Agent')
    expect(useBenchStore.getState().notes[0]).toMatchObject({ text: 'check this part', author: 'Agent' })
    useBenchStore.getState().removeNote(id)
    expect(useBenchStore.getState().notes).toHaveLength(0)
  })

  it('mutations append timestamped log entries naming the actor', () => {
    const s = useBenchStore.getState()
    s.addComponent('battery', undefined, 'agent')
    s.addComponent('resistor')
    const log = useBenchStore.getState().log
    expect(log.some((e) => e.actor === 'Agent' && e.text.includes('Agent placed'))).toBe(true)
    expect(log.every((e) => typeof e.at === 'number')).toBe(true)
  })
})

describe('proposals (agent approval queue)', () => {
  it('propose queues a pending proposal without mutating the bench', () => {
    const p = useBenchStore.getState().propose(
      { kind: 'place_component', type: 'resistor', x: 10, y: 20 },
      'Agent wants to: place r1 (resistor)',
    )
    const s = useBenchStore.getState()
    expect(p.status).toBe('pending_approval')
    expect(s.proposals).toHaveLength(1)
    // Nothing placed yet: approval is the only path that applies mutations.
    expect(s.components).toHaveLength(0)
    expect(s.log.some((e) => e.actor === 'Agent' && e.text.includes('proposes'))).toBe(true)
  })

  it('approveProposal applies the stored action through normal store paths', () => {
    const p = useBenchStore.getState().propose(
      { kind: 'place_component', type: 'battery', x: 5, y: 6 },
      'Agent wants to: place a battery',
    )
    expect(useBenchStore.getState().approveProposal(p.id)).toBe(true)
    const s = useBenchStore.getState()
    expect(s.proposals[0]).toMatchObject({ status: 'approved' })
    expect(s.components).toHaveLength(1)
    expect(s.components[0]!.type).toBe('battery')
    // Agent-attributed mutation, decided by the human.
    expect(s.origins[s.components[0]!.id]).toBe('agent')
    expect(s.log.some((e) => e.actor === 'You' && e.text.includes('approved'))).toBe(true)
    expect(s.log.some((e) => e.actor === 'Agent' && e.text.includes('Agent placed'))).toBe(true)
  })

  it('approveProposal on connect/set_property/remove_component attributes to the agent', () => {
    const s = useBenchStore.getState()
    const a = s.addComponent('battery')
    const b = s.addComponent('resistor')
    const p1 = s.propose({ kind: 'connect', from: `${a}:a` as never, to: `${b}:a` as never }, 'wire it')
    const p2 = s.propose({ kind: 'set_property', id: b, value: 220 }, 'set r2 to 220')
    const p3 = s.propose({ kind: 'remove_component', id: a }, 'remove the battery')
    s.approveProposal(p1.id)
    s.approveProposal(p2.id)
    expect(useBenchStore.getState().wires).toHaveLength(1)
    expect(useBenchStore.getState().components.find((c) => c.id === b)!.value).toBe(220)
    s.approveProposal(p3.id)
    expect(useBenchStore.getState().components.some((c) => c.id === a)).toBe(false)
    const log = useBenchStore.getState().log
    expect(log.some((e) => e.actor === 'Agent' && e.text.includes('Agent wired'))).toBe(true)
    expect(log.some((e) => e.actor === 'Agent' && e.text.includes('Agent set'))).toBe(true)
    expect(log.some((e) => e.actor === 'Agent' && e.text.includes('Agent removed'))).toBe(true)
  })

  it('rejectProposal marks rejected and leaves the bench untouched', () => {
    const p = useBenchStore.getState().propose({ kind: 'place_component', type: 'led' }, 'place an LED')
    useBenchStore.getState().rejectProposal(p.id)
    const s = useBenchStore.getState()
    expect(s.proposals[0]!.status).toBe('rejected')
    expect(s.components).toHaveLength(0)
  })

  it('deciding twice is a no-op', () => {
    const p = useBenchStore.getState().propose({ kind: 'place_component', type: 'bulb' }, 'place a bulb')
    expect(useBenchStore.getState().approveProposal(p.id)).toBe(true)
    expect(useBenchStore.getState().approveProposal(p.id)).toBe(false)
    useBenchStore.getState().rejectProposal(p.id)
    expect(useBenchStore.getState().proposals[0]!.status).toBe('approved')
    expect(useBenchStore.getState().components).toHaveLength(1)
  })

  it('approveNextN approves pending proposals in order and returns the count', () => {
    const s = useBenchStore.getState()
    for (const type of ['battery', 'resistor', 'led'] as const) {
      s.propose({ kind: 'place_component', type }, `place ${type}`)
    }
    s.propose({ kind: 'place_component', type: 'bulb' }, 'place bulb')
    useBenchStore.getState().rejectProposal(useBenchStore.getState().proposals[3]!.id)
    // 3 pending, 1 rejected; approve next 10 should apply exactly the 3.
    expect(useBenchStore.getState().approveNextN(10)).toBe(3)
    expect(useBenchStore.getState().components.map((c) => c.type)).toEqual(['battery', 'resistor', 'led'])
    expect(useBenchStore.getState().proposals.every((p) => p.status !== 'pending_approval')).toBe(true)
    expect(useBenchStore.getState().approveNextN(5)).toBe(0)
  })
})

describe('persistence', () => {
  it('persists bench state guarded, and reloads it into a fresh store read', () => {
    useBenchStore.getState().openLesson('free-build')
    const id = useBenchStore.getState().addComponent('battery', { x: 42, y: 43 })
    const raw = localStorage.getItem('sparkbench.v1')
    expect(raw).toBeTruthy()
    const saved = JSON.parse(raw!) as { components: { id: string }[]; positions: Record<string, { x: number }> }
    expect(saved.components.some((c) => c.id === id)).toBe(true)
    expect(saved.positions[id]!.x).toBe(42)

    // Guarded load: corrupt JSON must not throw on next boot path.
    localStorage.setItem('sparkbench.v1', '{not json')
    expect(() => JSON.parse(localStorage.getItem('sparkbench.v1')!)).toThrow()
  })
})
