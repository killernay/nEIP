/**
 * neip positions — Position / Org structure management commands.
 *
 * Commands:
 *   neip positions list          — GET  /api/v1/positions
 *   neip positions create        — POST /api/v1/positions (interactive)
 *   neip positions org-tree      — GET  /api/v1/positions/org-tree
 */

import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

export function buildPositionsCommand(): Command {
  const cmd = new Command('positions')
    .description('จัดการตำแหน่งและผังองค์กร — Position and org structure management')
    .addHelpText('after', `
Examples:
  $ neip positions list                        # แสดงตำแหน่งทั้งหมด
  $ neip positions create                      # สร้างตำแหน่ง (interactive)
  $ neip positions org-tree                    # แสดงผังองค์กร
  `);

  cmd.command('list')
    .description('แสดงตำแหน่งทั้งหมด — List positions')
    .option('--department <deptId>', 'กรองตามแผนก — Filter by department')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { department?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.department) params['departmentId'] = opts.department;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/positions', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} positions`);
    });

  cmd.command('create')
    .description('สร้างตำแหน่ง (interactive) — Create a position')
    .action(async () => {
      process.stdout.write('Create a new position.\n');
      const title = await prompt('Position title: ');
      const departmentId = await prompt('Department ID: ');
      const reportsTo = await prompt('Reports to position ID (optional): ');
      const level = await prompt('Level (1-10) [5]: ');

      const body: Record<string, unknown> = {
        title,
        departmentId,
        level: parseInt(level || '5', 10),
      };
      if (reportsTo) body['reportsToId'] = reportsTo;

      const result = await api.post<{ data: unknown }>('/api/v1/positions', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Position created.');
    });

  cmd.command('org-tree')
    .description('แสดงผังองค์กร — Show organization tree')
    .option('--department <deptId>', 'แสดงเฉพาะแผนก — Filter by department')
    .action(async (opts: { department?: string }) => {
      const params: Record<string, string> = {};
      if (opts.department) params['departmentId'] = opts.department;
      const result = await api.get<{ data: unknown }>('/api/v1/positions/org-tree', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Organization tree:');
    });

  return cmd;
}
