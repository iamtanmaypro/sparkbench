// The declarative WebMCP surface (A14): a plain HTML form annotated with
// `toolname`/`tooldescription` so agents can fill it as a tool, with NO
// `toolautosubmit` — the report is the student's own submission, so the
// browser focuses the submit button when the agent finishes filling and the
// HUMAN always presses Submit (the imperative mirror of our approval flow).
//
// index.css styles `:tool-form-active` / `:tool-submit-active` (Chrome's
// pseudo-classes for "the agent is filling this in") with a glow; until a
// runtime ships them, the guarded toolactivated listener below toggles the
// `.tool-form-live` class as a JS mirror so the theater still plays.

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useBenchStore } from '../store/useBenchStore'
import { getModelContext } from '../webmcp/useTool'

const TOOL_NAME = 'submit_lab_report'
// <=500 chars, same budget law as imperative tool descriptions.
const TOOL_DESCRIPTION =
  'Submit the lab report for the current lesson: the student fills in their name, what they built, and what they observed versus what they expected. Fill the fields in for the student, then let them check the form and press Submit themselves; the report is never sent automatically.'

/** What the agent receives back once the human submits (respondWith payload). */
function reportResult(): Record<string, unknown> {
  const s = useBenchStore.getState()
  return { status: 'ok', submitted: true, lesson: s.currentLessonId }
}

export function LabReportForm() {
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const logEvent = useBenchStore((s) => s.logEvent)

  // JS mirror of :tool-form-active for runtimes that fire the events before
  // shipping the pseudo-class. Shapes are still settling in the spec, so
  // everything here is guarded: an event without a matching tool name is a
  // no-op, and runtimes without the listeners are skipped entirely.
  useEffect(() => {
    const mc = getModelContext()
    if (!mc || typeof mc.addEventListener !== 'function') return
    const activate = (e: Event) => {
      const name = (e as { toolName?: unknown }).toolName ?? (e as { name?: unknown }).name
      if (name === TOOL_NAME) formRef.current?.classList.add('tool-form-live')
    }
    const deactivate = () => formRef.current?.classList.remove('tool-form-live')
    mc.addEventListener('toolactivated', activate)
    mc.addEventListener('toolcanceled', deactivate)
    return () => {
      mc.removeEventListener?.('toolactivated', activate)
      mc.removeEventListener?.('toolcanceled', deactivate)
    }
  }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // The SPA never navigates, for a human click or an agent-invoked submit.
    e.preventDefault()
    const native = e.nativeEvent as SubmitEvent & {
      agentInvoked?: boolean
      respondWith?: (p: Promise<unknown>) => void
    }
    if (native.agentInvoked && typeof native.respondWith === 'function') {
      // Declarative API response path: the agent filled the form, the human
      // pressed Submit, and the agent still learns the outcome.
      native.respondWith(Promise.resolve(reportResult()))
    }
    logEvent('You', 'submitted the lab report')
    setSubmitted(true)
    e.currentTarget.reset()
  }

  return (
    <form
      ref={formRef}
      className="lab-report"
      toolname={TOOL_NAME}
      tooldescription={TOOL_DESCRIPTION}
      onSubmit={handleSubmit}
      aria-label="Lab report"
    >
      <div className="panel-title">Lab report</div>
      <p className="lab-report-helper">
        The agent can fill this for you, or type it yourself. Either way, you press Submit.
      </p>
      {submitted && (
        <p className="lab-report-done" role="status">
          Report submitted. Nice work.
        </p>
      )}
      <label>
        Name
        <input
          name="student_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Your name"
          toolparamdescription="The student's name for the report header."
        />
      </label>
      <label>
        What I built
        <textarea
          name="what_i_built"
          required
          placeholder="What did you build today?"
          rows={2}
          toolparamdescription="A short description of the circuit the student built in this lesson."
        />
      </label>
      <label>
        Observed vs expected
        <textarea
          name="observed_vs_expected"
          required
          placeholder="What did you expect vs what happened?"
          rows={2}
          toolparamdescription="What the measurements showed versus what the student expected to happen."
        />
      </label>
      <button type="submit">Submit report</button>
    </form>
  )
}
