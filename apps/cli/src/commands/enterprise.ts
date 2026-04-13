/**
 * neip enterprise — Enterprise Structure commands.
 *
 * Commands:
 *   neip enterprise branches list     — GET  /api/v1/branches
 *   neip enterprise branches get <id> — GET  /api/v1/branches/:id
 *   neip enterprise structure         — GET  /api/v1/enterprise-structure
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildEnterpriseCommand(): Command {
  const cmd = new Command('enterprise')
    .description('โครงสร้างองค์กร — Enterprise Structure')
    .addHelpText('after', `
Examples:
  $ neip enterprise branches list                  # ดูสาขา
  $ neip enterprise structure                      # ดูโครงสร้างองค์กร
  `);

  const branches = cmd.command('branches').description('สาขา — Branches');

  branches.command('list')
    .description('ดูสาขา — List branches')
    .option('--limit <n>', 'Max results', '50')
    .action(async (opts: { limit: string }) => {
      const result = await api.get<{ data: unknown[] }>('/api/v1/branches', { limit: opts.limit });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Branches');
    });

  branches.command('get')
    .description('ดูรายละเอียดสาขา — Get branch detail')
    .argument('<id>', 'Branch ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/branches/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Branch detail');
    });

  cmd.command('structure')
    .description('ดูโครงสร้างองค์กร — View enterprise structure')
    .action(async () => {
      const result = await api.get<{ data: unknown }>('/api/v1/enterprise-structure');
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Enterprise structure');
    });

  return cmd;
}
