// Timestamped event feed for everything done at this bench, human or agent.
// The canvas tells the collaboration story without narration (Phase 4 will
// style agent entries more distinctly).

import { useBenchStore } from '../store/useBenchStore'

function fmtTime(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export function ActionLog() {
  const log = useBenchStore((s) => s.log)

  return (
    <div className="action-log" aria-label="Action log" role="log">
      <div className="panel-title">Bench log</div>
      {log.length === 0 ? (
        <p className="muted small">Actions at this bench appear here.</p>
      ) : (
        <ul>
          {[...log].reverse().map((e) => (
            <li key={e.id} className={`log-actor-${e.actor.toLowerCase()}`}>
              <span className="log-time">{fmtTime(e.at)}</span>
              <span className="log-actor">{e.actor}</span> {e.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
