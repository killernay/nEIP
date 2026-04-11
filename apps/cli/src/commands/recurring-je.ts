/**
 * neip recurring-je — Recurring Journal Entry commands.
 *
 * Commands:
 *   neip recurring-je list       — GET  /api/v1/recurring-journal-entries
 *   neip recurring-je create     — POST /api/v1/recurring-journal-entries (interactive)
 *   neip recurring-je run <id>   — POST /api/v1/recurring-journal-entries/:id/run
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

export function buildRecurringJeCommand(): Command {
  const cmd = new Command('recurring-je')
    .description('รายการบัญชีอัตโนมัติ — Recurring journal entry management')
    .addHelpText('after', `
Examples:
  $ neip recurring-je list                    # แสดงรายการ recurring JE ทั้งหมด
  $ neip recurring-je create                  # สร้าง recurring JE (interactive)
  $ neip recurring-je run <id>                # สั่งรัน recurring JE
  `);

  cmd.command('list')
    .description('แสดงรายการ recurring JE ทั้งหมด — List recurring journal entries')
    .option('--status <status>', 'กรองตามสถานะ: active/paused — Filter by status')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/recurring-journal-entries', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} recurring journal entries`);
    });

  cmd.command('create')
    .description('สร้าง recurring JE (interactive) — Create a recurring journal entry')
    .action(async () => {
      process.stdout.write('Create a new recurring journal entry.\n');
      const description = await prompt('Description: ');
      const frequency = await prompt('Frequency (daily/weekly/monthly/yearly) [monthly]: ');
      const startDate = await prompt('Start date (YYYY-MM-DD): ');
      const debitAccount = await prompt('Debit account code: ');
      const creditAccount = await prompt('Credit account code: ');
      const amountStr = await prompt('Amount (THB): ');

      const amount = Math.round(parseFloat(amountStr || '0') * 100);
      const result = await api.post<{ data: unknown }>('/api/v1/recurring-journal-entries', {
        description,
        frequency: frequency || 'monthly',
        startDate,
        lines: [
          { accountCode: debitAccount, debitSatang: String(amount), creditSatang: '0' },
          { accountCode: creditAccount, debitSatang: '0', creditSatang: String(amount) },
        ],
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Recurring journal entry created.');
    });

  cmd.command('run <id>')
    .description('สั่งรัน recurring JE — Execute a recurring journal entry now')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/recurring-journal-entries/${id}/run`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Recurring JE ${id} executed.`);
    });

  return cmd;
}
