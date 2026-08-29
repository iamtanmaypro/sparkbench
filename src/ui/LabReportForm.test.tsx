import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LabReportForm } from './LabReportForm'
import { useBenchStore } from '../store/useBenchStore'

/**
 * A14: the declarative WebMCP surface. The Lab Report form carries
 * `toolname`/`tooldescription`, has NO `toolautosubmit` (state-changing, so
 * the human always presses Submit), every control documents itself with
 * `toolparamdescription`, and submitting never navigates the SPA.
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

function renderForm(): HTMLFormElement {
  render(<LabReportForm />)
  const form = document.querySelector('form.lab-report')
  expect(form).toBeTruthy()
  return form as HTMLFormElement
}

describe('LabReportForm (A14 declarative form tool)', () => {
  it('carries toolname and tooldescription within budgets', () => {
    const form = renderForm()
    expect(form.getAttribute('toolname')).toBe('submit_lab_report')
    expect(form.getAttribute('toolname')!.length).toBeLessThanOrEqual(30)
    const desc = form.getAttribute('tooldescription') ?? ''
    expect(desc.length).toBeGreaterThan(0)
    expect(desc.length).toBeLessThanOrEqual(500)
  })

  it('has NO toolautosubmit anywhere in the form', () => {
    const form = renderForm()
    expect(form.hasAttribute('toolautosubmit')).toBe(false)
    expect(form.getAttribute('toolautosubmit')).toBeNull()
    for (const el of form.querySelectorAll('*')) {
      expect(el.hasAttribute('toolautosubmit')).toBe(false)
    }
  })

  it('documents every named control with a toolparamdescription within budget', () => {
    const form = renderForm()
    const controls = form.querySelectorAll('[name]')
    expect(controls.length).toBeGreaterThanOrEqual(3)
    for (const control of controls) {
      const desc = control.getAttribute('toolparamdescription')
      expect(desc).toBeTruthy()
      expect(desc!.length).toBeLessThanOrEqual(150)
    }
    expect(form.querySelector('[name="student_name"]')).toBeTruthy()
    expect(form.querySelector('[name="what_i_built"]')).toBeTruthy()
    expect(form.querySelector('[name="observed_vs_expected"]')).toBeTruthy()
    expect(form.querySelector('button[type="submit"]')).toBeTruthy()
  })

  it('submitting logs the report, shows a confirmation, resets, and never navigates', () => {
    const form = renderForm()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tanmay' } })
    fireEvent.change(screen.getByLabelText('What I built'), {
      target: { value: 'A series circuit with one battery and one resistor' },
    })
    fireEvent.change(screen.getByLabelText('Observed vs expected'), {
      target: { value: 'The ammeter read 0.02A; I expected 0.03A.' },
    })
    const logBefore = useBenchStore.getState().log.length

    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(useBenchStore.getState().log.length).toBe(logBefore + 1)
    expect(useBenchStore.getState().log.some((e) => e.text.includes('lab report'))).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Report submitted')
    // Fields reset so the next report starts clean.
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
    // The form element itself never left the DOM (no navigation).
    expect(document.querySelector('form.lab-report')).toBe(form)
  })

  it('toggles the .tool-form-live glow mirror only for this tool when events fire', () => {
    const mc = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      registerTool: vi.fn(),
    }
    const doc = document as unknown as Record<string, unknown>
    const saved = doc.modelContext
    doc.modelContext = mc
    try {
      renderForm()
      expect(mc.addEventListener).toHaveBeenCalled()
      const form = document.querySelector('form.lab-report') as HTMLFormElement
      const activate = mc.addEventListener.mock.calls.find((c) => c[0] === 'toolactivated')![1] as (
        e: { toolName?: string },
      ) => void

      activate({ toolName: 'some_other_tool' })
      expect(form.classList.contains('tool-form-live')).toBe(false)
      activate({ toolName: 'submit_lab_report' })
      expect(form.classList.contains('tool-form-live')).toBe(true)
    } finally {
      if (saved !== undefined) doc.modelContext = saved
      else delete doc.modelContext
    }
  })
})
