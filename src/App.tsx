import { WebMcpBanner } from './ui/WebMcpBanner'

/**
 * Phase 0 placeholder shell. The React Flow workbench lands in Phase 2;
 * this page exists so the deployed dummy tool has a real origin to live on.
 */
function App() {
  return (
    <main className="app-shell">
      <WebMcpBanner />
      <h1>Sparkbench</h1>
      <p>
        A browser electronics lab where your AI agent works as your lab partner
        through WebMCP. The full workbench is being wired up; if you are seeing
        this from an agent runtime, try calling the ping_workbench tool to
        confirm the connection works.
      </p>
    </main>
  )
}

export default App
