// Fault detection: turns solver readings into the four teachable failure
// states (short circuit, open circuit, LED burnout, blown fuse). Every fault
// carries human-readable context and suggestion strings; these feed the WebMCP
// needs_human escalation shape directly.

import type { Netlist } from './netlist'
import type { SolveResult } from './solver'
import { solve } from './solver'
import { componentDefaults } from './components'

export type FaultKind = 'short_circuit' | 'open_circuit' | 'led_burnout' | 'blown_fuse'

export interface Fault {
  kind: FaultKind
  /** The specific component at the heart of the problem. */
  element: string
  context: string
  suggestion: string
}

/** Current above which a resistive path counts as a dead short. */
const SHORT_CURRENT_THRESHOLD = 5 // amps

export function detectFaults(netlist: Netlist, result?: SolveResult): Fault[] {
  const res = result ?? solve(netlist)
  if (!res.ok) return []
  const faults: Fault[] = []

  for (const c of netlist.components) {
    const r = res.readings[c.id]
    if (!r) continue

    if (c.type === 'battery' && !c.burnedOut && Math.abs(r.current) >= SHORT_CURRENT_THRESHOLD) {
      faults.push({
        kind: 'short_circuit',
        element: c.id,
        context: `Short circuit detected: ${c.id} (${c.type}) is sourcing ${fmtA(r.current)}, far above any safe load.`,
        suggestion: `Check for a wire running straight across ${c.id}'s terminals or a path with no resistance; remove it, then re-measure.`,
      })
      continue
    }

    if (c.type === 'led' && !c.burnedOut) {
      const ma = Math.abs(r.current) * 1000
      const limit = componentDefaults.led.maxCurrent * 1000
      if (ma > limit) {
        faults.push({
          kind: 'led_burnout',
          element: c.id,
          context: `${c.id} (led) is carrying ${ma.toFixed(1)}mA, past its ${limit}mA limit. It will burn out.`,
          suggestion: `Put a current-limiting resistor in series with ${c.id} (a few hundred ohms works), then re-measure.`,
        })
      }
      continue
    }

    if (c.type === 'fuse' && !c.blown) {
      const rated = c.value > 0 ? c.value : componentDefaults.fuse.nominal
      const limit = rated * componentDefaults.fuse.blowMultiplier
      if (Math.abs(r.current) > limit) {
        faults.push({
          kind: 'blown_fuse',
          element: c.id,
          context: `Fuse blown: ${c.id} was rated ${rated.toFixed(1)}A but saw ${fmtA(r.current)}A.`,
          suggestion: `Fix the overload downstream of ${c.id}, then replace it with a fresh fuse and re-measure.`,
        })
      }
    }
  }

  faults.push(...detectOpen(netlist, res))
  return faults
}

/**
 * Open-circuit heuristic for teaching circuits: a battery exists but no
 * current flows anywhere. Names the most likely culprit (open switch first).
 */
function detectOpen(netlist: Netlist, res: SolveResult): Fault[] {
  const hasBattery = netlist.components.some((c) => c.type === 'battery' && !c.burnedOut)
  if (!hasBattery || netlist.components.length === 0) return []

  const maxCurrent = Math.max(...Object.values(res.readings).map((r) => Math.abs(r.current)))
  if (maxCurrent >= 1e-9) return []

  // A bare battery with nothing else on the bench has no culprit to point at.
  const others = netlist.components.filter((c) => c.type !== 'battery')
  if (others.length === 0 && !netlist.components.some((c) => c.type === 'switch' && !c.closed)) return []

  // Name the actual break: a dead part first, then an open switch, then any
  // other part (neutral wording — never claim a closed switch is open).
  const dead = others.find((c) => c.burnedOut || c.blown)
  const openSwitch = netlist.components.find((c) => c.type === 'switch' && !c.closed)
  const culprit = dead ?? openSwitch ?? others[0]!
  if (!culprit) return []
  const label = `${culprit.id} (${culprit.type})`
  if (dead) {
    return [
      {
        kind: 'open_circuit',
        element: culprit.id,
        context: `Open circuit: ${culprit.id} (${culprit.type}) is ${culprit.blown ? 'blown' : 'burned out'}, so no current can flow around the loop.`,
        suggestion: `Replace ${culprit.id} with a fresh part, then re-measure.`,
      },
    ]
  }
  return [
    {
      kind: 'open_circuit',
      element: culprit.id,
      context:
        culprit.type === 'switch'
          ? `Open circuit: switch ${culprit.id} is open, so no current can flow around the loop.`
          : `Open circuit: no current flows anywhere; every terminal of the battery must be reachable through wires and closed switches.`,
      suggestion:
        culprit.type === 'switch'
          ? `Close switch ${culprit.id} to complete the loop, then re-measure.`
          : `Check the wiring around ${label}; make sure both battery terminals connect through to it.`,
    },
  ]
}

function fmtA(a: number): string {
  return `${(Math.abs(a)).toFixed(2)}A`
}

/** Convenience wrapper used by tools and UI: solve + detect in one call. */
export function analyze(netlist: Netlist): { solution: SolveResult; faults: Fault[] } {
  const solution = solve(netlist)
  return { solution, faults: detectFaults(netlist, solution) }
}
