import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getModelContext } from './useTool'
import type { ModelContextRegistry } from './model-context'

function fakeRegistry(): ModelContextRegistry {
  return { registerTool: vi.fn(), removeTool: vi.fn() }
}

/**
 * A07: unit test asserting feature-detect logic picks document over navigator
 * and handles absence.
 */
describe('getModelContext feature detection', () => {
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

  it('prefers document.modelContext over the deprecated navigator path', () => {
    const docMc = fakeRegistry()
    const navMc = fakeRegistry()
    doc.modelContext = docMc
    nav.modelContext = navMc
    expect(getModelContext()).toBe(docMc)
  })

  it('falls back to navigator.modelContext when document lacks it', () => {
    const navMc = fakeRegistry()
    nav.modelContext = navMc
    expect(getModelContext()).toBe(navMc)
  })

  it('returns null when neither surface exists (no throw)', () => {
    expect(getModelContext()).toBeNull()
  })
})
