/**
 * neip currency — Currency management commands.
 *
 * Commands:
 *   neip currency list            — GET  /api/v1/currencies
 *   neip currency create          — POST /api/v1/currencies (interactive)
 *   neip currency rate            — GET  /api/v1/currencies/rates
 *   neip currency convert         — GET  /api/v1/currencies/convert
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

export function buildCurrencyCommand(): Command {
  const cmd = new Command('currency')
    .description('จัดการสกุลเงิน — Currency management')
    .addHelpText('after', `
Examples:
  $ neip currency list                         # แสดงสกุลเงินทั้งหมด
  $ neip currency create                       # สร้างสกุลเงิน (interactive)
  $ neip currency rate --from USD --to THB     # ดูอัตราแลกเปลี่ยน
  $ neip currency convert --from USD --to THB --amount 100  # แปลงค่าเงิน
  `);

  cmd.command('list')
    .description('แสดงสกุลเงินทั้งหมด — List currencies')
    .action(async () => {
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/currencies');
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} currencies`);
    });

  cmd.command('create')
    .description('สร้างสกุลเงิน (interactive) — Create a currency')
    .action(async () => {
      process.stdout.write('Create a new currency.\n');
      const code = await prompt('Currency code (e.g. USD): ');
      const name = await prompt('Name (e.g. US Dollar): ');
      const symbol = await prompt('Symbol (e.g. $): ');
      const decimalPlaces = await prompt('Decimal places [2]: ');

      const result = await api.post<{ data: unknown }>('/api/v1/currencies', {
        code: code.toUpperCase(),
        name,
        symbol,
        decimalPlaces: parseInt(decimalPlaces || '2', 10),
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Currency ${code.toUpperCase()} created.`);
    });

  cmd.command('rate')
    .description('ดูอัตราแลกเปลี่ยน — Get exchange rate')
    .requiredOption('--from <currency>', 'สกุลเงินต้นทาง — Source currency code')
    .requiredOption('--to <currency>', 'สกุลเงินปลายทาง — Target currency code')
    .option('--date <date>', 'วันที่ (YYYY-MM-DD) — Rate date')
    .action(async (opts: { from: string; to: string; date?: string }) => {
      const params: Record<string, string> = { from: opts.from.toUpperCase(), to: opts.to.toUpperCase() };
      if (opts.date) params['date'] = opts.date;
      const result = await api.get<{ data: unknown }>('/api/v1/currencies/rates', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Exchange rate ${opts.from.toUpperCase()} → ${opts.to.toUpperCase()}:`);
    });

  cmd.command('convert')
    .description('แปลงค่าเงิน — Convert amount between currencies')
    .requiredOption('--from <currency>', 'สกุลเงินต้นทาง — Source currency')
    .requiredOption('--to <currency>', 'สกุลเงินปลายทาง — Target currency')
    .requiredOption('--amount <amount>', 'จำนวนเงิน — Amount to convert')
    .option('--date <date>', 'วันที่ (YYYY-MM-DD) — Rate date')
    .action(async (opts: { from: string; to: string; amount: string; date?: string }) => {
      const params: Record<string, string> = {
        from: opts.from.toUpperCase(),
        to: opts.to.toUpperCase(),
        amount: opts.amount,
      };
      if (opts.date) params['date'] = opts.date;
      const result = await api.get<{ data: unknown }>('/api/v1/currencies/convert', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Conversion result:`);
    });

  return cmd;
}
