import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentChip } from './AgentChip'
import { useBenchStore } from '../store/useBenchStore'

/**
 * A15 UI half: the identity chip tracks agent presence. `agentActive` is
 * flipped by the registration-layer wrapper (webmcp/presence.ts); here we
 * drive the store directly and assert what the student sees.
 */

describe('AgentChip', () => {
  beforeEach(() => {
    localStorage.clear()
    useBenchStore.setState({
      agentActive: false,
      proposals: [],
      log: [],
      components: [],
      nodes: [],
      wires: [],
      origins: {},
      selectedId: null,
      notes: [],
      currentLessonId: 'free-build',
      completedLessonIds: new Set<string>(),
      predicate: { passed: false, failures: [] },
      hintsShown: 0,
      focusRequest: null,
      agentTouch: null,
    })
  })

  it('shows the agent idle when nothing is executing', () => {
    render(<AgentChip />)
    expect(screen.getByLabelText('Agent is idle')).toBeTruthy()
    expect(screen.queryByText('working…')).toBeNull()
  })

  it('goes active (dot lit, "working…") while a tool executes', () => {
    useBenchStore.setState({ agentActive: true })
    render(<AgentChip />)
    expect(screen.getByLabelText('Agent is working')).toBeTruthy()
    expect(screen.getByText('working…')).toBeTruthy()
  })

  it('reports pending proposals while the agent waits on approval cards', () => {
    const s = useBenchStore.getState()
    s.propose({ kind: 'place_component', type: 'battery' }, 'place battery on the bench')
    s.propose({ kind: 'connect', from: 'bat1:a' as never, to: 'r1:a' as never }, 'connect bat1:a to r1:a')
    render(<AgentChip />)
    expect(screen.getByLabelText('Agent is waiting for you: 2 proposals need your approval')).toBeTruthy()
    expect(screen.getByText('2 awaiting your approval')).toBeTruthy()
  })

  it('active state wins over the waiting state during execution', () => {
    const s = useBenchStore.getState()
    s.propose({ kind: 'place_component', type: 'bulb' }, 'place bulb on the bench')
    useBenchStore.setState({ agentActive: true })
    render(<AgentChip />)
    expect(screen.getByLabelText('Agent is working')).toBeTruthy()
    expect(screen.queryByText(/awaiting your approval/)).toBeNull()
  })
})
