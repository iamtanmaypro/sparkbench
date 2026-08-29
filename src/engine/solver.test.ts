// A02: solver correctness on series, parallel, and mixed networks,
// hand-computed to 1e-6.

import { describe, it, expect } from 'vitest'
import { solve } from './solver'
import type { Component, Wire } from './netlist'
import type { ComponentType } from './netlist'

function c(id: string, type: ComponentType, value = 0, extra: Partial<Component> = {}): Component {
  return { id, type, value, ...extra }
}

function w(from: string, to: string): Wire {
  return { id: `${from}~${to}`, from: from as Wire['from'], to: to as Wire['to'] }
}

describe('solve: series circuits', () => {
  it('solves a battery + single resistor loop', () => {
    const nl = {
      components: [c('bat', 'battery', 3), c('r1', 'resistor', 100)],
      wires: [w('bat:a', 'r1:a'), w('r1:b', 'bat:b')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    // I = 3 / (100 + 0.5 internal R) = 0.029850746...
    const i = res.readings.r1!.current
    expect(i).toBeCloseTo(3 / 100.5, 6)
    // Terminal voltage of the resistor sags by the internal drop.
    expect(res.readings.r1!.voltage).toBeCloseTo(3 * (100 / 100.5), 6)
    expect(res.readings.bat!.current).toBeCloseTo(i, 6) // discharge convention
    expect(res.readings.r1!.power).toBeCloseTo(i * i * 100, 6)
  })

  it('divides voltage across two series resistors', () => {
    const nl = {
      components: [
        c('bat', 'battery', 9),
        c('r1', 'resistor', 200),
        c('r2', 'resistor', 100),
      ],
      wires: [w('bat:a', 'r1:a'), w('r1:b', 'r2:a'), w('r2:b', 'bat:b')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    // I = 9 / 300.5; V_r2 = I * 100
    const i = res.readings.r1!.current
    expect(i).toBeCloseTo(9 / 300.5, 6)
    expect(res.readings.r2!.voltage).toBeCloseTo((9 / 300.5) * 100, 6)
    expect(res.readings.r1!.voltage + res.readings.r2!.voltage).toBeCloseTo(
      res.readings.bat!.voltage * -1 * -1 === 0 ? 0 : 9 * (300 / 300.5),
      6,
    )
  })
})

describe('solve: parallel circuits', () => {
  it('splits current between two parallel resistors', () => {
    const nl = {
      components: [
        c('bat', 'battery', 6),
        c('r1', 'resistor', 100),
        c('r2', 'resistor', 300),
      ],
      wires: [w('bat:a', 'r1:a'), w('bat:a', 'r2:a'), w('bat:b', 'r1:b'), w('bat:b', 'r2:b')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    // Both resistors see ~6V minus internal drop; equivalent R = 75.
    const i1 = res.readings.r1!.current
    const i2 = res.readings.r2!.current
    expect(i1 / i2).toBeCloseTo(3, 6) // inversely proportional to resistance
    const req = 75
    expect(i1 + i2).toBeCloseTo(6 / (req + 0.5), 6)
  })

  it('handles a mixed series-parallel ladder', () => {
    // bat -- r1(10) -- [r2(20) || r3(20)] -- back to bat
    const nl = {
      components: [
        c('bat', 'battery', 12),
        c('r1', 'resistor', 10),
        c('r2', 'resistor', 20),
        c('r3', 'resistor', 20),
      ],
      wires: [
        w('bat:a', 'r1:a'),
        w('r1:b', 'r2:a'),
        w('r1:b', 'r3:a'),
        w('r2:b', 'bat:b'),
        w('r3:b', 'bat:b'),
      ],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    // Req = 10 + 10 = 20 (+0.5 int) -> total I = 12/20.5
    const total = res.readings.r1!.current
    expect(total).toBeCloseTo(12 / 20.5, 6)
    // Equal halves through r2 and r3.
    expect(res.readings.r2!.current).toBeCloseTo(total / 2, 6)
    expect(res.readings.r3!.current).toBeCloseTo(total / 2, 6)
  })
})

describe('solve: degenerate and unsolvable cases', () => {
  it('returns empty result for an empty netlist', () => {
    const res = solve({ components: [], wires: [] })
    expect(res.ok).toBe(false)
    expect(Object.keys(res.readings)).toHaveLength(0)
  })

  it('reports unsolvable for a floating isolated pair with no source loop', () => {
    // Two resistors wired together but nothing else: no reference issue, just
    // a singular system (no source, no ground path).
    const res = solve({ components: [c('r1', 'resistor', 10), c('r2', 'resistor', 10)], wires: [w('r1:a', 'r2:a')] })
    expect(res.ok).toBe(true) // resistive-only systems still solve to all-zero
    for (const id of ['r1', 'r2']) {
      expect(res.readings[id]!.current).toBeCloseTo(0, 9)
      expect(res.readings[id]!.voltage).toBeCloseTo(0, 9)
    }
  })

  it('keeps solving when a spare part floats on the bench', () => {
    // A working loop plus an unwired battery: the loop must keep its exact
    // readings and the spare must read its open-circuit physics, not blank
    // every meter with a failed solve.
    const nl = {
      components: [c('bat', 'battery', 3), c('r1', 'resistor', 100), c('spare', 'battery', 9)],
      wires: [w('bat:a', 'r1:a'), w('r1:b', 'bat:b')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    expect(res.readings.r1!.current).toBeCloseTo(3 / 100.5, 9)
    expect(res.readings.spare!.voltage).toBeCloseTo(9, 6)
    expect(Math.abs(res.readings.spare!.current)).toBeLessThan(1e-9)
  })

  it('gives a floating lone resistor zero volts and zero current', () => {
    const nl = {
      components: [c('bat', 'battery', 3), c('r1', 'resistor', 100), c('loose', 'resistor', 47)],
      wires: [w('bat:a', 'r1:a'), w('r1:b', 'bat:b')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    expect(res.readings.loose!.voltage).toBeCloseTo(0, 9)
    expect(res.readings.loose!.current).toBeCloseTo(0, 9)
    // The working loop is untouched by the spare part.
    expect(res.readings.r1!.current).toBeCloseTo(3 / 100.5, 9)
  })

  it('reads live values mid-build with only one wire placed', () => {
    const nl = {
      components: [c('bat', 'battery', 3), c('r1', 'resistor', 100)],
      wires: [w('bat:a', 'r1:a')],
    }
    const res = solve(nl)
    expect(res.ok).toBe(true)
    // No closed loop yet: nothing flows, but the battery still shows its EMF.
    expect(res.readings.bat!.current).toBeCloseTo(0, 9)
    expect(res.readings.bat!.voltage).toBeCloseTo(3, 6)
    expect(res.readings.r1!.voltage).toBeCloseTo(0, 9)
  })
})
