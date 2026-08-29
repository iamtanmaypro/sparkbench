// Sticky notes layer. Humans add notes with a button; the future WebMCP
// add_note tool will call the same store action with author "Agent".

import { useEffect, useRef, useState } from 'react'
import { useBenchStore } from '../store/useBenchStore'

export function NotesLayer() {
  const notes = useBenchStore((s) => s.notes)
  const removeNote = useBenchStore((s) => s.removeNote)
  const addNote = useBenchStore((s) => s.addNote)

  if (notes.length === 0) {
    return (
      <button
        type="button"
        className="ghost-btn note-add"
        onClick={() =>
          addNote('New note: double-click to edit is coming; for now select and re-add.', 60 + Math.random() * 80, 60 + Math.random() * 60)
        }
      >
        Add sticky note
      </button>
    )
  }

  return (
    <div className="notes-layer" aria-label="Bench notes">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} onRemove={() => removeNote(n.id)} />
      ))}
      <button
        type="button"
        className="ghost-btn note-add"
        onClick={() => addNote('New note', 60 + Math.random() * 80, 60 + Math.random() * 60)}
      >
        Add sticky note
      </button>
    </div>
  )
}

function NoteCard({
  note,
  onRemove,
}: {
  note: { id: string; text: string; x: number; y: number; author: 'You' | 'Agent' }
  onRemove: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const offsetRef = useRef({ dx: 0, dy: 0 })

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const x = e.clientX - offsetRef.current.dx
      const y = e.clientY - offsetRef.current.dy
      useBenchStore.setState((s) => ({
        notes: s.notes.map((n) => (n.id === note.id ? { ...n, x, y } : n)),
      }))
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, note.id])

  return (
    <div
      className={`note-card author-${note.author.toLowerCase()} ${dragging ? 'dragging' : ''}`}
      style={{ left: note.x, top: note.y }}
      onMouseDown={(e) => {
        offsetRef.current = { dx: e.clientX - note.x, dy: e.clientY - note.y }
        setDragging(true)
      }}
      role="note"
      aria-label={`Sticky note from ${note.author}: ${note.text}`}
    >
      <div className="note-head">
        <span className="note-author">{note.author}</span>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={onRemove} aria-label={`Delete note ${note.id}`} className="note-close">
          ×
        </button>
      </div>
      <p>{note.text}</p>
    </div>
  )
}
