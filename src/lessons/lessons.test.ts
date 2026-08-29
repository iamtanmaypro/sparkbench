import { beforeEach, describe, expect, it } from 'vitest'
import { lessons, getLesson, FREE_BUILD_LESSON_ID } from './index'
import { validateLesson } from './schema'
import type { Predicate } from './schema'
import { solve } from '../engine/solver'
import { detectFaults } from '../engine/faults'
import { evaluatePredicate } from './predicates'
import { useBenchStore } from '../store/useBenchStore'
import type { Terminal } from '../engine/netlist'

// A06: all 5 lessons load from JSON with goal, initial netlist, allowed
// components, success predicate, hints; lesson 4 ships pre-broken circuits;
// progression works; free build unlocks the full toolset.

describe('lesson catalog', () => {
  it('ships exactly five lessons', () => {
    expect(lessons).toHaveLength(5)
    expect(lessons.map((l) => l.id)).toEqual([
      'ohms-law',
      'series-parallel',
      'switches-logic',
      'diagnose-fault',
      FREE_BUILD_LESSON_ID,
    ])
  })

  it.each(lessons.map((l) => [l.id, l] as const))('lesson %s conforms to the schema', (_id, lesson) => {
    expect(validateLesson(lesson)).toEqual([])
    expect(lesson.goal.length).toBeGreaterThan(10)
    expect(Array.isArray(lesson.hints)).toBe(true)
    expect(lesson.hints.length).toBeGreaterThan(0)
  })

  it('every initial netlist solves without throwing', () => {
    for (const l of lessons) {
      const netlist = {
        components: l.initialNetlist.components.map((c) => ({
          id: c.id,
          type: c.type,
          value: c.value ?? 0,
          ...(c.closed !== undefined ? { closed: c.closed } : {}),
          ...(c.burnedOut !== undefined ? { burnedOut: c.burnedOut } : {}),
        })),
        wires: l.initialNetlist.wires.map((w, i) => ({ id: `lw${i}`, from: w.from, to: w.to })),
      }
      expect(() => solve(netlist)).not.toThrow()
    }
  })

  it('lesson 4 ships a pre-broken circuit (burned LED)', () => {
    const l4 = getLesson('diagnose-fault')!
    const broken = l4.initialNetlist.components.filter((c) => c.burnedOut || c.blown)
    expect(broken.length).toBeGreaterThan(0)
    // And its success predicate is currently failing on that state.
    const netlist = {
      components: l4.initialNetlist.components.map((c) => ({
        id: c.id,
        type: c.type,
        value: c.value ?? 0,
        closed: c.closed,
        burnedOut: c.burnedOut,
      })),
      wires: l4.initialNetlist.wires.map((w, i) => ({ id: `lw${i}`, from: w.from, to: w.to })),
    }
    const solution = solve(netlist)
    const result = evaluatePredicate(l4.successPredicate, {
      components: netlist.components,
      solution,
      faults: detectFaults(netlist, solution),
    })
    expect(result.passed).toBe(false)
    expect(result.failures.join(' ')).toContain('led1')
  })

  it('free build starts empty and unlocks every component type', () => {
    const free = getLesson(FREE_BUILD_LESSON_ID)!
    expect(free.initialNetlist.components).toHaveLength(0)
    expect(free.allowedComponents).toEqual(
      expect.arrayContaining(['battery', 'resistor', 'led', 'bulb', 'switch', 'fuse', 'ammeter', 'voltmeter']),
    )
    // Guided lessons are gated harder.
    const guided = lessons.filter((l) => l.id !== FREE_BUILD_LESSON_ID)
    for (const l of guided) expect(l.allowedComponents.length).toBeLessThan(8)
  })
})

describe('predicate evaluation', () => {
  it('lesson 1 predicate fails initially and passes with a second series resistor added', () => {
    const l1 = getLesson('ohms-law')!
    const base = {
      components: l1.initialNetlist.components.map((c) => ({ id: c.id, type: c.type, value: c.value ?? 0 })),
      wires: l1.initialNetlist.wires.map((w, i) => ({ id: `lw${i}`, from: w.from, to: w.to })),
    }
    let sol = solve(base)
    const before = evaluate(l1.successPredicate, base.components, sol, detectFaults(base, sol))
    expect(before.passed).toBe(false)

    // Student adds r2 (100 ohm) in series: battery current drops under 25mA.
    const fixed = {
      components: [...base.components, { id: 'r2', type: 'resistor' as const, value: 100 }],
      wires: [...base.wires, { id: 'x1', from: 'r2:b' as const, to: 'bat1:a' as const }],
    }
    // Rewire so current flows bat -> r2 -> r1 -> bat (insert r2 between battery and r1).
    fixed.wires = [
      { id: 'a', from: 'bat1:a', to: 'r2:a' },
      { id: 'b', from: 'r2:b', to: 'r1:a' },
      ...base.wires.filter((w) => !(w.from === 'bat1:a' && w.to === 'r1:a')),
    ]
    sol = solve(fixed)
    const after = evaluate(l1.successPredicate, fixed.components, sol, detectFaults(fixed, sol))
    expect(sol.readings['bat1']!.current).toBeLessThanOrEqual(0.025)
    expect(after.passed).toBe(true)
  })

  it('lesson 1 predicate fails on an open circuit (0 current must not count as success)', () => {
    const l1 = getLesson('ohms-law')!
    // Two resistors on the bench but no wires: the count leaf passes while the
    // battery reads 0A. The predicate min (0.005A) must reject this state.
    const open = {
      components: [
        ...l1.initialNetlist.components.map((c) => ({ id: c.id, type: c.type, value: c.value ?? 0 })),
        { id: 'r2', type: 'resistor' as const, value: 100 },
      ],
      wires: [],
    }
    const sol = solve(open)
    const res = evaluate(l1.successPredicate, open.components, sol, detectFaults(open, sol))
    expect(res.passed).toBe(false)
  })

  it('lesson 3 AND-logic predicate needs both switches closed', () => {
    const l3 = getLesson('switches-logic')!
    const mk = (closed: boolean[]) => ({
      components: l3.initialNetlist.components.map((c, i) => ({
        id: c.id,
        type: c.type,
        value: c.value ?? 0,
        closed: c.type === 'switch' ? closed[i - 1] : undefined,
      })),
      wires: l3.initialNetlist.wires.map((w, i) => ({ id: `lw${i}`, from: w.from, to: w.to })),
    })
    // sw1 index 1, sw2 index 2 in components array.
    const both = mk([true, true])
    const solBoth = solve({ components: both.components as never[], wires: both.wires })
    const resBoth = evaluate(
      l3.successPredicate,
      both.components,
      solBoth,
      detectFaults({ components: both.components as never[], wires: both.wires }, solBoth),
    )
    expect(resBoth.passed).toBe(true)

    const oneOnly = mk([true, false])
    const solOne = solve({ components: oneOnly.components as never[], wires: oneOnly.wires })
    const resOne = evaluate(
      l3.successPredicate,
      oneOnly.components,
      solOne,
      detectFaults({ components: oneOnly.components as never[], wires: oneOnly.wires }, solOne),
    )
    expect(resOne.passed).toBe(false)
  })

  it('any-combinator passes when at least one branch holds', () => {
    const p: Predicate = {
      kind: 'any',
      of: [
        { kind: 'led_lit' },
        { kind: 'bulb_lit' },
      ],
    }
    const ctx = {
      components: [{ id: 'bulb1', type: 'bulb' as const }],
      solution: { ok: true, nodes: [], readings: { bulb1: { voltage: 3, current: 0.05, power: 0.15 } } },
      faults: [],
    }
    expect(evaluatePredicate(p, ctx).passed).toBe(true)
    const dark = {
      ...ctx,
      readingsPlaceholder: undefined,
      solution: { ok: true, nodes: [], readings: { bulb1: { voltage: 0, current: 0, power: 0 } } },
    }
    const res = evaluatePredicate(p, dark)
    expect(res.passed).toBe(false)
    expect(res.failures).toHaveLength(2)
  })
})

describe('fix paths survive component replacement (Gate 2 demo beats)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lesson 4: replacing the burned LED with a fresh one completes the goal', () => {
    // The lesson's own hint is "delete led1, place a fresh one": the goal must
    // track the LED by type, not by the dead part's id, or the lesson can
    // never pass. Driven through the store exactly as the demo will run it.
    useBenchStore.getState().openLesson('diagnose-fault')
    expect(useBenchStore.getState().predicate.passed).toBe(false)

    const s = useBenchStore.getState()
    s.removeComponent('led1')
    const fresh = useBenchStore.getState().addComponent('led', { x: 700, y: 220 })
    useBenchStore.getState().connectTerminals('r1:b' as Terminal, `${fresh}:a` as Terminal)
    useBenchStore.getState().connectTerminals(`${fresh}:b` as Terminal, 'bat1:b' as Terminal)

    const after = useBenchStore.getState()
    expect(after.predicate.failures).toEqual([])
    expect(after.predicate.passed).toBe(true)
  })

  it('lesson 2: the agent path (replace bulb2, rewire parallel) completes the goal', () => {
    // The agent cannot delete a single wire, so its parallel rewire removes
    // bulb2 (its wires go with it) and re-places a fresh bulb under a new id.
    // The goal must survive the replacement.
    useBenchStore.getState().openLesson('series-parallel')
    const s = useBenchStore.getState()
    s.toggleSwitch('sw1')
    // Seeded series state: both bulbs glow dim, but each drops only ~1.5V.
    expect(useBenchStore.getState().predicate.passed).toBe(false)

    s.removeComponent('bulb2')
    const s1 = useBenchStore.getState()
    const fresh = s1.addComponent('bulb', { x: 480, y: 330 })
    s1.connectTerminals('bulb1:b' as Terminal, 'bat1:b' as Terminal)
    s1.connectTerminals('sw1:b' as Terminal, `${fresh}:a` as Terminal)
    s1.connectTerminals(`${fresh}:b` as Terminal, 'bat1:b' as Terminal)

    const after = useBenchStore.getState()
    expect(after.predicate.failures).toEqual([])
    expect(after.predicate.passed).toBe(true)
  })
})

function evaluate(p: Predicate, components: unknown[], solution: ReturnType<typeof solve>, faults: ReturnType<typeof detectFaults>) {
  return evaluatePredicate(p, { components: components as never[], solution, faults })
}
