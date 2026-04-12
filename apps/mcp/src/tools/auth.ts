import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall, setAuthToken } from '../api.js';

export function registerAuthTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: auth_login
  // ---------------------------------------------------------------------------

  server.tool(
    'auth_login',
    'เข้าสู่ระบบ nEIP — Login and get JWT token',
    {
      email: z.string().describe('Email address'),
      password: z.string().describe('Password'),
    },
    async ({ email, password }) => {
      // WARNING: password is passed in plaintext. Prefer setting NEIP_TOKEN env var
      // for non-interactive use to avoid credentials appearing in MCP request logs.
      try {
        const data = await apiCall<{ accessToken: string }>('POST', '/auth/login', { email, password });
        setAuthToken(data.accessToken);
        return { content: [{ type: 'text' as const, text: `Login successful. Token set.` }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Login failed: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
