/**
 * Shared helper to wrap MCP tool handlers with consistent
 * try/catch, JSON.stringify, and error formatting.
 *
 * Story: L-3 AI — DRY pattern for tool handlers.
 */

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

/**
 * Wraps an async tool handler so that:
 *   - On success: returns `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
 *   - On error:   returns `{ content: [{ type: 'text', text: 'Error: ...' }], isError: true }`
 */
export function wrapTool<T>(
  fn: (args: T) => Promise<Record<string, unknown>>,
): (args: T) => Promise<ToolResult> {
  return async (args: T): Promise<ToolResult> => {
    try {
      const data = await fn(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
    }
  };
}
