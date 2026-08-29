import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
