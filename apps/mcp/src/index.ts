#!/usr/bin/env node
/**
 * nEIP MCP Server — Model Context Protocol for AI integration.
 *
 * Exposes nEIP ERP data and operations as MCP tools that AI agents
 * (Claude Desktop, Cursor, etc.) can call directly.
 *
 * Transport: stdio (standard MCP transport)
 * Auth: Uses the same REST API with JWT token
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAuthTools } from './tools/auth.js';
import { registerListTools } from './tools/list.js';
import { registerCreateTools } from './tools/create.js';
import { registerActionTools } from './tools/action.js';
import { registerReportTools } from './tools/report.js';
import { registerTradeTools } from './tools/trade.js';

const server = new McpServer({
  name: 'neip-erp',
  version: '1.0.0',
});

registerAuthTools(server);
registerListTools(server);
registerCreateTools(server);
registerActionTools(server);
registerReportTools(server);
registerTradeTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('nEIP MCP Server running on stdio');
}

main().catch((err) => {
  console.error('MCP Server error:', err);
  process.exit(1);
});
