// Empty-state hint panel (PLAN §4.3): three example prompts to try with the
// agent. Doubles as the judges' testing instructions. The same three prompts
// are the Gate-2 probe prompts (tool-description iteration targets), so what
// a visitor sees on the canvas is exactly what the app was tuned for.
//
// Rendered twice with one component: as a centered canvas overlay while the
// bench is empty (the true empty state) and compact in the log rail, so the
// prompts are visible even on a seeded lesson bench.

import { useState } from 'react'

// Prompts are chosen so the screen CANNOT answer them: exact solver numbers,
// a mutation that needs approval, and a cause-with-evidence diagnosis. A
// hybrid agent (ChatGPT's in-app browser can both see the page and call our
// tools) takes the cheapest path, so a "what do you see" prompt gets answered
// from the rendered canvas and no tool ever runs. Ask for what only the tools
// return and the tool path wins on merit.
// Each prompt needs a tool the screen cannot substitute for: a rewire (the
// canvas has no DOM affordance to drag a wire), a closed loop of place ->
// measure -> adjust against solver ground truth, and a cause-with-evidence
// diagnosis. A "what do you see" prompt gets answered from the canvas and
// runs no tool at all, which is correct hybrid-agent behavior, so we do not
// advertise one.
export const EXAMPLE_PROMPTS = [
  'Rewire this so both bulbs are bright, and ask me before each change',
  'Open free build and make a voltage divider that outputs exactly 1.00 V',
  'Open lesson 4 and diagnose the dead part from the readings',
] as const

export function HintPanel({ variant = 'rail' }: { variant?: 'rail' | 'canvas' }) {
  // "Copied" feedback must also work where the Clipboard API is missing or
  // rejected (http origins, older runtimes), so the write is best-effort and
  // the fallback simply still confirms the pick.
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  function copyPrompt(text: string, idx: number): void {
    try {
      // Best-effort: happy-dom and some runtimes have no clipboard; the
      // copied feedback is still shown because the prompt is right there.
      void navigator.clipboard?.writeText(text).catch(() => {})
    } catch {
      // No clipboard API: ignore, the prompt text stays visible for manual copy.
    }
    setCopiedIdx(idx)
  }

  return (
    <section
      className={`hint-panel hint-panel-${variant}`}
      aria-label={
        variant === 'canvas'
          ? 'Getting started: prompts to try with your agent'
          : 'Prompts to try with your agent'
      }
    >
      <div className="panel-title">
        {variant === 'canvas' ? 'Your AI lab partner is listening' : 'Try asking your agent'}
      </div>
      <ul className="prompt-list">
        {EXAMPLE_PROMPTS.map((p, i) => (
          <li key={p}>
            <button
              type="button"
              className="prompt-btn"
              onClick={() => copyPrompt(p, i)}
              aria-label={`Copy prompt: ${p}`}
            >
              <span className="prompt-text">{p}</span>
              <span className="prompt-copy" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 12 12">
                  <rect x="4" y="4" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M8 4V3a1.2 1.2 0 0 0-1.2-1.2H3A1.2 1.2 0 0 0 1.8 3v3.8A1.2 1.2 0 0 0 3 8h1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
                {copiedIdx === i ? 'copied' : 'copy'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small" role="status">
        {copiedIdx !== null ? 'Prompt copied. Paste it into your agent.' : 'Click a prompt to copy it for your agent.'}
      </p>
      <p className="muted small agent-tip">
        Agent tip: this bench exposes WebMCP tools. The canvas is a rendered
        simulation, so ask for exact readings or for changes and your agent
        will call the tools instead of reading the screen.
      </p>
    </section>
  )
}
