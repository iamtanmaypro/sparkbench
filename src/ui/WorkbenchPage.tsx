// App shell: the 56px top bar (engraved brand, lesson tagline, fault strip,
// agent chip) above the full three-zone bench. The rails live inside the
// Workbench grid (DESIGN.md 5): left 280px Lessons + Palette, right 300px
// Inspector + Lab Report + Action Log, canvas hero in between.

import { AgentChip } from './AgentChip'
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
      </div>
    </div>
  )
}
