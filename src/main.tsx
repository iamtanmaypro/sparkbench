import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// React Flow's base styles MUST load before our index.css so our overrides win.
// Without it the pane collapses to zero width, handles render inline (wiring
// and hit-testing break), and pan/zoom silently do nothing.
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { useBenchStore } from './store/useBenchStore'

// Dev/test probe: lets browser automation drive the same store actions the UI
// uses instead of synthesizing fragile pointer events on canvas internals.
;(globalThis as Record<string, unknown>).sparkbench = { store: useBenchStore }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
