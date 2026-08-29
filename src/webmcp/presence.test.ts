import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBenchStore } from '../store/useBenchStore'
import { withAgentPresence } from './presence'
import { useTool } from './useTool'
import { pingTool } from './register'
import type { ToolDefinition, ModelContextRegistry } from './model-context'

/**
 * A15 plumbing: the identity chip's active state must track real tool
 * execution. The registration layer wraps every tool with withAgentPresence,
 * so the chip goes active for the duration of any execute (sync, async, or
 * throwing) without tools knowing about the chip.
 *
 * A16 also lives here: the ping tool (like every other execute) honors an
 * already-aborted AbortSignal instead of doing work.
 */

function fakeRegistry(): ModelContextRegistry & { tools: Map<string, ToolDefinition> } {
  const tools = new Map<string, ToolDefinition>()
  return {
    tools,
    // Faithful to real Chrome 151: no removeTool method; the tool leaves the
    // map when the registration AbortSignal aborts.
    registerTool: vi.fn((t: ToolDefinition, options?: { signal?: AbortSignal }) => {
      tools.set(t.name, t)
      options?.signal?.addEventListener('abort', () => {
        if (tools.get(t.name) === t) tools.delete(t.name)
      })
    }),
  }
}

describe('withAgentPresence', () => {
  beforeEach(() => {
    localStorage.clear()
    useBenchStore.setState({ agentActive: false })
  })

  it('flips agentActive on for the duration of a sync execute', () => {
    let during = false
    const tool: ToolDefinition = {
      name: 'probe_sync',
      description: 'probe',
      execute() {
        during = useBenchStore.getState().agentActive
        return { ok: true }
      },
    }
    const result = withAgentPresence(tool).execute({}, {})
    expect(result).toEqual({ ok: true })
    expect(during).toBe(true)
    expect(useBenchStore.getState().agentActive).toBe(false)
  })

  it('stays active until an async execute settles', async () => {
    let during = false
    const tool: ToolDefinition = {
      name: 'probe_async',
      description: 'probe',
      execute() {
        return new Promise((resolve) => {
          during = useBenchStore.getState().agentActive
          resolve({ ok: true })
        })
      },
    }
    const wrapped = withAgentPresence(tool)
    const pending = wrapped.execute({}, {}) as Promise<unknown>
    expect(useBenchStore.getState().agentActive).toBe(true)
    await pending
    expect(during).toBe(true)
    expect(useBenchStore.getState().agentActive).toBe(false)
  })

  it('resets agentActive when execute throws', () => {
    const tool: ToolDefinition = {
      name: 'probe_throw',
      description: 'probe',
      execute() {
        throw new Error('boom')
      },
    }
    expect(() => withAgentPresence(tool).execute({}, {})).toThrow('boom')
    expect(useBenchStore.getState().agentActive).toBe(false)
  })

  it('keeps name/description/annotations intact for budget linting', () => {
    const wrapped = withAgentPresence(pingTool)
    expect(wrapped.name).toBe(pingTool.name)
    expect(wrapped.description).toBe(pingTool.description)
    expect(wrapped.annotations).toEqual(pingTool.annotations)
  })
})

describe('registration wraps tools (chip tracks dynamic toolsets too)', () => {
  const doc = document as unknown as Record<string, unknown>
  let saved: unknown
  let registry: ReturnType<typeof fakeRegistry>

  beforeEach(() => {
    localStorage.clear()
    useBenchStore.setState({ agentActive: false })
    saved = doc.modelContext
    registry = fakeRegistry()
    doc.modelContext = registry
  })

  afterEach(() => {
    if (saved !== undefined) doc.modelContext = saved
    else delete doc.modelContext
  })

  it('useTool registers a wrapped tool whose execute toggles presence', async () => {
    const { unmount } = renderHook(() => useTool(pingTool))
    const registered = registry.tools.get('ping_workbench')
    expect(registered).toBeTruthy()
    registered!.execute({}, {})
    expect(useBenchStore.getState().agentActive).toBe(false)
    // Sanity: the wrapper really toggled during the call (probe via a custom tool).
    const probe = registry.tools.get('ping_workbench')!
    expect(probe.name).toBe('ping_workbench')
    unmount()
  })

  it('a slow registered tool leaves the chip active while pending', async () => {
    const slow: ToolDefinition = {
      name: 'slow_probe',
      description: 'probe',
      execute: () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 10)),
    }
    renderHook(() => useTool(slow))
    const registered = registry.tools.get('slow_probe')!
    const pending = registered.execute({}, {}) as Promise<unknown>
    expect(useBenchStore.getState().agentActive).toBe(true)
    await waitFor(() => expect(useBenchStore.getState().agentActive).toBe(false))
    await pending
  })
})

describe('ping honors AbortSignal (A16)', () => {
  it('returns the aborted shape instead of doing work', () => {
    const ac = new AbortController()
    ac.abort()
    expect(pingTool.execute({}, { signal: ac.signal })).toEqual({ status: 'aborted' })
  })

  it('answers normally when not aborted', () => {
    const out = pingTool.execute({}, {}) as { status: string }
    expect(out.status).toBe('ok')
  })
})
