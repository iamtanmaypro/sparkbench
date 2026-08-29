import { WebMcpBanner } from './ui/WebMcpBanner'
import { WorkbenchPage } from './ui/WorkbenchPage'
import { useBenchTools } from './webmcp/useTool'
import { benchTools } from './webmcp/register'

/**
 * Phase 3 shell: the full workbench plus the live WebMCP tool inventory
 * (reads, navigation, and the approval-gated writes). The banner stays for
 * runtimes without the API; the app is fully usable solo either way.
 */
function App() {
  // benchTools is a module-level array, so this registers once and stays stable.
  useBenchTools(benchTools)

  return (
    <main className="app-shell">
      <WebMcpBanner />
      <WorkbenchPage />
    </main>
  )
}

export default App
