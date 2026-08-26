import { useState } from 'react'
import { useTool } from '../webmcp/useTool'
import { pingTool } from '../webmcp/register'

/**
 * Registers the dummy tool when WebMCP exists; renders a dismissible banner
 * when it does not. The app stays fully usable solo either way (Stage-1
 * viability): the banner is a hint, not a blocker.
 */
export function WebMcpBanner() {
  const webmcpAvailable = useTool(pingTool)
  const [dismissed, setDismissed] = useState(false)

  if (webmcpAvailable || dismissed) return null

  return (
    <div className="webmcp-banner" role="status">
      <p>
        This lab works best with an AI agent as your lab partner. Open it in
        ChatGPT's browser, or in Chrome with WebMCP enabled (flag or origin
        trial). See the README for steps. You can still build circuits solo.
      </p>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss WebMCP hint">
        Dismiss
      </button>
    </div>
  )
}
