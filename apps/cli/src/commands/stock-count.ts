/**
 * neip stock-count — Physical inventory / stock count commands.
 *
 * Commands:
 *   neip stock-count list        — GET  /api/v1/stock-counts
 *   neip stock-count create      — POST /api/v1/stock-counts (interactive)
 *   neip stock-count post <id>   — POST /api/v1/stock-counts/:id/post
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

export function buildStockCountCommand(): Command {
  const cmd = new Command('stock-count')
    .description('ตรวจนับสินค้าคงคลัง — Physical inventory / stock count')
    .addHelpText('after', `
Examples:
  $ neip stock-count list                      # แสดงการตรวจนับทั้งหมด
  $ neip stock-count create                    # สร้างการตรวจนับ (interactive)
  $ neip stock-count post <id>                 # บันทึกผลตรวจนับ
  `);

  cmd.command('list')
    .description('แสดงการตรวจนับทั้งหมด — List stock counts')
    .option('--status <status>', 'กรองตามสถานะ: draft/in-progress/posted — Filter by status')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/stock-counts', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} stock counts`);
    });

  cmd.command('create')
    .description('สร้างการตรวจนับ (interactive) — Create a stock count')
    .action(async () => {
      process.stdout.write('Create a new stock count.\n');
      const warehouseId = await prompt('Warehouse ID: ');
      const countDate = await prompt('Count date (YYYY-MM-DD): ');
      const description = await prompt('Description: ');

      const result = await api.post<{ data: unknown }>('/api/v1/stock-counts', {
        warehouseId,
        countDate,
        description,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Stock count created.');
    });

  cmd.command('post <id>')
    .description('บันทึกผลตรวจนับ — Post stock count adjustments')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/stock-counts/${id}/post`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Stock count ${id} posted.`);
    });

  return cmd;
}
