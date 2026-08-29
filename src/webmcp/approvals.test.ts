import { beforeEach, describe, expect, it } from 'vitest'
import {
  placeComponentTool,
  connectTool,
  setPropertyTool,
  removeComponentTool,
  addNoteTool,
  getProposalStatusTool,
} from './approvals'
import { useBenchStore } from '../store/useBenchStore'
import type { Terminal } from '../engine/netlist'

/**
 * A11: write tools never mutate until a human clicks Approve. Each write
 * returns {status:"pending_approval", proposal_id, summary} and queues a
 * proposal; the mutation applies only through approveProposal (the same store
 * path the approval card calls) and is discarded on Reject. add_note
 * auto-executes signed author="Agent"; get_proposal_status reports outcomes.
 */

function fresh(): void {
  useBenchStore.setState({
    components: [],
    nodes: [],
    wires: [],
    origins: {},
    selectedId: null,
    solution: { ok: false, nodes: [], readings: {} },
    faults: [],
    notes: [],
    log: [],
    proposals: [],
    agentActive: false,
    focusRequest: null,
    currentLessonId: 'free-build',
    completedLessonIds: new Set<string>(),
    predicate: { passed: false, failures: [] },
    hintsShown: 0,
  })
}

beforeEach(() => {
  localStorage.clear()
  fresh()
})

interface Pending {
  status: string
  proposal_id: string
  summary: string
}

describe('pending_approval return shape (no mutation before approval)', () => {
  it('place_component queues a proposal and changes nothing', async () => {
    const out = (await placeComponentTool.execute(
      { type: 'resistor', properties: { value: 220 } },
      {},
    )) as Pending
    expect(out.status).toBe('pending_approval')
    expect(out.proposal_id).toMatch(/^prop\d+$/)
    expect(out.summary).toContain('resistor')

    const s = useBenchStore.getState()
    expect(s.components).toHaveLength(0)
    expect(s.proposals).toHaveLength(1)
    expect(s.proposals[0]).toMatchObject({
      status: 'pending_approval',
      action: { kind: 'place_component', type: 'resistor', value: 220 },
    })
  })

  it('connect / set_property / remove_component all queue instead of mutating', async () => {
    const s0 = useBenchStore.getState()
    const bat = s0.addComponent('battery', { x: 10, y: 10 })
    const r = s0.addComponent('resistor', { x: 100, y: 10 })

    const wired = (await connectTool.execute(
      { from_terminal: `${bat}:a`, to_terminal: `${r}:a` },
      {},
    )) as Pending
    const tuned = (await setPropertyTool.execute({ id: r, property: 'value', value: 470 }, {})) as Pending
    const removed = (await removeComponentTool.execute({ id: bat }, {})) as Pending

    for (const out of [wired, tuned, removed]) {
      expect(out.status).toBe('pending_approval')
      expect(typeof out.proposal_id).toBe('string')
      expect(out.summary.length).toBeGreaterThan(0)
    }
    const s = useBenchStore.getState()
    // Nothing happened: 2 components, no wires, original value, 3 queued cards.
    expect(s.components).toHaveLength(2)
    expect(s.wires).toHaveLength(0)
    expect(s.components.find((c) => c.id === r)!.value).toBe(0)
    expect(s.proposals).toHaveLength(3)
  })
})

describe('approval applies the mutation through normal store paths', () => {
  it('approved place_component lands with agent origin and requested value', async () => {
    const out = (await placeComponentTool.execute(
      { type: 'resistor', properties: { value: 220 }, x: 300, y: 200 },
      {},
    )) as Pending
    expect(useBenchStore.getState().approveProposal(out.proposal_id)).toBe(true)
    const s = useBenchStore.getState()
    expect(s.components).toHaveLength(1)
    expect(s.components[0]).toMatchObject({ type: 'resistor', value: 220 })
    expect(s.origins[s.components[0]!.id]).toBe('agent')
    expect(s.proposals[0]!.status).toBe('approved')
  })

  it('approved connect wires the terminals and re-solves', async () => {
    const s0 = useBenchStore.getState()
    const bat = s0.addComponent('battery', { x: 10, y: 10 })
    const r = s0.addComponent('resistor', { x: 100, y: 10 })
    const out = (await connectTool.execute(
      { from_terminal: `${bat}:a`, to_terminal: `${r}:a` },
      {},
    )) as Pending
    useBenchStore.getState().approveProposal(out.proposal_id)
    const s = useBenchStore.getState()
    expect(s.wires).toHaveLength(1)
    expect(s.wires[0]).toMatchObject({ from: `${bat}:a`, to: `${r}:a` })
    expect(s.log.some((e) => e.actor === 'Agent' && e.text.includes('Agent wired'))).toBe(true)
   })
})

describe('rejection discards the proposal', () => {
  it('rejected proposals leave the bench untouched', async () => {
    const out = (await placeComponentTool.execute({ type: 'led' }, {})) as Pending
    useBenchStore.getState().rejectProposal(out.proposal_id)
    const s = useBenchStore.getState()
    expect(s.components).toHaveLength(0)
    expect(s.proposals[0]!.status).toBe('rejected')
  })
})

describe('batch approval (approve next N)', () => {
  it('approves the oldest pending proposals in order', async () => {
    const a = (await placeComponentTool.execute({ type: 'battery' }, {})) as Pending
    const b = (await placeComponentTool.execute({ type: 'resistor' }, {})) as Pending
    const c = (await placeComponentTool.execute({ type: 'bulb' }, {})) as Pending
    expect(useBenchStore.getState().approveNextN(2)).toBe(2)
    const s = useBenchStore.getState()
    expect(s.components.map((x) => x.type)).toEqual(['battery', 'resistor'])
    expect(s.proposals.find((p) => p.id === a.proposal_id)!.status).toBe('approved')
    expect(s.proposals.find((p) => p.id === b.proposal_id)!.status).toBe('approved')
    expect(s.proposals.find((p) => p.id === c.proposal_id)!.status).toBe('pending_approval')
  })

  it('skips rejected proposals and reports the true applied count', async () => {
    const a = (await placeComponentTool.execute({ type: 'battery' }, {})) as Pending
    const b = (await placeComponentTool.execute({ type: 'resistor' }, {})) as Pending
    const c = (await placeComponentTool.execute({ type: 'bulb' }, {})) as Pending
    useBenchStore.getState().rejectProposal(b.proposal_id)
    expect(useBenchStore.getState().approveNextN(10)).toBe(2)
    const s = useBenchStore.getState()
    expect(s.components.map((x) => x.type)).toEqual(['battery', 'bulb'])
    expect(s.proposals.find((p) => p.id === a.proposal_id)!.status).toBe('approved')
    expect(s.proposals.find((p) => p.id === b.proposal_id)!.status).toBe('rejected')
    expect(s.proposals.find((p) => p.id === c.proposal_id)!.status).toBe('approved')
  })
})

describe('set_property switch control', () => {
  it('closed=true on a switch queues, and approval flips it as the agent', async () => {
    const s0 = useBenchStore.getState()
    const sw = s0.addComponent('switch', { x: 10, y: 10 })
    const out = (await setPropertyTool.execute({ id: sw, property: 'closed', value: true }, {})) as Pending
    expect(out.status).toBe('pending_approval')
    expect(useBenchStore.getState().components.find((c) => c.id === sw)!.closed).toBe(false)

    useBenchStore.getState().approveProposal(out.proposal_id)
    const s = useBenchStore.getState()
    expect(s.components.find((c) => c.id === sw)!.closed).toBe(true)
    expect(s.log.some((e) => e.actor === 'Agent' && e.text.includes('closed switch'))).toBe(true)
  })

  it('is idempotent: approving closed=true twice leaves the switch closed', async () => {
    const s0 = useBenchStore.getState()
    const sw = s0.addComponent('switch', { x: 10, y: 10 })
    const out = (await setPropertyTool.execute({ id: sw, property: 'closed', value: true }, {})) as Pending
    useBenchStore.getState().approveProposal(out.proposal_id)
    useBenchStore.getState().approveProposal(out.proposal_id)
    expect(useBenchStore.getState().components.find((c) => c.id === sw)!.closed).toBe(true)
  })

  it('rejects closed on non-switches and non-boolean values', async () => {
    const s0 = useBenchStore.getState()
    const r = s0.addComponent('resistor', { x: 10, y: 10 })
    const badTarget = (await setPropertyTool.execute({ id: r, property: 'closed', value: true }, {})) as {
      status: string
      message: string
    }
    const badValue = (await setPropertyTool.execute(
      { id: r, property: 'value', value: 'big' },
      {},
    )) as { status: string; message: string }
    const unknownProp = (await setPropertyTool.execute(
      { id: r, property: 'resistance', value: 5 },
      {},
    )) as { status: string; message: string }
    expect(badTarget.status).toBe('error')
    expect(badTarget.message).toContain('only switches')
    expect(badValue.status).toBe('error')
    expect(unknownProp.status).toBe('error')
    expect(useBenchStore.getState().proposals).toHaveLength(0)
  })
})

describe('write-tool validation', () => {
  it('place_component rejects types the lesson does not allow', async () => {
    useBenchStore.getState().openLesson('ohms-law')
    const out = (await placeComponentTool.execute({ type: 'led' }, {})) as {
      status: string
      allowed_types: string[]
    }
    expect(out.status).toBe('error')
    // A13: the agent-facing palette in lesson 1 is the minimal
    // battery/resistor write set, narrower than the human palette (which also
    // offers the meters). See toolsets.ts placeTypesForLesson.
    expect(out.allowed_types).toEqual(['battery', 'resistor'])
    expect(useBenchStore.getState().proposals).toHaveLength(0)
  })

  it('connect rejects malformed terminals, unknown parts, duplicates, and self-loops', async () => {
    const s0 = useBenchStore.getState()
    const bat = s0.addComponent('battery', { x: 10, y: 10 })
    const r = s0.addComponent('resistor', { x: 100, y: 10 })
    useBenchStore.getState().connectTerminals(`${bat}:a` as Terminal, `${r}:a` as Terminal)

    const malformed = (await connectTool.execute({ from_terminal: 'bat1', to_terminal: `${r}:b` }, {})) as {
      status: string
    }
    const ghost = (await connectTool.execute({ from_terminal: 'zz9:a', to_terminal: `${r}:b` }, {})) as {
      status: string
    }
    const dupe = (await connectTool.execute(
      { from_terminal: `${r}:a`, to_terminal: `${bat}:a` },
      {},
    )) as { status: string }
    const self = (await connectTool.execute({ from_terminal: `${bat}:b`, to_terminal: `${bat}:b` }, {})) as {
      status: string
    }
    for (const out of [malformed, ghost, dupe, self]) expect(out.status).toBe('error')
    expect(useBenchStore.getState().proposals).toHaveLength(0)
  })

  it('remove_component and set_property reject unknown ids', async () => {
    const gone = (await removeComponentTool.execute({ id: 'zz9' }, {})) as { status: string }
    const tune = (await setPropertyTool.execute({ id: 'zz9', value: 5 }, {})) as { status: string }
    expect(gone.status).toBe('error')
    expect(tune.status).toBe('error')
  })
})

describe('add_note auto-executes signed as Agent', () => {
  it('applies immediately with no proposal, author forced to Agent', async () => {
    const out = (await addNoteTool.execute({ text: 'R1 drops 2.9V; that is the lesson point.', x: 50, y: 60 }, {})) as {
      status: string
      note_id: string
      author: string
    }
    expect(out.status).toBe('ok')
    expect(out.author).toBe('Agent')
    const s = useBenchStore.getState()
    expect(s.proposals).toHaveLength(0)
    expect(s.notes).toHaveLength(1)
    expect(s.notes[0]).toMatchObject({ author: 'Agent', text: 'R1 drops 2.9V; that is the lesson point.' })
    // The shared log carries the agent action too.
    expect(s.log.some((e) => e.actor === 'Agent' && e.text.includes('note'))).toBe(true)
  })

  it('errors without text and caps absurdly long notes', async () => {
    const empty = (await addNoteTool.execute({}, {})) as { status: string }
    expect(empty.status).toBe('error')
    await addNoteTool.execute({ text: 'x'.repeat(2000) }, {})
    const s = useBenchStore.getState()
    expect(s.notes[0]!.text.length).toBeLessThanOrEqual(400)
  })
})

describe('get_proposal_status', () => {
  it('reports pending, then approved after the card decision', async () => {
    const placed = (await placeComponentTool.execute({ type: 'battery' }, {})) as Pending
    const pending = (await getProposalStatusTool.execute(
      { proposal_id: placed.proposal_id },
      {},
    )) as { status: string; proposal_id: string; pending_proposals: number }
    expect(pending.status).toBe('pending_approval')
    expect(pending.proposal_id).toBe(placed.proposal_id)
    expect(pending.pending_proposals).toBe(1)

    useBenchStore.getState().approveProposal(placed.proposal_id)
    const done = (await getProposalStatusTool.execute(
      { proposal_id: placed.proposal_id },
      {},
    )) as { status: string; pending_proposals: number }
    expect(done.status).toBe('approved')
    expect(done.pending_proposals).toBe(0)
  })

  it('reports rejected outcomes and unknown ids', async () => {
    const placed = (await placeComponentTool.execute({ type: 'led' }, {})) as Pending
    useBenchStore.getState().rejectProposal(placed.proposal_id)
    const out = (await getProposalStatusTool.execute(
      { proposal_id: placed.proposal_id },
      {},
    )) as { status: string }
    expect(out.status).toBe('rejected')

    const ghost = (await getProposalStatusTool.execute({ proposal_id: 'prop999' }, {})) as {
      status: string
      message: string
    }
    expect(ghost.status).toBe('error')
    expect(ghost.message).toContain('prop999')
  })
})

describe('annotations and abort handling', () => {
  it('write tools are readOnlyHint false; the status read is readOnlyHint true', () => {
    for (const tool of [placeComponentTool, connectTool, setPropertyTool, removeComponentTool, addNoteTool]) {
      expect(tool.annotations?.readOnlyHint).toBe(false)
    }
    expect(removeComponentTool.annotations?.destructiveHint).toBe(true)
    expect(getProposalStatusTool.annotations?.readOnlyHint).toBe(true)
  })

  it('every tool respects a pre-aborted signal and creates nothing', async () => {
    const ac = new AbortController()
    ac.abort()
    for (const tool of [placeComponentTool, connectTool, setPropertyTool, removeComponentTool, addNoteTool, getProposalStatusTool]) {
      const out = await tool.execute(
        tool === placeComponentTool ? { type: 'resistor' } : tool === addNoteTool ? { text: 'hi' } : {},
        { signal: ac.signal },
      )
      expect(out).toEqual({ status: 'aborted' })
    }
    const s = useBenchStore.getState()
    expect(s.proposals).toHaveLength(0)
    expect(s.notes).toHaveLength(0)
  })
})

describe('lesson switch clears stale pending proposals', () => {
  it('openLesson drops pending cards but keeps decided history', async () => {
    const keep = (await placeComponentTool.execute({ type: 'battery' }, {})) as Pending
    useBenchStore.getState().approveProposal(keep.proposal_id)
    const stale = (await placeComponentTool.execute({ type: 'resistor' }, {})) as Pending
    expect(useBenchStore.getState().proposals).toHaveLength(2)

    useBenchStore.getState().openLesson('ohms-law')
    const s = useBenchStore.getState()
    expect(s.proposals).toHaveLength(1)
    expect(s.proposals[0]!.id).toBe(keep.proposal_id)
    expect(stale.proposal_id).not.toBe(keep.proposal_id)
  })
})
