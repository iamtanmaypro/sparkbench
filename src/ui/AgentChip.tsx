// Agent identity chip. Shows the lab partner's presence and goes "active"
// while a tool executes (Phase 3 tools will call setAgentActive around work).

import { useBenchStore } from '../store/useBenchStore'

export function AgentChip() {
  const active = useBenchStore((s) => s.agentActive)
  return (
    <div
      className={`agent-chip ${active ? 'active' : ''}`}
      role="status"
      aria-label={active ? 'Agent is working' : 'Agent is idle'}
    >
      <span className={`agent-dot ${active ? 'active' : ''}`} aria-hidden="true" />
      Lab partner: <strong>your agent</strong>
      {active && <span className="agent-status">working…</span>}
    </div>
  )
}
