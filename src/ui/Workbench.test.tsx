import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Workbench } from './Workbench'
import { useBenchStore } from '../store/useBenchStore'

/**
 * A05 component coverage: the canvas UI is a thin projection of the store.
 * These tests drive the real Workbench tree (React Flow + panels) and assert
 * each mouse-only interaction lands in store state.
 */

function fresh() {
  useBenchStore.setState({
    components: [],
    nodes: [],
    wires: [],
    origins: {},
    selectedId: null,
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

describe('Workbench (store-driven canvas interactions)', () => {
  it('palette click places a component through addComponent', () => {
    render(<Workbench />)
    fireEvent.click(screen.getByRole('button', { name: 'Place Battery' }))
    const s = useBenchStore.getState()
    expect(s.components).toHaveLength(1)
    expect(s.components[0]!.type).toBe('battery')
    expect(s.nodes[0]!.id).toBe(s.components[0]!.id)
  })

  it('locked parts are disabled in a guided lesson, unlocked ones place', () => {
    useBenchStore.getState().openLesson('ohms-law')
    render(<Workbench />)
    expect(screen.getByRole('button', { name: 'Place LED (locked in this lesson)' })).toHaveProperty('disabled', true)
    const battery = screen.getByRole('button', { name: 'Place Battery' })
    expect(battery).toHaveProperty('disabled', false)
    fireEvent.click(battery)
    expect(useBenchStore.getState().components.some((c) => c.type === 'battery')).toBe(true)
  })

  it('clicking a switch node toggles it in the store', () => {
    const sid = useBenchStore.getState().addComponent('switch', { x: 0, y: 0 })
    render(<Workbench />)
    fireEvent.click(screen.getByRole('button', { name: 'Close switch sw1' }))
    expect(useBenchStore.getState().components.find((c) => c.id === sid)!.closed).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Open switch sw1' }))
    expect(useBenchStore.getState().components.find((c) => c.id === sid)!.closed).toBe(false)
  })

  it('inspector delete button removes the selected component', () => {
    const id = useBenchStore.getState().addComponent('resistor', { x: 0, y: 0 })
    useBenchStore.getState().select(id)
    render(<Workbench />)
    fireEvent.click(screen.getByRole('button', { name: `Delete ${id}` }))
    expect(useBenchStore.getState().components).toHaveLength(0)
  })

  it('inspector shows live readings for the selected part', () => {
    const s = useBenchStore.getState()
    const bat = s.addComponent('battery')
    const r = s.addComponent('resistor')
    s.setProperty(r, 100)
    s.connectTerminals(`${bat}:a` as never, `${r}:a` as never)
    s.connectTerminals(`${r}:b` as never, `${bat}:b` as never)
    useBenchStore.getState().select(r)
    render(<Workbench />)
    const inspector = screen.getByText('Inspector').closest('.inspector') as HTMLElement
    // 3V over ~100.5 ohm total -> ~29.85mA across the resistor.
    expect(Number(within(inspector).getByText('Current').nextElementSibling!.textContent!.replace(' A', ''))).toBeGreaterThan(0.02)
  })

  it('add sticky note writes a note into the store', () => {
    render(<Workbench />)
    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }))
    expect(useBenchStore.getState().notes).toHaveLength(1)
  })

  it('lesson panel switches lessons through openLesson', () => {
    render(<Workbench />)
    fireEvent.click(screen.getByRole('button', { name: /diagnose the fault/i }))
    expect(useBenchStore.getState().currentLessonId).toBe('diagnose-fault')
    // Lesson 4's pre-broken circuit is on the bench.
    expect(useBenchStore.getState().components.some((c) => c.burnedOut)).toBe(true)
  })
})
