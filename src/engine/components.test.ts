// A04: component models behave per spec: battery internal resistance,
// LED forward drop + burnout, bulb brightness from power, switch open/close,
// fuse blowing at rating, meters reading correctly without loading.

import { describe, it, expect } from 'vitest'
import { solve, type SolveResult } from './solver'
import { applyLatches, isConducting } from './latch'
import type { Component, Netlist } from './netlist'
import type { ComponentType } from './netlist'

function c(id: string, type: ComponentType, value = 0, extra: Partial<Component> = {}): Component {
  return { id, type, value, ...extra }
}

function w(from: string, to: string): Wire2 {
  return { id: `${from}~${to}`, from: from as Wire2['from'], to: to as Wire2['to'] }
}
type Wire2 = Netlist['wires'][number]

function loop(...comps: Component[]): Netlist {
  // Ring wiring that makes every element read positive current (a -> b):
  // battery a feeds the next a, middles chain b -> a, and the last b returns
  // to the battery's b.
  const wires: Wire2[] = []
  for (let i = 0; i < comps.length; i++) {
    const cur = comps[i]!
    const nxt = comps[(i + 1) % comps.length]!
    if (i === 0) wires.push(w(`${cur.id}:a`, `${nxt.id}:a`))
    else if (i < comps.length - 1) wires.push(w(`${cur.id}:b`, `${nxt.id}:a`))
    else wires.push(w(`${cur.id}:b`, `${comps[0]!.id}:b`))
  }
  return { components: comps, wires }
}

const read = (r: SolveResult, id: string) => r.readings[id]!

describe('battery internal resistance', () => {
  it('drops terminal voltage under load', () => {
    const res = solve(loop(c('bat', 'battery', 3), c('r1', 'resistor', 5)))
    expect(res.ok).toBe(true)
    // V_terminal = 3 * 5/5.5
    expect(read(res, 'bat').voltage).toBeCloseTo(3 * (5 / 5.5), 6)
    expect(read(res, 'r1').current).toBeCloseTo(3 / 5.5, 6)
  })

  it('reads full voltage with no load path (only voltmeter attached)', () => {
    const nl: Netlist = {
      components: [c('bat', 'battery', 3), c('v1', 'voltmeter')],
      wires: [w('bat:a', 'v1:a'), w('v1:b', 'bat:b')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    expect(read(res, 'bat').current).toBeCloseTo(0, 9)
    expect(Math.abs(read(res, 'v1').voltage)).toBeCloseTo(3, 6)
  })
})

describe('LED model', () => {
  it('conducts only above the forward drop', () => {
    // 3V battery minus resistor drop leaves enough for the 2V drop.
    const on = solve(loop(c('bat', 'battery', 3), c('r1', 'resistor', 100), c('led1', 'led')))
    expect(on.readings.led1!.current).toBeGreaterThan(0.001)

    // Below the drop: 1V source cannot forward-bias a 2V LED.
    const off = solve(loop(c('bat', 'battery', 1), c('led1', 'led')))
    expect(off.readings.led1!.current).toBeCloseTo(0, 6)
  })

  it('burns out past max current and then blocks current permanently', () => {
    const nl = loop(c('bat', 'battery', 12), c('r1', 'resistor', 10), c('led1', 'led'))
    const before = solve(nl)
    expect(before.readings.led1!.current).toBeGreaterThan(0.02)

    const { tripped } = applyLatches(nl, before)
    expect(tripped).toContain('led1')

    const after = solve(nl)
    expect(after.readings.led1!.current).toBeCloseTo(0, 9)
    expect(after.readings.r1!.current).toBeCloseTo(0, 9) // whole loop goes dark
    expect(isConducting(nl.components[2]!)).toBe(false)
  })
})

describe('bulb brightness tracks power', () => {
  it('dissipates more power at higher voltage and burns out past threshold', () => {
    const dim = solve(loop(c('bat', 'battery', 3), c('b1', 'bulb')))
    const bright = solve(loop(c('bat', 'battery', 12), c('b1', 'bulb')))
    expect(bright.readings.b1!.power).toBeGreaterThan(dim.readings.b1!.power)

    const nl = loop(c('bat', 'battery', 24), c('b1', 'bulb'))
    const hot = solve(nl)
    expect(hot.readings.b1!.power).toBeGreaterThan(4) // burnoutPower=1 x latch factor 4
    applyLatches(nl, hot)
    expect(solve(nl).readings.b1!.current).toBeCloseTo(0, 9)
  })
})

describe('switch', () => {
  it('blocks current when open, conducts when closed', () => {
    const mk = (closed: boolean): Netlist =>
      loop(
        c('bat', 'battery', 3),
        c('sw', 'switch', 0, { closed }),
        c('r1', 'resistor', 100),
      )
    const openRes = solve(mk(false))
    expect(openRes.readings.r1!.current).toBeCloseTo(0, 9)

    const closedRes = solve(mk(true))
    expect(closedRes.readings.r1!.current).toBeCloseTo(3 / 100.5, 6)
    expect(isConducting(mk(true).components[1]!)).toBe(true)
  })
})

describe('fuse', () => {
  it('blows at twice its rated current and opens the circuit', () => {
    const nl = loop(c('bat', 'battery', 12), c('f1', 'fuse', 0.5), c('r1', 'resistor', 2))
    const before = solve(nl)
    // 12 / 2.55 ~ 4.7A >> 1A blow point.
    expect(before.readings.f1!.current).toBeGreaterThan(1)
    const { tripped } = applyLatches(nl, before)
    expect(tripped).toContain('f1')
    expect(solve(nl).readings.r1!.current).toBeCloseTo(0, 9)
  })

  it('carries its rated current without blowing', () => {
    const nl = loop(c('bat', 'battery', 3), c('f1', 'fuse', 0.5), c('r1', 'resistor', 10))
    const res = solve(nl)
    expect(res.readings.f1!.current).toBeLessThan(1)
    expect(applyLatches(nl, res).tripped).toHaveLength(0)
  })
})

describe('meters do not load the circuit', () => {
  it('ammeter reads series current without changing it', () => {
    const plain = solve(loop(c('bat', 'battery', 3), c('r1', 'resistor', 100)))
    const metered = solve(
      loop(c('bat', 'battery', 3), c('a1', 'ammeter'), c('r1', 'resistor', 100)),
    )
    expect(metered.readings.a1!.current).toBeCloseTo(plain.readings.r1!.current, 6)
  })

  it('voltmeter reads full voltage while drawing no measurable current', () => {
    const nl: Netlist = {
      components: [
        c('bat', 'battery', 9),
        c('r1', 'resistor', 100),
        c('r2', 'resistor', 200),
        c('v1', 'voltmeter'),
      ],
      wires: [
        w('bat:a', 'r1:a'),
        w('r1:b', 'r2:a'),
        w('r2:b', 'bat:b'),
        w('r2:a', 'v1:a'), // voltmeter in parallel with r2
        w('v1:b', 'r2:b'),
      ],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    expect(Math.abs(read(res, 'v1').voltage)).toBeCloseTo(read(res, 'r2').voltage, 6)
    expect(read(res, 'v1').current).toBeCloseTo(0, 9)
    // Series current is unchanged by the parallel voltmeter.
    expect(read(res, 'r1').current).toBeCloseTo(9 / 300.5, 6)
  })
})
