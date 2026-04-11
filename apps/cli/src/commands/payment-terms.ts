/**
 * neip payment-terms — Payment Terms management commands.
 *
 * Commands:
 *   neip payment-terms list       — GET  /api/v1/payment-terms
 *   neip payment-terms create     — POST /api/v1/payment-terms (interactive)
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

export function buildPaymentTermsCommand(): Command {
  const cmd = new Command('payment-terms')
    .description('จัดการเงื่อนไขการชำระเงิน — Payment terms management')
    .addHelpText('after', `
Examples:
  $ neip payment-terms list                    # แสดงเงื่อนไขทั้งหมด
  $ neip payment-terms create                  # สร้างเงื่อนไข (interactive)
  `);

  cmd.command('list')
    .description('แสดงเงื่อนไขการชำระทั้งหมด — List payment terms')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { limit: string }) => {
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/payment-terms', { limit: opts.limit });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} payment terms`);
    });

  cmd.command('create')
    .description('สร้างเงื่อนไขการชำระ (interactive) — Create payment terms')
    .action(async () => {
      process.stdout.write('Create new payment terms.\n');
      const name = await prompt('Name (e.g. Net 30): ');
      const dueDays = await prompt('Due days [30]: ');
      const discountPercent = await prompt('Early payment discount % [0]: ');
      const discountDays = await prompt('Discount within days [0]: ');

      const result = await api.post<{ data: unknown }>('/api/v1/payment-terms', {
        name,
        dueDays: parseInt(dueDays || '30', 10),
        discountPercent: parseFloat(discountPercent || '0'),
        discountDays: parseInt(discountDays || '0', 10),
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Payment terms created.');
    });

  return cmd;
}
