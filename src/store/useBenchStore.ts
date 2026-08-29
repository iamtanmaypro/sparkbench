// The single source of truth. Every mutation (human click or future WebMCP
// tool) flows through these actions; the solver re-runs after each one so
// meter readouts, lesson predicates and fault flags are always live.

import { create } from 'zustand'
import type { Component, ComponentType, Netlist, Terminal } from '../engine/netlist'
import { solve } from '../engine/solver'
import type { SolveResult } from '../engine/solver'
import { detectFaults } from '../engine/faults'
import type { Fault } from '../engine/faults'
import { applyLatches } from '../engine/latch'
import type { Lesson } from '../lessons/schema'
import { evaluatePredicate } from '../lessons/predicates'
import type { PredicateResult } from '../lessons/predicates'
import { getLesson, lessonIndex, lessons } from '../lessons'

export interface BenchNode {
  id: string
  type: ComponentType
  x: number
  y: number
}

export interface Note {
  id: string
  text: string
  x: number
  y: number
  author: 'You' | 'Agent'
  createdAt: number
}

export interface LogEntry {
  id: number
  at: number
  actor: 'You' | 'Agent' | 'Bench'
  text: string
}

/** Who last touched a component; drives the "placed by Agent" badge. */
export type Origin = 'human' | 'agent'

/**
 * A mutation an agent wants to apply. Proposals are the store-level approval
 * queue: Phase 3 write tools create them instead of mutating directly, and a
 * human decision (Approve/Reject card) is the only path that applies them.
 * Keeping the queue here means tools and UI wrap the same actions.
 */
export type ProposalAction =
  | { kind: 'place_component'; type: ComponentType; x?: number; y?: number }
  | { kind: 'connect'; from: Terminal; to: Terminal }
  | { kind: 'set_property'; id: string; value: number }
  | { kind: 'remove_component'; id: string }

export interface Proposal {
  id: string
  action: ProposalAction
  /** Card text, e.g. "Agent wants to: connect bat1+ to r1". */
  summary: string
  status: 'pending_approval' | 'approved' | 'rejected'
  createdAt: number
  decidedAt?: number
}

interface PersistShape {
  components: Component[]
  positions: Record<string, { x: number; y: number }>
  wires: { id: string; from: Terminal; to: Terminal }[]
  notes: Omit<Note, 'createdAt'>[]
  currentLessonId: string
  completedLessonIds: string[]
}

const STORAGE_KEY = 'sparkbench.v1'

function loadPersisted(): PersistShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistShape>
    if (
      !Array.isArray(parsed.components) ||
      !Array.isArray(parsed.wires) ||
      typeof parsed.currentLessonId !== 'string'
    )
      return null
    return parsed as PersistShape
  } catch {
    // Corrupt or unavailable storage: start fresh rather than crash the app.
    return null
  }
}

function persist(state: BenchState): void {
  try {
    const shape: PersistShape = {
      components: state.components,
      positions: Object.fromEntries(state.nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
      wires: state.wires,
      notes: state.notes.map(({ createdAt: _createdAt, ...rest }) => rest),
      currentLessonId: state.currentLessonId,
      completedLessonIds: [...state.completedLessonIds],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shape))
  } catch {
    // Private mode / quota exceeded: persistence is best-effort by design.
  }
}

let logSeq = 1
let proposalSeq = 1

export interface BenchState {
  // --- circuit ---------------------------------------------------------------
  components: Component[]
  nodes: BenchNode[]
  wires: { id: string; from: Terminal; to: Terminal }[]
  origins: Record<string, Origin>
  selectedId: string | null
  solution: SolveResult
  faults: Fault[]

  // --- lesson ----------------------------------------------------------------
  currentLessonId: string
  completedLessonIds: Set<string>
  predicate: PredicateResult
  hintsShown: number

  // --- collaboration surface (Phase 3/4 tools write these too) ---------------
  notes: Note[]
  log: LogEntry[]
  agentActive: boolean
  proposals: Proposal[]
  /**
   * Latest "look here" request (WebMCP focus_component). seq increments per
   * request so repeated focus on the same component still re-triggers the
   * canvas pan/zoom. Ephemeral UI state; never persisted.
   */
  focusRequest: { id: string; seq: number } | null

  // --- actions (the ONLY mutation paths) -------------------------------------
  addComponent: (type: ComponentType, pos?: { x: number; y: number }, origin?: Origin) => string
  moveNode: (id: string, x: number, y: number) => void
  removeComponent: (id: string, origin?: Origin) => void
  connectTerminals: (from: Terminal, to: Terminal, origin?: Origin) => string | null
  removeWire: (id: string) => void
  setProperty: (id: string, value: number, origin?: Origin) => void
  toggleSwitch: (id: string) => void
  select: (id: string | null) => void
  openLesson: (id: string) => void
  nextHint: () => void
  markCompleted: (id: string) => void
  resetLesson: () => void
  addNote: (text: string, x: number, y: number, author?: Note['author']) => string
  removeNote: (id: string) => void
  setAgentActive: (active: boolean) => void
  logEvent: (actor: LogEntry['actor'], text: string) => void
  requestFocus: (id: string) => void
  propose: (action: ProposalAction, summary: string) => Proposal
  approveProposal: (id: string) => boolean
  rejectProposal: (id: string) => void
  approveNextN: (n: number) => number
}

function seedNetlist(lesson: Lesson): Pick<BenchState, 'components' | 'nodes' | 'wires'> {
  return {
    components: lesson.initialNetlist.components.map((c) => ({
      id: c.id,
      type: c.type,
      value: c.value ?? 0,
      ...(c.closed !== undefined ? { closed: c.closed } : {}),
      ...(c.burnedOut !== undefined ? { burnedOut: c.burnedOut } : {}),
      ...(c.blown !== undefined ? { blown: c.blown } : {}),
    })),
    nodes: lesson.initialNetlist.components.map((c) => ({ id: c.id, type: c.type, x: c.x, y: c.y })),
    wires: lesson.initialNetlist.wires.map((w, i) => ({ id: `lw${i}`, from: w.from, to: w.to })),
  }
}

function recompute(state: Pick<BenchState, 'components' | 'wires'>) {
  const netlist: Netlist = { components: state.components, wires: state.wires }
  const solution = solve(netlist)
  applyLatches(netlist, solution)
  return { solution, faults: detectFaults(netlist, solution) }
}

const firstLesson = lessons[0]!
const persisted = loadPersisted()

const initialState = persisted
  ? (() => {
      // Restore layout onto components; a lesson may have been renamed since.
      const lesson = getLesson(persisted.currentLessonId) ?? firstLesson
      const seeded = seedNetlist(lesson)
      const restoredComponents =
        persisted.components.length > 0 ? persisted.components : seeded.components
      const restoredWires = persisted.wires.length > 0 ? persisted.wires : seeded.wires
      const restoredNodes = seeded.nodes.map((n) => ({
        ...n,
        ...(persisted.positions[n.id] ?? { x: n.x, y: n.y }),
      }))
      // Components saved under free build have no lesson position; keep them visible.
      for (const c of restoredComponents) {
        if (!restoredNodes.some((n) => n.id === c.id)) {
          restoredNodes.push({ id: c.id, type: c.type, ...(persisted.positions[c.id] ?? { x: 80, y: 80 }) })
        }
      }
      return {
        components: restoredComponents,
        nodes: restoredNodes,
        wires: restoredWires,
        currentLessonId: lesson.id,
      }
    })()
  : (() => {
      const s = seedNetlist(firstLesson)
      return { ...s, currentLessonId: firstLesson.id }
    })()

const bootSolve = recompute(initialState)

/** Evaluate a lesson's predicate against a bench snapshot (boot/open/reset). */
function predicateFor(
  lesson: Lesson | undefined,
  snapshot: Pick<BenchState, 'components' | 'wires'>,
  solution: SolveResult,
  faults: Fault[],
): PredicateResult {
  if (!lesson) return { passed: false, failures: [] }
  return evaluatePredicate(lesson.successPredicate, {
    components: snapshot.components,
    solution,
    faults,
  })
}

const bootLesson = getLesson(initialState.currentLessonId)
const bootPredicate = predicateFor(bootLesson, initialState, bootSolve.solution, bootSolve.faults)
// A bench restored mid-goal shows honest progress immediately; a lesson whose
// predicate already passes at boot counts as completed.
const bootCompleted = new Set(persisted?.completedLessonIds ?? [])
if (bootPredicate.passed && bootLesson) bootCompleted.add(bootLesson.id)

export const useBenchStore = create<BenchState>((set, get) => ({
  components: initialState.components,
  nodes: initialState.nodes,
  wires: initialState.wires,
  origins: {},
  selectedId: null,
  solution: bootSolve.solution,
  faults: bootSolve.faults,

  currentLessonId: initialState.currentLessonId,
  completedLessonIds: bootCompleted,
  predicate: bootPredicate,
  hintsShown: 0,

  notes:
    persisted?.notes?.map((n) => ({ ...n, createdAt: Date.now() })) ?? [],
  log: [],
  agentActive: false,
  proposals: [],
  focusRequest: null,

  addComponent: (type, pos, origin = 'human') => {
    // makeId's module counter is blind to lesson-seeded ids (bat1, r1...), so
    // derive the next free suffix from what is actually on the bench.
    const prefixMap: Record<string, string> = {
      battery: 'bat',
      resistor: 'r',
      led: 'led',
      bulb: 'bulb',
      switch: 'sw',
      fuse: 'fu',
      ammeter: 'am',
      voltmeter: 'vm',
    }
    const prefix = prefixMap[type] ?? type.slice(0, 2)
    const taken = new Set(get().components.map((c) => c.id))
    let n = 1
    while (taken.has(`${prefix}${n}`)) n += 1
    const id = `${prefix}${n}`
    const comp: Component = { id, type, value: 0, ...(type === 'switch' ? { closed: false } : {}) }
    const node: BenchNode = { id, type, x: pos?.x ?? 120 + Math.random() * 200, y: pos?.y ?? 100 + Math.random() * 160 }
    set((s) => ({
      components: [...s.components, comp],
      nodes: [...s.nodes, node],
      origins: { ...s.origins, [id]: origin },
      selectedId: id,
    }))
    afterMutation(set, get, `${origin === 'agent' ? 'Agent placed' : 'Placed'} ${id} (${type})`, origin)
    return id
  },

  moveNode: (id, x, y) =>
    set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })),

  removeComponent: (id, origin = 'human') => {
    const before = get().components.find((c) => c.id === id)
    if (!before) return
    set((s) => ({
      components: s.components.filter((c) => c.id !== id),
      nodes: s.nodes.filter((n) => n.id !== id),
      wires: s.wires.filter((w) => !w.from.startsWith(`${id}:`) && !w.to.startsWith(`${id}:`)),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }))
    afterMutation(set, get, `${origin === 'agent' ? 'Agent removed' : 'Removed'} ${id}`, origin)
  },

  connectTerminals: (from, to, origin = 'human') => {
    if (from === to) return null
    if (!(from.endsWith(':a') || from.endsWith(':b'))) return null
    if (get().wires.some((w) => (w.from === from && w.to === to) || (w.from === to && w.to === from))) return null
    const wireId = makeWireId(get().wires)
    set((s) => ({ wires: [...s.wires, { id: wireId, from, to }] }))
    afterMutation(set, get, `${origin === 'agent' ? 'Agent wired' : 'Wired'} ${from} to ${to}`, origin)
    return wireId
  },

  removeWire: (id) => {
    set((s) => ({ wires: s.wires.filter((w) => w.id !== id) }))
    afterMutation(set, get, 'Removed a wire', 'human')
  },

  setProperty: (id, value, origin = 'human') => {
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, value } : c)),
    }))
    afterMutation(set, get, `${origin === 'agent' ? 'Agent set' : 'Set'} ${id} value to ${value}`, origin)
  },

  toggleSwitch: (id) => {
    let nowClosed = false
    set((s) => ({
      components: s.components.map((c) => {
        if (c.id !== id || c.type !== 'switch') return c
        nowClosed = !c.closed
        return { ...c, closed: !c.closed }
      }),
    }))
    afterMutation(set, get, `${nowClosed ? 'Closed' : 'Opened'} switch ${id}`, 'human')
  },

  select: (id) => set({ selectedId: id }),

  openLesson: (id) => {
    const lesson = getLesson(id)
    if (!lesson || get().currentLessonId === id) return
    const seeded = seedNetlist(lesson)
    set({ ...seeded, currentLessonId: id, selectedId: null, origins: {}, hintsShown: 0 })
    afterMutation(set, get, `Opened ${lesson.title}`, 'human')
  },

  nextHint: () => {
    const lesson = getLesson(get().currentLessonId) ?? firstLesson
    set((s) => ({ hintsShown: Math.min(s.hintsShown + 1, lesson.hints.length) }))
  },

  markCompleted: (id) => {
    set((s) => {
      if (s.completedLessonIds.has(id)) return s
      const next = new Set(s.completedLessonIds)
      next.add(id)
      return { completedLessonIds: next }
    })
  },

  resetLesson: () => {
    const lesson = getLesson(get().currentLessonId) ?? firstLesson
    const seeded = seedNetlist(lesson)
    set({ ...seeded, selectedId: null, origins: {}, hintsShown: 0 })
    afterMutation(set, get, `Reset ${lesson.title}`, 'human')
  },

  addNote: (text, x, y, author = 'You') => {
    const id = `note${Date.now().toString(36)}${Math.floor(Math.random() * 100)}`
    set((s) => ({ notes: [...s.notes, { id, text, x, y, author, createdAt: Date.now() }] }))
    return id
  },

  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  setAgentActive: (active) => set({ agentActive: active }),

  logEvent: (actor, text) =>
    set((s) => ({ log: [...s.log.slice(-199), { id: logSeq++, at: Date.now(), actor, text }] })),

  /**
   * "Look here" from the agent (focus_component tool): select the part so the
   * Inspector follows, bump the focus seq so the canvas pans to it, and leave
   * a visible trail in the shared log. No circuit change, so no re-solve.
   */
  requestFocus: (id) => {
    set((s) => ({
      focusRequest: { id, seq: (s.focusRequest?.seq ?? 0) + 1 },
      selectedId: id,
    }))
    get().logEvent('Agent', `asked you to look at ${id}`)
  },

  propose: (action, summary) => {
    const proposal: Proposal = {
      id: `prop${proposalSeq++}`,
      action,
      summary,
      status: 'pending_approval',
      createdAt: Date.now(),
    }
    set((s) => ({ proposals: [...s.proposals.slice(-99), proposal] }))
    get().logEvent('Agent', `proposes: ${summary}`)
    return proposal
  },

  approveProposal: (id) => {
    const p = get().proposals.find((x) => x.id === id)
    if (!p || p.status !== 'pending_approval') return false
    set((s) => ({
      proposals: s.proposals.map((x) =>
        x.id === id ? { ...x, status: 'approved' as const, decidedAt: Date.now() } : x,
      ),
    }))
    get().logEvent('You', `approved: ${p.summary}`)
    applyProposal(get, p.action)
    return true
  },

  rejectProposal: (id) => {
    const p = get().proposals.find((x) => x.id === id)
    if (!p || p.status !== 'pending_approval') return
    set((s) => ({
      proposals: s.proposals.map((x) =>
        x.id === id ? { ...x, status: 'rejected' as const, decidedAt: Date.now() } : x,
      ),
    }))
    get().logEvent('You', `rejected: ${p.summary}`)
  },

  /** Batch approve the oldest pending proposals in order; returns how many. */
  approveNextN: (n) => {
    const pending = get().proposals.filter((p) => p.status === 'pending_approval').slice(0, Math.max(0, n))
    for (const p of pending) get().approveProposal(p.id)
    return pending.length
  },
}))

/** Wire ids are independent of component ids to keep delete-rebuild loops simple. */
let wireSeq = 0
function makeWireId(existing: { id: string }[]): string {
  let id = `w${wireSeq}`
  while (existing.some((w) => w.id === id)) {
    wireSeq += 1
    id = `w${wireSeq}`
  }
  return id
}

/**
 * Shared tail of every mutating action: re-solve, latch faults, evaluate the
 * lesson predicate, log, persist. Tools in later phases call these same
 * actions, so they inherit this pipeline for free.
 */
function afterMutation(
  set: (partial: Partial<BenchState>) => void,
  get: () => BenchState,
  event: string,
  origin: Origin,
): void {
  const s = get()
  const { solution, faults } = recompute(s)
  const lesson = getLesson(s.currentLessonId)
  const predicate = lesson
    ? evaluatePredicate(lesson.successPredicate, {
        components: s.components,
        solution,
        faults,
      })
    : { passed: false, failures: [] }
  set({
    solution,
    faults,
    predicate,
    log: [
      ...s.log.slice(-199),
      { id: logSeq++, at: Date.now(), actor: origin === 'agent' ? 'Agent' : 'You', text: event },
    ],
  })
  if (predicate.passed && lesson && !s.completedLessonIds.has(lesson.id)) {
    get().markCompleted(lesson.id)
  }
  persist(get())
}

/** Convenience selector for tests and tools: the active Lesson object. */
export function useCurrentLesson(): Lesson {
  return useBenchStore((s) => getLesson(s.currentLessonId) ?? lessons[0]!)
}

/** Selector for the get_proposal_status read tool (Phase 3). */
export function getProposal(id: string): Proposal | undefined {
  return useBenchStore.getState().proposals.find((p) => p.id === id)
}

/**
 * An approved proposal finally mutates the bench, through the SAME actions a
 * human click uses, attributed to the agent. No parallel mutation path exists.
 */
function applyProposal(get: () => BenchState, action: ProposalAction): void {
  const s = get()
  switch (action.kind) {
    case 'place_component':
      s.addComponent(action.type, action.x !== undefined || action.y !== undefined ? { x: action.x ?? 120, y: action.y ?? 100 } : undefined, 'agent')
      break
    case 'connect':
      s.connectTerminals(action.from, action.to, 'agent')
      break
    case 'set_property':
      s.setProperty(action.id, action.value, 'agent')
      break
    case 'remove_component':
      s.removeComponent(action.id, 'agent')
      break
  }
}

export { lessonIndex, lessons }
