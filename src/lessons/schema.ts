// Lesson JSON schema: every guided lesson is declarative data, so teachers
// could author more without touching app code. The store loads a lesson by
// seeding its initialNetlist, and evaluates successPredicate after every
// mutation (see predicates.ts).

import type { ComponentType, Terminal } from '../engine/netlist'

/** A pre-placed component in a lesson's starting bench, including layout. */
export interface LessonComponentSpec {
  id: string
  type: ComponentType
  /** Nominal value (V / ohm / A); omitted = model default. */
  value?: number
  closed?: boolean
  burnedOut?: boolean
  blown?: boolean
  x: number
  y: number
}

export interface LessonWireSpec {
  from: Terminal
  to: Terminal
}

/**
 * Success predicates form a small evaluatable tree. Leaves inspect the live
 * simulation (readings, faults); combinators glue leaves together. Kept as
 * plain JSON so lessons stay serializable and authorable.
 */
export type Predicate =
  | { kind: 'all' | 'any'; of: Predicate[] }
  | { kind: 'led_lit'; component?: string }
  | { kind: 'bulb_lit'; component?: string }
  | { kind: 'current_within'; component?: string; type?: ComponentType; min: number; max: number }
  | { kind: 'voltage_within'; component?: string; type?: ComponentType; min: number; max: number }
  | { kind: 'count_at_least'; type?: ComponentType; count: number }
  | { kind: 'switch_closed'; component: string }
  | { kind: 'no_faults' }

export interface Lesson {
  id: string
  title: string
  goal: string
  initialNetlist: {
    components: LessonComponentSpec[]
    wires: LessonWireSpec[]
  }
  allowedComponents: ComponentType[]
  successPredicate: Predicate
  /** Revealed one at a time; the student pulls, the app never dumps. */
  hints: string[]
}

const COMPONENT_TYPES: readonly ComponentType[] = [
  'battery',
  'resistor',
  'led',
  'bulb',
  'switch',
  'fuse',
  'ammeter',
  'voltmeter',
]

/** Runtime validation so a bad lesson JSON fails loudly at load/test time. */
export function validateLesson(lesson: unknown): string[] {
  const errs: string[] = []
  const l = lesson as Partial<Lesson>
  if (typeof l !== 'object' || l === null) return ['lesson is not an object']
  if (typeof l.id !== 'string' || l.id.length === 0) errs.push('id must be a non-empty string')
  if (typeof l.title !== 'string' || l.title.length === 0) errs.push('title must be a non-empty string')
  if (typeof l.goal !== 'string' || l.goal.length === 0) errs.push('goal must be a non-empty string')
  if (!l.initialNetlist || !Array.isArray(l.initialNetlist.components)) errs.push('initialNetlist.components missing')
  else {
    const ids = new Set<string>()
    for (const c of l.initialNetlist.components) {
      if (!COMPONENT_TYPES.includes(c.type)) errs.push(`component ${String(c.id)}: unknown type`)
      if (typeof c.id !== 'string' || c.id.length === 0) errs.push('component id missing')
      else if (ids.has(c.id)) errs.push(`duplicate component id ${c.id}`)
      else ids.add(c.id)
      if (typeof c.x !== 'number' || typeof c.y !== 'number') errs.push(`component ${String(c.id)}: x/y required`)
    }
    if (!Array.isArray(l.initialNetlist.wires)) errs.push('initialNetlist.wires missing')
    else {
      for (const w of l.initialNetlist.wires) {
        for (const t of [w.from, w.to]) {
          const compId = typeof t === 'string' ? t.slice(0, t.lastIndexOf(':')) : ''
          if (typeof t !== 'string' || !/:a$/.test(t) && !/:b$/.test(t)) errs.push(`bad terminal ${String(t)}`)
          else if (!ids.has(compId)) errs.push(`terminal ${t} references unknown component`)
        }
      }
    }
  }
  if (!Array.isArray(l.allowedComponents) || l.allowedComponents.length === 0)
    errs.push('allowedComponents must be a non-empty array')
  else for (const t of l.allowedComponents) if (!COMPONENT_TYPES.includes(t)) errs.push(`allowedComponents: unknown type ${String(t)}`)
  if (l.successPredicate) errs.push(...validatePredicate(l.successPredicate))
  else errs.push('successPredicate missing')
  if (!Array.isArray(l.hints) || l.hints.some((h) => typeof h !== 'string')) errs.push('hints must be an array of strings')
  return errs
}

export function validatePredicate(p: unknown, depth = 0): string[] {
  if (depth > 8) return ['predicate tree deeper than 8 levels']
  if (typeof p !== 'object' || p === null || typeof (p as Predicate).kind !== 'string')
    return ['predicate node missing "kind"']
  const pred = p as Predicate
  switch (pred.kind) {
    case 'all':
    case 'any':
      if (!Array.isArray(pred.of) || pred.of.length === 0) return [`${pred.kind}: "of" must be a non-empty array`]
      return pred.of.flatMap((child) => validatePredicate(child, depth + 1))
    case 'led_lit':
    case 'bulb_lit':
      return []
    case 'current_within':
    case 'voltage_within':
      if (!pred.component && !pred.type) return [`${pred.kind}: needs "component" or "type"`]
      if (typeof pred.min !== 'number' || typeof pred.max !== 'number') return [`${pred.kind}: min/max must be numbers`]
      return []
    case 'count_at_least':
      if (typeof pred.count !== 'number') return ['count_at_least: count must be a number']
      return []
    case 'switch_closed':
      return typeof pred.component === 'string' ? [] : ['switch_closed: component required']
    case 'no_faults':
      return []
    default:
      return [`unknown predicate kind ${String((pred as { kind: unknown }).kind)}`]
  }
}
