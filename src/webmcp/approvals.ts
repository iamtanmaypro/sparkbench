// The approval-flow half of the inventory: write tools, the auto-executing
// add_note, and the get_proposal_status read that lets an agent await the
// human's decision.
//
// Nothing here mutates the bench directly. A write tool validates its args,
// then queues a proposal in the store — the same queue the on-canvas
// ApprovalCard renders — and returns {status:"pending_approval", proposal_id,
// summary}. Only the human's Approve click applies the mutation, through the
// exact store actions a human canvas click would call (applyProposal ->
// addComponent/connectTerminals/...). There is no parallel mutation path.
//
// Escalation (A12): a write arriving while the bench is faulted or unsolvable
// returns {status:"needs_human", context, suggestion} instead of proposing on
// top of a broken circuit. Reads keep reporting fault data so the agent can
// ground itself; writes refuse to act until a human fixes the fault.

import type { ToolDefinition, ModelContextToolCallOptions } from './model-context'
import { useBenchStore } from '../store/useBenchStore'
import type { ProposalAction } from '../store/useBenchStore'
import type { ComponentType, Terminal } from '../engine/netlist'
import { getLesson } from '../lessons'
import { aborted, ABORTED } from './output'
import {
  placeComponentParams,
  connectParams,
  setPropertyParams,
  removeComponentParams,
  addNoteParams,
  getProposalStatusParams,
} from './schemas'

/** Longest sticky-note text add_note will store; read_notes caps display separately. */
const ADD_NOTE_MAX = 400

/** Grigorik escalation shape: what is wrong + what to do about it. */
export interface NeedsHuman {
  status: 'needs_human'
  context: string
  suggestion: string
}

/**
 * The escalation for the current bench, or null when writes may proceed.
 * A fault's own context/suggestion strings already name the faulty element.
 *
 * Escalates on genuine faults: short circuit, LED burnout, blown fuse, an
 * open circuit caused by a dead part, and unsolvable (contradictory) wiring.
 * Does NOT escalate normal build states the engine also reports as
 * open_circuit: an unfinished loop mid-build or a simply-open switch —
 * blocking writes there would freeze the agent the moment a battery sits
 * unwired. An empty bench is likewise writable: building from scratch must
 * stay possible.
 */
export function needsHumanEscalation(): NeedsHuman | null {
  const s = useBenchStore.getState()
  for (const fault of s.faults) {
    if (fault.kind !== 'open_circuit') {
      return { status: 'needs_human', context: fault.context, suggestion: fault.suggestion }
    }
    // open_circuit: escalate only when the named part is actually dead.
    const culprit = s.components.find((c) => c.id === fault.element)
    if (culprit && (culprit.burnedOut || culprit.blown)) {
      return { status: 'needs_human', context: fault.context, suggestion: fault.suggestion }
    }
  }
  if (!s.solution.ok && s.components.length > 0) {
    return {
      status: 'needs_human',
      context: 'The bench cannot be solved as wired: the wiring contradicts itself.',
      suggestion:
        'Walk the loop from each battery terminal with the student and remove wires that should not be there, then re-measure.',
    }
  }
  return null
}

/** Turn a validated action into a queued proposal + the pending_approval shape. */
function queue(action: ProposalAction, summary: string) {
  const p = useBenchStore.getState().propose(action, summary)
  return { status: 'pending_approval', proposal_id: p.id, summary: p.summary }
}

const WRITE_ANNOTATIONS = {
  // Writes mutate circuit data, but only after the human approves the card.
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
} as const

export const placeComponentTool: ToolDefinition = {
  name: 'place_component',
  description:
    'Add a new component to the bench, like the student dragging one from the parts palette. The student must approve before it appears. Call describe_workbench first, place with this, then wire the part with connect.',
  annotations: WRITE_ANNOTATIONS,
  inputSchema: placeComponentParams,
  execute(args: Record<string, unknown>, context) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const type = args.type
    if (typeof type !== 'string') {
      return { status: 'error', message: 'Pass the component type to place.' }
    }
    const allowed = getLesson(s.currentLessonId)?.allowedComponents ?? []
    if (!allowed.includes(type as ComponentType)) {
      return {
        status: 'error',
        message: `"${type}" is not placeable in this lesson.`,
        allowed_types: allowed,
      }
    }
    const escalation = needsHumanEscalation()
    if (escalation) return escalation
    const props = (args.properties ?? {}) as { value?: unknown }
    const value = typeof props.value === 'number' && props.value > 0 ? props.value : undefined
    const x = typeof args.x === 'number' ? args.x : undefined
    const y = typeof args.y === 'number' ? args.y : undefined
    return queue(
      {
        kind: 'place_component',
        type: type as ComponentType,
        ...(x !== undefined || y !== undefined ? { x, y } : {}),
        ...(value !== undefined ? { value } : {}),
      },
      `place ${type}${value !== undefined ? ` (${value})` : ''} on the bench`,
    )
  },
}

/** Validate one "<component>:a|b" terminal arg against the current bench. */
function terminalError(
  s: ReturnType<typeof useBenchStore.getState>,
  raw: unknown,
  label: string,
): { status: 'error'; message: string; on_bench?: string[] } | null {
  if (typeof raw !== 'string' || !raw.includes(':')) {
    return { status: 'error', message: `${label} must look like "<component>:a" or "<component>:b".` }
  }
  const id = raw.slice(0, raw.lastIndexOf(':'))
  const post = raw.slice(raw.lastIndexOf(':') + 1)
  if (!s.components.some((c) => c.id === id) || (post !== 'a' && post !== 'b')) {
    return {
      status: 'error',
      message: `${label} "${raw}" is not a terminal on the bench.`,
      on_bench: s.components.slice(0, 12).map((c) => c.id),
    }
  }
  return null
}

export const connectTool: ToolDefinition = {
  name: 'connect',
  description:
    'Wire two component terminals together, like dragging a wire between them on the canvas. Terminal ids look like bat1:a or r2:b. The student must approve before the wire appears; the bench re-solves right after.',
  annotations: WRITE_ANNOTATIONS,
  inputSchema: connectParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const err =
      terminalError(s, args.from_terminal, 'from_terminal') ??
      terminalError(s, args.to_terminal, 'to_terminal')
    if (err) return err
    const from = args.from_terminal as Terminal
    const to = args.to_terminal as Terminal
    if (from === to) {
      return { status: 'error', message: 'Both ends are the same terminal.' }
    }
    if (s.wires.some((w) => (w.from === from && w.to === to) || (w.from === to && w.to === from))) {
      return { status: 'error', message: `${from} and ${to} are already wired together.` }
    }
    const escalation = needsHumanEscalation()
    if (escalation) return escalation
    return queue({ kind: 'connect', from, to }, `connect ${from} to ${to}`)
  },
}

export const setPropertyTool: ToolDefinition = {
  name: 'set_property',
  description:
    "Change one property of a component already on the bench: its value (resistance in ohms, battery voltage, fuse rating) or a switch's open/closed state. The student must approve before the change is applied.",
  annotations: WRITE_ANNOTATIONS,
  inputSchema: setPropertyParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const id = typeof args.id === 'string' ? args.id : ''
    const comp = s.components.find((c) => c.id === id)
    if (!comp) {
      return {
        status: 'error',
        message: `No component "${id}" is on the bench.`,
        on_bench: s.components.slice(0, 12).map((c) => c.id),
      }
    }
    const property = args.property === undefined ? 'value' : args.property
    if (property !== 'value' && property !== 'closed') {
      return { status: 'error', message: `Unknown property "${String(property)}"; use value or closed.` }
    }
    if (property === 'closed') {
      if (comp.type !== 'switch') {
        return { status: 'error', message: `${id} is a ${comp.type}; only switches have a closed state.` }
      }
      if (typeof args.value !== 'boolean') {
        return { status: 'error', message: 'closed takes true (closed) or false (open).' }
      }
    } else if (typeof args.value !== 'number' || !Number.isFinite(args.value)) {
      return { status: 'error', message: 'value takes a number (ohms, volts, or amps).' }
    }
    const escalation = needsHumanEscalation()
    if (escalation) return escalation
    return queue(
      { kind: 'set_property', id, property, value: args.value as number | boolean },
      `set ${id} ${property} to ${String(args.value)}`,
    )
  },
}

export const removeComponentTool: ToolDefinition = {
  name: 'remove_component',
  description:
    'Remove a component and any wires attached to it. Use to clean up mistakes or strip the bench back before rebuilding. The student must approve before the part disappears.',
  annotations: {
    ...WRITE_ANNOTATIONS,
    // Honest hint: removal cannot be undone by the agent.
    destructiveHint: true,
  },
  inputSchema: removeComponentParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    const id = typeof args.id === 'string' ? args.id : ''
    if (!s.components.some((c) => c.id === id)) {
      return {
        status: 'error',
        message: `No component "${id}" is on the bench.`,
        on_bench: s.components.slice(0, 12).map((c) => c.id),
      }
    }
    const escalation = needsHumanEscalation()
    if (escalation) return escalation
    return queue({ kind: 'remove_component', id }, `remove ${id}`)
  },
}

export const addNoteTool: ToolDefinition = {
  name: 'add_note',
  description:
    'Pin a short sticky note to the bench, signed as the agent, to explain what you found or did. Applies immediately without approval because notes change nothing on the circuit. Keep notes brief and genuinely useful.',
  annotations: WRITE_ANNOTATIONS,
  inputSchema: addNoteParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const text = typeof args.text === 'string' ? args.text.trim() : ''
    if (!text) {
      return { status: 'error', message: 'Pass the note text to pin.' }
    }
    const clipped = text.length > ADD_NOTE_MAX ? `${text.slice(0, ADD_NOTE_MAX - 1)}…` : text
    const s = useBenchStore.getState()
    const x = typeof args.x === 'number' ? args.x : 40 + Math.random() * 120
    const y = typeof args.y === 'number' ? args.y : 40 + Math.random() * 80
    // Auto-executes by design: non-destructive, and always signed "Agent"
    // (the author arg is not part of the schema and cannot be overridden).
    const noteId = s.addNote(clipped, x, y, 'Agent')
    s.logEvent('Agent', 'left a sticky note on the bench')
    return {
      status: 'ok',
      note_id: noteId,
      author: 'Agent',
      note: 'Applied immediately; notes never change the circuit.',
    }
  },
}

export const getProposalStatusTool: ToolDefinition = {
  name: 'get_proposal_status',
  description:
    'Check the outcome of a proposal you made with a write tool: approved, rejected, or pending_approval. Call it after any write returns pending_approval so you never assume the change happened.',
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: getProposalStatusParams,
  execute(args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const id = typeof args.proposal_id === 'string' ? args.proposal_id : ''
    const s = useBenchStore.getState()
    const p = s.proposals.find((x) => x.id === id)
    if (!p) {
      return { status: 'error', message: `No proposal "${id}". Use the proposal_id a write tool returned.` }
    }
    const note =
      p.status === 'approved'
        ? 'Approved and applied to the bench. Re-run read_measurements to see the effect.'
        : p.status === 'rejected'
          ? 'The student declined this one. Propose a different approach or ask what they prefer.'
          : 'Still awaiting the student. Point them at the approval card on the canvas.'
    return {
      proposal_id: p.id,
      status: p.status,
      summary: p.summary,
      pending_proposals: s.proposals.filter((x) => x.status === 'pending_approval').length,
      note,
    }
  },
}

/**
 * Writes + the proposal-status read, appended to benchTools by register.ts so
 * budgets.test.ts lints them automatically. Dynamic per-lesson subsets
 * (provideContext/toolchange) filter this array; see openLessonTool.execute.
 */
export const writeTools: ToolDefinition[] = [
  placeComponentTool,
  connectTool,
  setPropertyTool,
  removeComponentTool,
  addNoteTool,
  getProposalStatusTool,
]
