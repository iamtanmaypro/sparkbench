// A03: fault detection flags short circuit, open circuit, LED burnout, and
// blown fuse with human-readable context + suggestion strings; healthy
// circuits produce zero faults.

import { describe, it, expect } from 'vitest'
import { analyze } from './faults'
import type { Component, Wire } from './netlist'
import type { ComponentType } from './netlist'

function c(id: string, type: ComponentType, value = 0, extra: Partial<Component> = {}): Component {
  return { id, type, value, ...extra }
}

function w(from: string, to: string): Wire {
  return { id: `${from}~${to}`, from: from as Wire['from'], to: to as Wire['to'] }
}

const healthyLoop = {
  components: [c('bat', 'battery', 3), c('r1', 'resistor', 100), c('led1', 'led')],
  wires: [w('bat:a', 'r1:a'), w('r1:b', 'led1:a'), w('led1:b', 'bat:b')],
}

describe('healthy circuits', () => {
  it('produces zero faults for a battery-resistor-LED loop', () => {
    const { faults } = analyze(healthyLoop)
    expect(faults).toHaveLength(0)
  })
})

describe('short circuit', () => {
  it('flags a wire straight across the battery', () => {
    const nl = {
      components: [c('bat', 'battery', 3)],
      wires: [w('bat:a', 'bat:b')],
    }
    const { faults } = analyze(nl)
    expect(faults).toHaveLength(1)
    const f = faults[0]!
    expect(f.kind).toBe('short_circuit')
    expect(f.element).toBe('bat')
    // Human-readable strings name the element and suggest a fix.
    expect(f.context).toContain('bat')
    expect(f.suggestion.toLowerCase()).toContain('wire')
  })

  it('flags a near-zero resistance path around the source', () => {
    const nl = {
      components: [c('bat', 'battery', 9), c('r1', 'resistor', 1)],
      wires: [w('bat:a', 'r1:a'), w('r1:b', 'bat:b')],
    }
    const { faults } = analyze(nl)
    expect(faults.some((f) => f.kind === 'short_circuit')).toBe(true)
  })
})

describe('open circuit', () => {
  it('names an open switch as the culprit', () => {
    const nl = {
      components: [c('bat', 'battery', 3), c('sw', 'switch'), c('r1', 'resistor', 100)],
      wires: [w('bat:a', 'sw:a'), w('sw:b', 'r1:a'), w('r1:b', 'bat:b')],
    }
    const { faults } = analyze(nl)
    expect(faults).toHaveLength(1)
    const f = faults[0]!
    expect(f.kind).toBe('open_circuit')
    expect(f.element).toBe('sw')
    expect(f.context).toContain('open')
    expect(f.suggestion).toContain('Close switch sw')
  })

  it('reports an incomplete loop with no obvious culprit switch', () => {
    const nl = {
      components: [c('bat', 'battery', 3), c('r1', 'resistor', 100)],
      wires: [w('bat:a', 'r1:a')], // r1:b never returns to bat:b
    }
    const { faults } = analyze(nl)
    expect(faults.some((f) => f.kind === 'open_circuit')).toBe(true)
  })

  it('blames a burned part, not an innocent closed switch', () => {
    // Lesson 4 shape: closed switch, live loop wiring, dead LED breaks it.
    const nl = {
      components: [c('bat', 'battery', 3), c('sw1', 'switch', 0, { closed: true }), c('r1', 'resistor', 150), c('led1', 'led', 0, { burnedOut: true })],
      wires: [w('bat:a', 'sw1:a'), w('sw1:b', 'r1:a'), w('r1:b', 'led1:a'), w('led1:b', 'bat:b')],
    }
    const { faults } = analyze(nl)
    const open = faults.find((f) => f.kind === 'open_circuit')!
    expect(open.element).toBe('led1')
    expect(open.context).toContain('burned out')
    expect(open.context).not.toContain('sw1 is open')
  })
})

describe('LED burnout warning', () => {
  it('warns when the LED runs past its current limit', () => {
    const nl = {
      components: [c('bat', 'battery', 12), c('r1', 'resistor', 10), c('led1', 'led')],
      wires: [w('bat:a', 'r1:a'), w('r1:b', 'led1:a'), w('led1:b', 'bat:b')],
    }
    const { solution, faults } = analyze(nl)
    expect(solution.readings.led1!.current * 1000).toBeGreaterThan(20)
    expect(faults.some((f) => f.kind === 'led_burnout')).toBe(true)
  })

  it('does not warn when a properly sized resistor limits current', () => {
    expect(analyze(healthyLoop).faults.filter((f) => f.kind === 'led_burnout')).toHaveLength(0)
  })
})

describe('blown fuse', () => {
  it('flags a fuse carrying more than twice its rating', () => {
    const nl = {
      components: [
        c('bat', 'battery', 12),
        c('f1', 'fuse', 0.5),
        c('r1', 'resistor', 2),
      ],
      wires: [w('bat:a', 'f1:a'), w('f1:b', 'r1:a'), w('r1:b', 'bat:b')],
    }
    const { faults } = analyze(nl)
    const fuseFault = faults.find((f) => f.kind === 'blown_fuse')
    expect(fuseFault).toBeDefined()
    expect(fuseFault!.element).toBe('f1')
    expect(fuseFault!.context).toContain('rated')
    expect(fuseFault!.suggestion).toContain('replace')
  })

  it('stays quiet for a healthy fuse', () => {
    const nl = {
      components: [c('bat', 'battery', 3), c('f1', 'fuse', 0.5), c('r1', 'resistor', 100)],
      wires: [w('bat:a', 'f1:a'), w('f1:b', 'r1:a'), w('r1:b', 'bat:b')],
    }
    expect(analyze(nl).faults.some((f) => f.kind === 'blown_fuse')).toBe(false)
  })
})
