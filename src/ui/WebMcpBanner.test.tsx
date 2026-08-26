import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WebMcpBanner } from './WebMcpBanner'
import type { ModelContextRegistry } from '../webmcp/model-context'

/**
 * A07 component coverage: the dummy tool registers against the detected
 * registry, and a dismissible banner appears only when WebMCP is absent.
 */
describe('WebMcpBanner', () => {
  const doc = document as unknown as Record<string, unknown>
  const nav = navigator as unknown as Record<string, unknown>
  let savedDoc: unknown
  let savedNav: unknown

  beforeEach(() => {
    savedDoc = doc.modelContext
    savedNav = nav.modelContext
    delete doc.modelContext
    delete nav.modelContext
  })

  afterEach(() => {
    if (savedDoc !== undefined) doc.modelContext = savedDoc
    else delete doc.modelContext
    if (savedNav !== undefined) nav.modelContext = savedNav
    else delete nav.modelContext
  })

  it('shows the hint banner when WebMCP is absent', () => {
    render(<WebMcpBanner />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain("ChatGPT's browser")
  })

  it('banner is dismissible via its button', () => {
    render(<WebMcpBanner />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('registers ping_workbench via document.modelContext when present', () => {
    const registered: ModelContextRegistry = {
      registerTool: vi.fn(),
      removeTool: vi.fn(),
    }
    doc.modelContext = registered
    render(<WebMcpBanner />)

    expect(registered.registerTool).toHaveBeenCalledTimes(1)
    const tool = vi.mocked(registered.registerTool).mock.calls[0]![0] as {
      name: string
      description: string
      execute: () => unknown
    }
    expect(tool.name).toBe('ping_workbench')
    // Budgets apply from day one.
    expect(tool.name.length).toBeLessThanOrEqual(30)
    expect(tool.description.length).toBeLessThanOrEqual(500)

    // No banner when the API exists, and the dummy tool actually executes.
    expect(screen.queryByRole('status')).toBeNull()
    expect((tool.execute as () => { status: string })().status).toBe('ok')
  })

  it('falls back to navigator.modelContext for registration', () => {
    const registered: ModelContextRegistry = {
      registerTool: vi.fn(),
    }
    nav.modelContext = registered
    render(<WebMcpBanner />)
    expect(registered.registerTool).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
