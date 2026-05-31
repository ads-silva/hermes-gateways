import { z } from 'zod'

/**
 * Tool registry — the execution layer.
 *
 * Security contract (see README "Prompt injection"):
 *   LLM  →  structured intent  →  zod validation  →  execution
 *
 * The LLM never executes anything directly. It can only *name* a tool and
 * *propose* arguments. Arguments are validated against the tool's zod schema
 * before `execute` runs. Never wire an LLM directly to a shell, eval, or any
 * unchecked side effect.
 */

export type ToolDefinition<Schema extends z.ZodTypeAny> = {
  name: string
  description: string
  schema: Schema
  execute: (input: z.infer<Schema>) => Promise<unknown>
}

export function defineTool<Schema extends z.ZodTypeAny>(
  tool: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return tool
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools = new Map<string, ToolDefinition<any>>()

export function registerTool<Schema extends z.ZodTypeAny>(
  tool: ToolDefinition<Schema>,
): void {
  if (tools.has(tool.name)) {
    throw new Error(`Tool already registered: ${tool.name}`)
  }
  tools.set(tool.name, tool)
}

export function listTools(): { name: string; description: string }[] {
  return [...tools.values()].map(({ name, description }) => ({
    name,
    description,
  }))
}

/**
 * Run a tool by name with untrusted arguments. Arguments are validated
 * against the tool's schema before execution — invalid input throws.
 */
export async function runTool(
  name: string,
  rawInput: unknown,
): Promise<unknown> {
  const tool = tools.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  const input = tool.schema.parse(rawInput)
  return tool.execute(input)
}

// ---------------------------------------------------------------------------
// Example tool — illustrates the validation pattern. Remove or replace.
// ---------------------------------------------------------------------------

const echoTool = defineTool({
  name: 'echo',
  description: 'Echoes back a short message. Example tool.',
  schema: z.object({
    query: z.string().max(500),
  }),
  execute: async ({ query }) => ({ echo: query }),
})

registerTool(echoTool)
