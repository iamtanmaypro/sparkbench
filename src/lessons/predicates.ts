// Predicate evaluation against a live solve. Pure functions: the store calls
// these after every mutation, and the WebMCP check_answer tool will call the
// same exported evaluator (never the full solution, only pass/fail + failures).

import type { ComponentType } from '../engine/netlist'
import type { SolveResult } from '../engine/solver'
import type { Fault } from '../engine/faults'
import type { Predicate } from './schema'

export interface PredicateContext {
  components: { id: string; type: ComponentType; closed?: boolean; burnedOut?: boolean; blown?: boolean }[]
  solution: SolveResult
  faults: Fault[]
}

export interface PredicateResult {
  passed: boolean
  /** Human-readable description of each failing leaf (check_answer surface). */
  failures: string[]
}

function findComponent(ctx: PredicateContext, id?: string, type?: ComponentType) {
  if (id !== undefined) return ctx.components.find((c) => c.id === id)
  return ctx.components.find((c) => c.type === type)
}

/** True when the LED/bulb is actually emitting: intact and dissipating light. */
function isLit(ctx: PredicateContext, id: string): boolean {
  const c = ctx.components.find((x) => x.id === id)
  if (!c || c.burnedOut || c.blown) return false
  const r = ctx.solution.readings[id]
  return !!r && r.power > 1e-4
}

function evaluateLeaf(p: Predicate, ctx: PredicateContext): PredicateResult {
  switch (p.kind) {
    case 'led_lit':
    case 'bulb_lit': {
      const target =
        p.component ??
        (() => {
          const type: ComponentType = p.kind === 'led_lit' ? 'led' : 'bulb'
          const found = ctx.components.find((c) => c.type === type)
          return found?.id
        })()
      if (!target)
        return { passed: false, failures: [`no ${p.kind === 'led_lit' ? 'LED' : 'bulb'} on the bench yet`] }
      return isLit(ctx, target)
        ? { passed: true, failures: [] }
        : { passed: false, failures: [`${target} is not lit`] }
    }
    case 'current_within':
    case 'voltage_within': {
      const comp = findComponent(ctx, p.component, p.type)
      if (!comp)
        return { passed: false, failures: [`no ${p.type ?? p.component} to measure yet`] }
      const r = ctx.solution.readings[comp.id]
      if (!r) return { passed: false, failures: [`no reading for ${comp.id}`] }
      const quantity = p.kind === 'current_within' ? r.current : r.voltage
      const unit = p.kind === 'current_within' ? 'A' : 'V'
      const inRange = quantity >= p.min - 1e-9 && quantity <= p.max + 1e-9
      return inRange
        ? { passed: true, failures: [] }
        : {
            passed: false,
            failures: [
              `${comp.id} reads ${quantity.toFixed(3)}${unit}, expected between ${p.min}${unit} and ${p.max}${unit}`,
            ],
          }
    }
    case 'count_at_least': {
      const n = p.type ? ctx.components.filter((c) => c.type === p.type).length : ctx.components.length
      return n >= p.count
        ? { passed: true, failures: [] }
        : { passed: false, failures: [`need at least ${p.count} ${p.type ?? 'components'}, found ${n}`] }
    }
    case 'switch_closed': {
      const s = ctx.components.find((c) => c.id === p.component)
      if (!s) return { passed: false, failures: [`switch ${p.component} is not on the bench`] }
      return s.closed
        ? { passed: true, failures: [] }
        : { passed: false, failures: [`switch ${p.component} is still open`] }
    }
    case 'no_faults':
      return ctx.faults.length === 0
        ? { passed: true, failures: [] }
        : { passed: false, failures: ctx.faults.map((f) => f.context) }
    default:
      return { passed: false, failures: ['unknown predicate'] }
  }
}

export function evaluatePredicate(p: Predicate, ctx: PredicateContext): PredicateResult {
  if (p.kind === 'all' || p.kind === 'any') {
    const results = p.of.map((child) => evaluatePredicate(child, ctx))
    const allFailures = results.flatMap((r) => r.failures)
    if (p.kind === 'all') return { passed: results.every((r) => r.passed), failures: allFailures }
    // "any": report what each branch demanded so check_answer stays useful.
    return results.some((r) => r.passed) ? { passed: true, failures: [] } : { passed: false, failures: allFailures }
  }
  return evaluateLeaf(p, ctx)
}
