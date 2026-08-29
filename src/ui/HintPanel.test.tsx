import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HintPanel, EXAMPLE_PROMPTS } from './HintPanel'

/**
 * A15: the empty-state panel lists exactly the 3 example prompts (the same
 * three the Gate-2 runtime probes use), every prompt is a keyboard-operable
 * button with an aria label, and picking one confirms the copy.
 */

describe('HintPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists exactly 3 example prompts as labeled buttons', () => {
    render(<HintPanel />)
    expect(EXAMPLE_PROMPTS).toHaveLength(3)
    for (const p of EXAMPLE_PROMPTS) {
      expect(screen.getByRole('button', { name: `Copy prompt: ${p}` })).toBeTruthy()
    }
  })

  it('confirms a copied prompt through the status line', () => {
    render(<HintPanel />)
    fireEvent.click(screen.getByRole('button', { name: `Copy prompt: ${EXAMPLE_PROMPTS[0]}` }))
    expect(screen.getByRole('status').textContent).toContain('Prompt copied')
  })

  it('canvas variant carries the empty-state heading and accessible name', () => {
    render(<HintPanel variant="canvas" />)
    expect(screen.getByText('Your AI lab partner is listening')).toBeTruthy()
    expect(
      screen.getByRole('region', { name: 'Getting started: prompts to try with your agent' }),
    ).toBeTruthy()
  })
})
