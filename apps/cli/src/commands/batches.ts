/**
 * neip batch — Batch / lot tracking commands.
 *
 * Commands:
 *   neip batch list              — GET  /api/v1/batches
 *   neip batch create            — POST /api/v1/batches (interactive)
 *   neip batch trace <id>        — GET  /api/v1/batches/:id/trace
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

export function buildBatchCommand(): Command {
  const cmd = new Command('batch')
    .description('จัดการ batch / lot tracking — Batch and lot tracking')
    .addHelpText('after', `
Examples:
  $ neip batch list                            # แสดง batch ทั้งหมด
  $ neip batch list --product <id>             # กรองตามสินค้า
  $ neip batch create                          # สร้าง batch (interactive)
  $ neip batch trace <id>                      # ติดตาม batch
  `);

  cmd.command('list')
    .description('แสดง batch ทั้งหมด — List batches')
    .option('--product <productId>', 'กรองตามสินค้า — Filter by product')
    .option('--status <status>', 'กรองตามสถานะ: active/expired/recalled — Filter by status')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { product?: string; status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.product) params['productId'] = opts.product;
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/batches', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} batches`);
    });

  cmd.command('create')
    .description('สร้าง batch (interactive) — Create a batch')
    .action(async () => {
      process.stdout.write('Create a new batch.\n');
      const productId = await prompt('Product ID: ');
      const batchNumber = await prompt('Batch number: ');
      const manufacturedDate = await prompt('Manufactured date (YYYY-MM-DD): ');
      const expiryDate = await prompt('Expiry date (YYYY-MM-DD, optional): ');

      const body: Record<string, unknown> = { productId, batchNumber, manufacturedDate };
      if (expiryDate) body['expiryDate'] = expiryDate;

      const result = await api.post<{ data: unknown }>('/api/v1/batches', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Batch ${batchNumber} created.`);
    });

  cmd.command('trace <id>')
    .description('ติดตาม batch — Trace batch movements and usage')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/batches/${id}/trace`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Batch ${id} trace:`);
    });

  return cmd;
}
