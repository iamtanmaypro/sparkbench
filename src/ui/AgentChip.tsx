// Agent identity chip. Shows the lab partner's presence and goes "active"
// while a tool executes: every registered tool's execute is wrapped by
// withAgentPresence (webmcp/presence.ts), which flips agentActive around the
// call, so the chip tracks real execution without tools knowing about it.
// While the agent waits on approval cards, the chip says so too: the
// collaboration story stays readable from the topbar alone.

import { useBenchStore } from '../store/useBenchStore'

export function AgentChip() {
  const active = useBenchStore((s) => s.agentActive)
  const pending = useBenchStore((s) => s.proposals.filter((p) => p.status === 'pending_approval').length)
  const waiting = !active && pending > 0

  return (
    <div
      className={`agent-chip ${active ? 'active' : ''} ${waiting ? 'waiting' : ''}`}
      role="status"
      aria-label={
        active
          ? 'Agent is working'
          : waiting
            ? `Agent is waiting for you: ${pending} proposal${pending === 1 ? '' : 's'} need your approval`
            : 'Agent is idle'
      }
    >
      <span className={`agent-dot ${active ? 'active' : ''}`} aria-hidden="true" />
      Lab partner: <strong>your agent</strong>
      {active && <span className="agent-status">working…</span>}
      {waiting && (
        <span className="agent-status waiting">
          {pending} awaiting your approval
        </span>
      )}
    </div>
  )
}
