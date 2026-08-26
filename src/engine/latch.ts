// Latching component behaviors: LED burnout, bulb burnout, fuse blowing.
// These mutate the netlist's components in place (the store owns the netlist;
// the engine only flips latched flags) so a fault persists across re-solves
// until a human replaces the part.

import type { Component, Netlist } from './netlist'
import type { SolveResult } from './solver'
import { solve } from './solver'
import { componentDefaults } from './components'

export interface TripReport {
  tripped: string[]
}

/**
 * Runs one solve and latches any over-stress faults.
 * Returns the ids of components that tripped on THIS call (empty if none).
 */
export function applyLatches(netlist: Netlist, result?: SolveResult): TripReport {
  const res = result ?? solve(netlist)
  const tripped: string[] = []
  if (!res.ok) return { tripped }

  for (const c of netlist.components) {
    const r = res.readings[c.id]
    if (!r) continue

    if (c.type === 'led' && !c.burnedOut && Math.abs(r.current) > componentDefaults.led.maxCurrent * 2.5) {
      c.burnedOut = true
      tripped.push(c.id)
    }
    if (c.type === 'bulb' && !c.burnedOut && r.power > componentDefaults.bulb.burnoutPower * 4) {
      c.burnedOut = true
      tripped.push(c.id)
    }
    if (c.type === 'fuse' && !c.blown && Math.abs(r.current) > (c.value || 0.5) * componentDefaults.fuse.blowMultiplier) {
      c.blown = true
      tripped.push(c.id)
    }
  }
  return { tripped }
}

/** True when the component can still conduct after its latch state. */
export function isConducting(c: Component): boolean {
  if (c.type === 'switch') return !!c.closed
  if (c.type === 'fuse') return !c.blown
  if (c.type === 'led' || c.type === 'bulb') return !c.burnedOut
  return true
}
