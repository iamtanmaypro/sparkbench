import { WebMcpBanner } from './ui/WebMcpBanner'
import { WorkbenchPage } from './ui/WorkbenchPage'
import { useLessonTools } from './webmcp/useTool'

/**
 * Phase 3 shell: the full workbench plus the live WebMCP tool inventory.
 * Registration is dynamic (provideContext/toolchange): the per-lesson subset
 * re-registers whenever the lesson changes, so the agent's powers follow the
 * student's progress. The banner stays for runtimes without the API; the app
 * is fully usable solo either way.
 */
function App() {
  useLessonTools()

  return (
    <main className="app-shell">
      <WebMcpBanner />
      <WorkbenchPage />
    </main>
  )
}

export default App
