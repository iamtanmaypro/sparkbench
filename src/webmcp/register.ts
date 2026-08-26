import type { ToolDefinition } from './model-context'

/**
 * Day-1 dummy tool. Its whole job is to prove end-to-end at Gate 1 that
 * registration works in a real agent runtime (ChatGPT in-app browser,
 * Chrome flag/origin-trial profile) before any real circuit tools are built.
 *
 * Budgets apply from day one: name <=30 chars, description <=500.
 */
export const pingTool: ToolDefinition = {
  name: 'ping_workbench',
  description:
    'Health check for the Sparkbench electronics lab. Call this first to confirm you are connected. Returns the app name and a greeting so the student knows their agent can see the workbench.',
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  execute() {
    return {
      app: 'Sparkbench',
      status: 'ok',
      message:
        "Connected to the student's electronics workbench. Circuit tools arrive in later lessons.",
    }
  },
}
