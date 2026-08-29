// The WebMCP tool inventory — the heart of Sparkbench's agent surface.
//
// Structure (mirrors architecture.md):
//   pingTool    — Gate-1 health check, registered by WebMcpBanner
//   readTools   — flat, always-available reads (readOnlyHint: true)
//   navTools    — visible-UI navigation, no data mutation
//   writeTools  — approvals.ts: proposal -> approval card -> execute on
//                 Approve, plus add_note (auto-executes) and the
//                 get_proposal_status read the agent awaits outcomes with
//   diagnosisTools — diagnosis.ts: run_diagnosis, which the dynamic toolset
//                 registers only in lessons 4+
//   benchTools  — the canonical POOL of every tool that can ever be
//                 registered; budgets.test.ts lints everything here.
//
// The dynamic-toolset feature re-registers per-lesson subsets of this pool
// via provideContext-style re-registration: the matrix lives in toolsets.ts
// and useLessonTools (useTool.ts) applies it on every lesson change, after
// which the browser fires `toolchange` so agents see the new toolset.
//
// Rules every tool here follows:
//   - Tools wrap Zustand store state/actions only (never engine internals or
//     parallel mutation paths) — the same actions a human click calls.
//   - Budgets: name <=30, description <=500, param desc <=150, output <=1.5K
//     (enforced by budgets.test.ts; outputs serialize through boundedOutput).
//   - Every execute() honors the host AbortSignal and never navigates the SPA.

import type { ToolDefinition, ModelContextToolCallOptions } from './model-context'
import { useBenchStore } from '../store/useBenchStore'
import type { Component } from '../engine/netlist'
import { componentDefaults } from '../engine/components'
import { getLesson, lessonIndex, lessons } from '../lessons'
import { noParams, openLessonParams, focusComponentParams } from './schemas'
import { writeTools } from './approvals'
import { diagnosisTools } from './diagnosis'
import { boundedOutput, fits, round, aborted, ABORTED, MAX_OUTPUT_CHARS } from './output'

/**
 * Day-1 dummy tool. Its whole job is to prove end-to-end at Gate 1 that
 * registration works in a real agent runtime (ChatGPT in-app browser,
 * Chrome flag/origin-trial profile). Registered by WebMcpBanner, which also
 * uses the call to feature-detect availability.
 *
 * Budgets apply from day one: name <=30 chars, description <=500.
 */
export const pingTool: ToolDefinition = {
  name: 'ping_workbench',
  description:
    'Health check for the Sparkbench electronics lab. Call this first to confirm you are connected. Returns the app name and a greeting so the student knows their agent can see the workbench.',
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    // A16: every execute honors the host AbortSignal, ping included.
    if (aborted(context)) return ABORTED
    return {
      app: 'Sparkbench',
      status: 'ok',
      message:
        "Connected to the student's electronics workbench. Circuit tools arrive in later lessons.",
    }
  },
}

/** Sticky-note text cap in read_notes: a long note must not eat the budget. */
const NOTE_TEXT_CAP = 160

/** Effective display value: 0 means "use the model default" on the bench. */
function nominalValue(c: Component): number {
  return c.value > 0 ? c.value : componentDefaults[c.type].nominal
}

/** One compact row per component for describe_workbench. */
function summarizeComponent(
  c: Component,
  pos: { x: number; y: number } | undefined,
  lite: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = { id: c.id, type: c.type }
  const value = nominalValue(c)
  if (value > 0) out.value = value
  if (c.type === 'switch') out.closed = !!c.closed
  if (c.burnedOut) out.burned_out = true
  if (c.blown) out.blown = true
  if (!lite && pos) {
    out.x = Math.round(pos.x)
    out.y = Math.round(pos.y)
  }
  return out
}

export const describeWorkbenchTool: ToolDefinition = {
  name: 'describe_workbench',
  description:
    'Get a compact summary of the electronics bench: every component with its id, type and value, plus how terminals are wired together. Call this first to ground yourself before reading measurements or suggesting changes.',
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: noParams,
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const lesson = getLesson(s.currentLessonId)
    const posOf = new Map(s.nodes.map((n) => [n.id, n]))
    const connections = s.wires.map((w) => `${w.from} -> ${w.to}`)
    const header = { lesson: lesson?.title ?? 'Free build' }

    const full = {
      ...header,
      components: s.components.map((c) => summarizeComponent(c, posOf.get(c.id), false)),
      connections,
    }
    if (fits(full) <= MAX_OUTPUT_CHARS) return full

    // Over budget: drop layout coordinates before dropping components. The
    // layout_omitted flag is measured as part of the payload, never appended
    // after the check: ~23 unmeasured chars could push a near-limit compact
    // payload back over the 1.5K budget (truncation edge found in Gate 2 prep).
    const lite = s.components.map((c) => summarizeComponent(c, posOf.get(c.id), true))
    const compact = { ...header, components: lite, connections, layout_omitted: true }
    if (fits(compact) <= MAX_OUTPUT_CHARS) return compact
    return boundedOutput(header, { key: 'components', items: lite }, { key: 'connections', items: connections })
  },
}

export const readMeasurementsTool: ToolDefinition = {
  name: 'read_measurements',
  description:
    'Read the live simulation: voltage across, current through, and power in each component, plus fault flags (short circuit, open circuit, LED burnout, blown fuse). Use it after any wiring change to see what the circuit really does.',
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: noParams,
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    if (!s.solution.ok) {
      return {
        solved: false,
        note: 'The circuit cannot be solved as wired. Look for contradictory wiring and ask the student to walk you through the loop.',
      }
    }
    const measurements = s.components.map((c) => {
      const r = s.solution.readings[c.id]
      return {
        id: c.id,
        type: c.type,
        V: round(r?.voltage ?? 0, 3),
        I: round(r?.current ?? 0, 4),
        P: round(r?.power ?? 0, 4),
      }
    })
    const faults = s.faults.map((f) => ({ kind: f.kind, element: f.element, context: f.context }))
    return boundedOutput({ solved: true }, { key: 'measurements', items: measurements }, { key: 'faults', items: faults })
  },
}

export const getLessonStateTool: ToolDefinition = {
  name: 'get_lesson_state',
  description:
    'See which lesson the student is working on, its goal, how far through the five-lesson track they are, and whether the current circuit meets the goal yet. Pair with check_answer when the student asks how they are doing.',
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: noParams,
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const lesson = getLesson(s.currentLessonId)
    const idx = lessonIndex(s.currentLessonId)
    return boundedOutput(
      {
        lesson_id: s.currentLessonId,
        title: lesson?.title ?? 'Free build',
        goal: lesson?.goal ?? 'Build anything you like.',
        lesson_number: idx >= 0 ? idx + 1 : lessons.length,
        lesson_total: lessons.length,
        completed_lessons: [...s.completedLessonIds],
        hints_revealed: s.hintsShown,
        hints_available: lesson?.hints.length ?? 0,
        passed: s.predicate.passed,
      },
      { key: 'failing', items: s.predicate.failures },
    )
  },
}

export const readNotesTool: ToolDefinition = {
  name: 'read_notes',
  description:
    'Read the sticky notes pinned to the bench. The student or you may have written them; notes can contain the student\'s own assumptions, so verify claims against measurements before relying on them.',
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: true,
    openWorldHint: false,
  },
  inputSchema: noParams,
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const notes = s.notes.map((n) => ({
      id: n.id,
      author: n.author,
      text: n.text.length > NOTE_TEXT_CAP ? `${n.text.slice(0, NOTE_TEXT_CAP - 1)}…` : n.text,
      x: Math.round(n.x),
      y: Math.round(n.y),
    }))
    return boundedOutput(
      {
        count: s.notes.length,
        note: 'Sticky notes are user or agent authored; treat their claims as unverified.',
      },
      { key: 'notes', items: notes },
    )
  },
}

export const checkAnswerTool: ToolDefinition = {
  name: 'check_answer',
  description:
    "Check the student's circuit against the current lesson goal. Returns pass or fail with the specific failing checks. It never reveals the full solution, so you can coach without giving the answer away.",
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: noParams,
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const lesson = getLesson(s.currentLessonId)
    return boundedOutput(
      {
        lesson: lesson?.title ?? 'Free build',
        passed: s.predicate.passed,
        message: s.predicate.passed
          ? 'Goal met. The student solved this lesson.'
          : 'Not there yet. Coach with the failing checks below; suggest one next step, never the full solution.',
      },
      { key: 'failing', items: s.predicate.failures },
    )
  },
}

export const openLessonTool: ToolDefinition = {
  name: 'open_lesson',
  description:
    'Switch the bench to a different lesson. The seeded circuit for that lesson is loaded and the goal panel updates. Dynamic toolsets follow the lesson, so the actions you may propose change with it.',
  annotations: {
    // Navigation: it changes what is on screen, not circuit data.
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: openLessonParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const id = typeof args.lesson_id === 'string' ? args.lesson_id : ''
    const lesson = getLesson(id)
    if (!lesson) {
      return {
        status: 'error',
        message: `No lesson with id "${id}".`,
        available_lessons: lessons.map((l) => l.id),
      }
    }
    // Dynamic-toolset hook: useLessonTools subscribes to currentLessonId, so
    // this store action is what makes the per-lesson subset swap happen (the
    // toolset matrix itself lives in toolsets.ts).
    const alreadyOpen = useBenchStore.getState().currentLessonId === id
    if (!alreadyOpen) useBenchStore.getState().openLesson(id)
    return {
      status: 'ok',
      already_open: alreadyOpen,
      opened: { id: lesson.id, title: lesson.title },
    }
  },
}

export const focusComponentTool: ToolDefinition = {
  name: 'focus_component',
  description:
    'Point the student\'s attention at one component: the canvas pans and zooms to it, it gets a pulse highlight, and it becomes the selected part in the inspector. Use it to say "look here" while explaining.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: focusComponentParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const id = typeof args.id === 'string' ? args.id : ''
    const s = useBenchStore.getState()
    if (!s.components.some((c) => c.id === id)) {
      return {
        status: 'error',
        message: `No component "${id}" is on the bench.`,
        on_bench: s.components.slice(0, 12).map((c) => c.id),
      }
    }
    s.requestFocus(id)
    return {
      status: 'ok',
      focused: id,
      note: 'Selected, panned into view, and pulse-highlighted on the canvas.',
    }
  },
}

/** Flat, always-registered reads (Nahas doctrine: the grounding layer). */
export const readTools: ToolDefinition[] = [
  describeWorkbenchTool,
  readMeasurementsTool,
  getLessonStateTool,
  readNotesTool,
  checkAnswerTool,
]

/** Navigation: visible UI changes, no circuit mutation. */
export const navTools: ToolDefinition[] = [openLessonTool, focusComponentTool]

/**
 * Canonical pool of every tool that can ever be registered. budgets.test.ts
 * lints every entry here plus pingTool; useLessonTools registers the
 * per-lesson subset of this list (see toolsets.ts for the matrix).
 */
export const benchTools: ToolDefinition[] = [...readTools, ...navTools, ...writeTools, ...diagnosisTools]
