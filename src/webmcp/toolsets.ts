// Dynamic per-lesson toolsets — the provideContext/toolchange half of the
// inventory (A13).
//
// PLAN.md §4.2: "register the write/diagnosis tools per lesson stage via
// provideContext (free-build unlocks everything; lesson 1 exposes only
// resistors/battery)". The shipped Chrome API has no literal provideContext
// method, so the pattern is implemented by re-registering the per-lesson
// subset (registerTool/removeTool) on every lesson change; after each change
// the browser fires `toolchange` at the model context, which is how agents
// notice the toolset moved without a page reload. useLessonTools() in
// useTool.ts drives that re-registration; this module holds the declarative
// per-stage matrix so it can be linted and tested on its own.
//
// Stage matrix (tool-inventory.md "Dynamic toolset matrix"):
//   lesson 1      place_component (battery/resistor only), connect,
//                 set_property
//   lessons 2-3   + remove_component, the lesson's place palette, add_note
//   lessons 4+    + run_diagnosis
//   free build    everything
//
// Two tools are deliberately NOT stage-gated with the writes:
//   - get_proposal_status is support plumbing: it must be registered wherever
//     proposal-returning writes are, or the agent could propose in lesson 1
//     and then have no way to await the outcome.
//   - add_note never mutates the circuit (auto-executing, always signed
//     "Agent") and the guided-lesson demo needs it, so it appears from
//     lesson 2 on. Lesson 1 stays minimal per the matrix.

import type { ComponentType } from '../engine/netlist'
import { getLesson, lessonIndex, lessons } from '../lessons'

/** Lesson 1: agent-facing place palette, narrower than the human palette. */
const LESSON1_PLACE_TYPES: ComponentType[] = ['battery', 'resistor']

/** Every component type the bench knows (free-build parity). */
const ALL_COMPONENT_TYPES: ComponentType[] = [
  'battery',
  'resistor',
  'led',
  'bulb',
  'switch',
  'fuse',
  'ammeter',
  'voltmeter',
]

/** Writes every lesson exposes (place/connect/tune + the outcome read). */
const CORE_WRITE_TOOLS = ['place_component', 'connect', 'set_property', 'get_proposal_status'] as const

/**
 * Tools registered at every stage: the flat reads plus navigation. Only the
 * write surface moves between lessons (ping_workbench is the banner's own
 * registration and is deliberately not part of this list).
 */
const ALWAYS_REGISTERED = [
  'describe_workbench',
  'read_measurements',
  'get_lesson_state',
  'read_notes',
  'check_answer',
  'open_lesson',
  'focus_component',
] as const

/**
 * The progression stage of a lesson id. Unknown ids fall back to the minimal
 * stage: a corrupt lesson reference must never widen the agent's powers.
 */
export type LessonStage = 'guided-minimal' | 'guided' | 'diagnosis' | 'free'

export function lessonStage(lessonId: string): LessonStage {
  const idx = lessonIndex(lessonId)
  if (idx <= 0) return 'guided-minimal'
  if (idx >= lessons.length - 1) return 'free'
  if (idx >= 3) return 'diagnosis'
  return 'guided'
}

/**
 * Component types place_component accepts for the agent at this stage.
 * Lesson 1 keeps the agent to battery/resistor even though the human palette
 * (lesson1.json allowedComponents) also offers the meters — meters stay a
 * human-first tool until the later lessons open the full toolset.
 */
export function placeTypesForLesson(lessonId: string): ComponentType[] {
  if (lessonStage(lessonId) === 'guided-minimal') return LESSON1_PLACE_TYPES
  return getLesson(lessonId)?.allowedComponents ?? ALL_COMPONENT_TYPES
}

/** The write-tool names registered for this lesson stage. */
export function writeToolNamesForLesson(lessonId: string): string[] {
  const stage = lessonStage(lessonId)
  const names: string[] = [...CORE_WRITE_TOOLS]
  if (stage !== 'guided-minimal') {
    names.push('remove_component', 'add_note')
  }
  if (stage === 'diagnosis' || stage === 'free') {
    names.push('run_diagnosis')
  }
  return names
}

/**
 * The full toolset (reads + nav + this stage's writes) resolved against a
 * pool of known tool definitions. Throws on a name missing from the pool so
 * a matrix typo fails loudly in tests instead of silently shrinking the
 * agent's toolset at runtime.
 */
export function toolsetForLesson<T extends { name: string }>(lessonId: string, pool: readonly T[]): T[] {
  const byName = new Map(pool.map((t) => [t.name, t]))
  const picks: T[] = []
  for (const name of [...ALWAYS_REGISTERED, ...writeToolNamesForLesson(lessonId)]) {
    const tool = byName.get(name)
    if (!tool) throw new Error(`toolset matrix names "${name}" but it is not in the tool pool`)
    picks.push(tool)
  }
  return picks
}
