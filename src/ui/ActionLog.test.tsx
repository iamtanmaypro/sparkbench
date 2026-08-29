import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionLog } from './ActionLog'
import { useBenchStore } from '../store/useBenchStore'

/**
 * A15: the bench log records timestamped events from both parties, with the
 * actor visible (agent entries render under the agent class). Newest first,
 * so the student reads the collaboration story top-down.
 */

function fresh() {
  useBenchStore.setState({
    log: [],
    agentActive: false,
    proposals: [],
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
}

beforeEach(() => {
  localStorage.clear()
  fresh()
})

describe('ActionLog', () => {
  it('shows the empty-state hint before anything happens', () => {
    render(<ActionLog />)
    expect(screen.getByText(/Actions at this bench appear here/)).toBeTruthy()
  })

  it('renders agent and human events with timestamps and actor names, newest first', () => {
    const s = useBenchStore.getState()
    s.logEvent('Agent', 'measured r1: 0.03A')
    s.logEvent('You', 'approved: place battery on the bench')
    render(<ActionLog />)

    const log = screen.getByRole('log')
    const items = Array.from(log.querySelectorAll('li'))
    expect(items).toHaveLength(2)
    // Newest event first.
    expect(items[0]!.textContent).toContain('approved: place battery on the bench')
    expect(items[0]!.className).toContain('log-actor-you')
    expect(items[1]!.textContent).toContain('measured r1: 0.03A')
    expect(items[1]!.className).toContain('log-actor-agent')
    // Every entry is timestamped HH:MM:SS.
    for (const item of items) {
      expect(item.querySelector('.log-time')!.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    }
  })

  it('reflects store-driven events from real actions, human and agent origins alike', () => {
    const s = useBenchStore.getState()
    const id = s.addComponent('resistor', { x: 0, y: 0 }, 'agent')
    render(<ActionLog />)
    expect(screen.getByText(`Agent placed ${id} (resistor)`)).toBeTruthy()
  })
})
