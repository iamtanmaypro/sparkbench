// App shell for Phase 2: header with agent chip, the React Flow workbench,
// and the bench log. WebMCP tools land in later phases and will wrap exactly
// these store actions.

import { AgentChip } from './AgentChip'
import { ActionLog } from './ActionLog'
import { HintPanel } from './HintPanel'
import { LabReportForm } from './LabReportForm'
import { Workbench } from './Workbench'
import { useBenchStore } from '../store/useBenchStore'

export function WorkbenchPage() {
  const faults = useBenchStore((s) => s.faults)

  return (
    <div className="app-frame">
      <header className="topbar">
        <h1 className="brand">Sparkbench</h1>
        <span className="tagline">build circuits, with your AI lab partner</span>
        {faults.length > 0 && (
          <span className="fault-banner" role="alert">
            {faults[0]!.context}
          </span>
        )}
        <AgentChip />
      </header>
      <div className="workbench-row">
        <Workbench />
        <aside className="log-rail" aria-label="Bench log, prompts, and lab report">
          <ActionLog />
          <HintPanel />
          <LabReportForm />
        </aside>
      </div>
    </div>
  )
}
