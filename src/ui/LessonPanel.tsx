// Lesson panel: goal, progression controls, progressive hints, and live
// predicate feedback. Everything here reads the store; nothing mutates except
// through its buttons.

import { lessons } from '../lessons'
import { useCurrentLesson, useBenchStore } from '../store/useBenchStore'

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
        {lessons.map((l, i) => (
          <button
            key={l.id}
            type="button"
            className={`lesson-tab ${l.id === currentId ? 'active' : ''} ${completed.has(l.id) ? 'done' : ''}`}
            onClick={() => openLesson(l.id)}
            aria-current={l.id === currentId ? 'true' : undefined}
          >
            {completed.has(l.id) ? '✓' : i + 1}. {l.title.replace(/^Lesson \d+: /, '')}
          </button>
        ))}
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
