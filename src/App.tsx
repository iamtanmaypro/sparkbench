import { WebMcpBanner } from './ui/WebMcpBanner'
import { WorkbenchPage } from './ui/WorkbenchPage'

/**
 * Phase 2 shell: the full workbench is the product. The WebMCP banner stays
 * for runtimes without the API; the app is fully usable solo either way.
 */
function App() {
  return (
    <main className="app-shell">
      <WebMcpBanner />
      <WorkbenchPage />
    </main>
  )
}

export default App
