import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApprovalCard } from './ApprovalCard'
import { useBenchStore } from '../store/useBenchStore'

/**
 * A11 UI half: the on-canvas approval cards render pending proposals and the
 * only way a proposal reaches the bench is the human tapping Approve (or the
 * batch control). Drives the real component against the real store.
 */

function fresh() {
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

describe('ApprovalCard', () => {
  it('renders nothing while no proposals are pending', () => {
    render(<ApprovalCard />)
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('renders one card per pending proposal with approve/reject controls', () => {
    const s = useBenchStore.getState()
    s.propose({ kind: 'place_component', type: 'battery' }, 'place battery on the bench')
    s.propose({ kind: 'connect', from: 'bat1:a' as never, to: 'r1:a' as never }, 'connect bat1:a to r1:a')
    render(<ApprovalCard />)

    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(screen.getAllByText('wants to:')).toHaveLength(2)
    expect(screen.getByText('place battery on the bench')).toBeTruthy()
    expect(screen.getByLabelText('Approve: connect bat1:a to r1:a')).toBeTruthy()
    expect(screen.getByLabelText('Reject: connect bat1:a to r1:a')).toBeTruthy()
  })

  it('Approve applies the mutation through the store; Reject leaves the bench alone', () => {
    const s = useBenchStore.getState()
    const keep = s.propose({ kind: 'place_component', type: 'resistor' }, 'place resistor on the bench')
    const kill = s.propose({ kind: 'place_component', type: 'bulb' }, 'place bulb on the bench')
    render(<ApprovalCard />)

    fireEvent.click(screen.getByLabelText('Approve: place resistor on the bench'))
    fireEvent.click(screen.getByLabelText('Reject: place bulb on the bench'))
    const after = useBenchStore.getState()
    expect(after.components.map((c) => c.type)).toEqual(['resistor'])
    expect(after.origins[after.components[0]!.id]).toBe('agent')
    expect(after.proposals.find((p) => p.id === keep.id)!.status).toBe('approved')
    expect(after.proposals.find((p) => p.id === kill.id)!.status).toBe('rejected')
  })

  it('batch "Approve next N" applies the requested number of pending proposals', () => {
    const s = useBenchStore.getState()
    s.propose({ kind: 'place_component', type: 'battery' }, 'place battery')
    s.propose({ kind: 'place_component', type: 'resistor' }, 'place resistor')
    s.propose({ kind: 'place_component', type: 'bulb' }, 'place bulb')
    render(<ApprovalCard />)

    const input = screen.getByLabelText('How many pending proposals to approve') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.click(screen.getByLabelText('Approve next 2 pending proposals'))

    const after = useBenchStore.getState()
    expect(after.components.map((c) => c.type)).toEqual(['battery', 'resistor'])
    expect(after.proposals.filter((p) => p.status === 'pending_approval')).toHaveLength(1)
  })

  it('card layer disappears once every proposal is decided', () => {
    const s = useBenchStore.getState()
    const p = s.propose({ kind: 'place_component', type: 'led' }, 'place led')
    render(<ApprovalCard />)
    expect(screen.getAllByRole('group')).toHaveLength(1)
    fireEvent.click(screen.getByLabelText(`Reject: place led`))
    expect(useBenchStore.getState().proposals.find((x) => x.id === p.id)!.status).toBe('rejected')
    expect(screen.queryByRole('group')).toBeNull()
  })
})
