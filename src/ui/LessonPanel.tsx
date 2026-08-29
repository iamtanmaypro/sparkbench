// Lesson panel: numbered lesson rows (01-05) with status glyphs, the goal,
// progression controls, progressive hints, and live predicate feedback.
// Everything here reads the store; nothing mutates except through its buttons.

import { lessons } from '../lessons'
import { useCurrentLesson, useBenchStore } from '../store/useBenchStore'

type RowState = 'done' | 'active' | 'todo'

/** Non-color status cue (DESIGN.md 8: no color-only meaning). */
function StatusGlyph({ state }: { state: RowState }) {
  if (state === 'done') {
    return (
      <svg className="lesson-glyph" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5.4" fill="var(--signal)" />
        <path
          d="M3.6 6.3l1.7 1.7 3.1-3.7"
          fill="none"
          stroke="var(--surface)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (state === 'active') {
    return (
      <svg className="lesson-glyph" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5.4" fill="none" stroke="var(--spark)" strokeWidth="1.5" />
        <path d="M6 0.6 A5.4 5.4 0 0 1 6 11.4 Z" fill="var(--spark)" />
      </svg>
    )
  }
  return (
    <svg className="lesson-glyph" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="5.4" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
    </svg>
  )
}

export function LessonPanel() {
  const lesson = useCurrentLesson()
  const currentId = useBenchStore((s) => s.currentLessonId)
  const completed = useBenchStore((s) => s.completedLessonIds)
  const openLesson = useBenchStore((s) => s.openLesson)
  const resetLesson = useBenchStore((s) => s.resetLesson)
  const nextHint = useBenchStore((s) => s.nextHint)
  const hintsShown = useBenchStore((s) => s.hintsShown)
  const predicate = useBenchStore((s) => s.predicate)

  const isComplete = completed.has(currentId)

  return (
    <div className="lesson-panel">
      <div className="panel-title">Lessons</div>
      <nav aria-label="Lesson list" className="lesson-list">
        {lessons.map((l, i) => {
          const done = completed.has(l.id)
          const state: RowState = done ? 'done' : l.id === currentId ? 'active' : 'todo'
          return (
            <button
              key={l.id}
              type="button"
              className={`lesson-tab ${l.id === currentId ? 'active' : ''} ${done ? 'done' : ''}`}
              onClick={() => openLesson(l.id)}
              aria-current={l.id === currentId ? 'true' : undefined}
            >
              <span className="lesson-num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="lesson-name">{l.title.replace(/^Lesson \d+: /, '')}</span>
              <StatusGlyph state={state} />
            </button>
          )
        })}
      </nav>

      <h2 className="lesson-goal-title">{lesson.title}</h2>
      <p className="lesson-goal">{lesson.goal}</p>

      <div className={`predicate-status ${isComplete || predicate.passed ? 'pass' : 'pending'}`} role="status">
        {isComplete || predicate.passed
          ? 'Goal complete. Nice work.'
          : `Still to do: ${predicate.failures[0] ?? 'build the circuit to check'}`}
      </div>

      <div className="hint-row">
        {Array.from({ length: hintsShown }, (_, i) => (
          <p key={i} className="hint">
            Hint {i + 1}: {lesson.hints[i]}
          </p>
        ))}
        {hintsShown < lesson.hints.length && (
          <button type="button" className="ghost-btn" onClick={nextHint}>
            Reveal hint ({hintsShown}/{lesson.hints.length})
          </button>
        )}
      </div>

      <div className="panel-actions">
        <button type="button" className="ghost-btn" onClick={resetLesson}>
          Reset bench
        </button>
      </div>
    </div>
  )
}
