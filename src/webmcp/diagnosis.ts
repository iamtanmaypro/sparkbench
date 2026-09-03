// run_diagnosis — the guided-fault tool, registered only in lessons 4+ by the
// dynamic toolset (toolsets.ts). This is the toolset-change proof: the agent
// literally cannot see this tool until the student reaches the
// diagnose-the-fault lesson, because it is absent from the model context
// before then.
//
// It is a diagnosis, not a write: faults are exactly what it is for, so it
// never returns needs_human — it reports the fault list, jumps the canvas to
// the first suspect part (the same requestFocus action focus_component uses),
// and hands the agent an ordered probe list to walk the student through.

import type { ToolDefinition, ModelContextToolCallOptions } from './model-context'
import { useBenchStore } from '../store/useBenchStore'
import { lessonIndex } from '../lessons'
import { noParams } from './schemas'
import { aborted, ABORTED, boundedOutput } from './output'

/** Lessons are 1-indexed for humans; index 3 is lesson 4 (diagnose-fault). */
const FIRST_DIAGNOSIS_INDEX = 3

export const runDiagnosisTool: ToolDefinition = {
  name: 'run_diagnosis',
  description:
    'Start guided fault diagnosis: the canvas jumps to the first suspect part and you get an ordered probe list naming what to check, what is wrong, and the fix to suggest. The screen shows a symptom; this returns the cause and the readings that prove it. Use it when the student asks why their circuit misbehaves or a meter reads zero.',
  annotations: {
    // Drives visible UI (focus/highlight), never circuit data.
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: noParams,
  execute(_args: Record<string, unknown>, context: ModelContextToolCallOptions) {
    if (aborted(context)) return ABORTED
    const s = useBenchStore.getState()
    // Defensive gate: the toolset only registers this in lessons 4+, but a
    // call racing a lesson switch (stale registration) must not run elsewhere.
    if (lessonIndex(s.currentLessonId) < FIRST_DIAGNOSIS_INDEX) {
      return {
        status: 'error',
        message: 'Guided diagnosis is only available in the diagnose-the-fault and free-build lessons.',
      }
    }
    s.logEvent('Agent', 'started a guided fault diagnosis')
    if (s.faults.length === 0) {
      return {
        status: 'ok',
        faults_found: 0,
        message: !s.solution.ok && s.components.length > 0
          ? 'No named faults, but the bench cannot be solved as wired. Walk the loop from each battery terminal with the student to find the contradictory wiring.'
          : 'No faults detected on this bench. If the student still sees a problem, ask them to walk you through the wiring.',
      }
    }
    const probes = s.faults.map((f) => ({
      probe: f.element,
      kind: f.kind,
      context: f.context,
      suggestion: f.suggestion,
    }))
    const first = s.faults[0]!
    const onBench = s.components.some((c) => c.id === first.element)
    if (onBench) s.requestFocus(first.element)
    return boundedOutput(
      {
        status: 'ok',
        faults_found: s.faults.length,
        focused: onBench ? first.element : undefined,
        note: 'Probes are ordered; walk the student through them one at a time and focus_component the next probe when they are ready.',
      },
      { key: 'probes', items: probes },
    )
  },
}

/** Appended to benchTools so budgets.test.ts lints it with everything else. */
export const diagnosisTools: ToolDefinition[] = [runDiagnosisTool]
