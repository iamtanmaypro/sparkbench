// Timestamped event feed for everything done at this bench, human or agent.
// The canvas tells the collaboration story without narration. Rows are mono
// with a copper dot for agent entries, slate for human, signal for bench
// events; approval rows get a bold verb (DESIGN.md 4).

import { useBenchStore } from '../store/useBenchStore'

function fmtTime(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/** Approval decisions carry the verb, so it is set in bold weight. */
function LogText({ text }: { text: string }) {
  const match = /^(approved|rejected)\b/.exec(text)
  if (!match?.[1]) return <span className="log-text">{text}</span>
  return (
    <span className="log-text">
      <strong>{match[1]}</strong>
      {text.slice(match[1].length)}
    </span>
  )
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
              <span className="log-dot" aria-hidden="true" />
              <span className="log-time">{fmtTime(e.at)}</span>
              <span className="log-actor">{e.actor}</span>
              <LogText text={e.text} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
