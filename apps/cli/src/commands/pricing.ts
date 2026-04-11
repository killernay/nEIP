/**
 * neip pricing — Price List management commands.
 *
 * Commands:
 *   neip pricing list             — GET  /api/v1/price-lists
 *   neip pricing create           — POST /api/v1/price-lists (interactive)
 *   neip pricing resolve          — GET  /api/v1/pricing/resolve
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

export function buildPricingCommand(): Command {
  const cmd = new Command('pricing')
    .description('จัดการราคาสินค้า — Price list and pricing management')
    .addHelpText('after', `
Examples:
  $ neip pricing list                          # แสดง price lists ทั้งหมด
  $ neip pricing create                        # สร้าง price list (interactive)
  $ neip pricing resolve --product <id> --customer <id>  # หาราคาที่ใช้ได้
  `);

  cmd.command('list')
    .description('แสดง price lists ทั้งหมด — List price lists')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { limit: string }) => {
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/price-lists', { limit: opts.limit });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} price lists`);
    });

  cmd.command('create')
    .description('สร้าง price list (interactive) — Create a price list')
    .action(async () => {
      process.stdout.write('Create a new price list.\n');
      const name = await prompt('Name: ');
      const currency = await prompt('Currency [THB]: ');
      const validFrom = await prompt('Valid from (YYYY-MM-DD): ');
      const validTo = await prompt('Valid to (YYYY-MM-DD, optional): ');

      const body: Record<string, unknown> = { name, currency: currency || 'THB', validFrom };
      if (validTo) body['validTo'] = validTo;

      const result = await api.post<{ data: unknown }>('/api/v1/price-lists', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Price list created.');
    });

  cmd.command('resolve')
    .description('หาราคาที่ใช้ได้สำหรับสินค้า — Resolve effective price for a product')
    .requiredOption('--product <productId>', 'รหัสสินค้า — Product ID')
    .option('--customer <customerId>', 'รหัสลูกค้า — Customer ID')
    .option('--quantity <qty>', 'จำนวน — Quantity', '1')
    .option('--date <date>', 'วันที่ (YYYY-MM-DD) — Effective date')
    .action(async (opts: { product: string; customer?: string; quantity: string; date?: string }) => {
      const params: Record<string, string> = { productId: opts.product, quantity: opts.quantity };
      if (opts.customer) params['customerId'] = opts.customer;
      if (opts.date) params['date'] = opts.date;
      const result = await api.get<{ data: unknown }>('/api/v1/pricing/resolve', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Resolved price:');
    });

  return cmd;
}
