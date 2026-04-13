/**
 * neip revenue — Revenue Recognition commands (RA / IFRS 15).
 *
 * Commands:
 *   neip revenue contracts list              — GET  /api/v1/revenue-contracts
 *   neip revenue contracts get <id>          — GET  /api/v1/revenue-contracts/:id
 *   neip revenue contracts create            — POST /api/v1/revenue-contracts
 *   neip revenue recognize <id>              — POST /api/v1/revenue-contracts/:id/recognize
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildRevenueCommand(): Command {
  const cmd = new Command('revenue')
    .description('การรับรู้รายได้ — Revenue Recognition (RA / IFRS 15)')
    .addHelpText('after', `
Examples:
  $ neip revenue contracts list                    # ดูสัญญารายรับ
  $ neip revenue contracts get <id>                # ดูรายละเอียดสัญญา
  $ neip revenue recognize <id> --obligation <oid> # รับรู้รายได้
  `);

  const contracts = cmd.command('contracts').description('สัญญารายรับ — Revenue contracts');

  contracts.command('list')
    .description('ดูสัญญารายรับ — List revenue contracts')
    .option('--status <status>', 'Filter: draft, active, fulfilled, terminated')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/revenue-contracts', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Revenue contracts');
    });

  contracts.command('get')
    .description('ดูรายละเอียดสัญญา — Get revenue contract detail')
    .argument('<id>', 'Revenue contract ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/revenue-contracts/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Revenue contract detail');
    });

  contracts.command('create')
    .description('สร้างสัญญารายรับ — Create a revenue contract')
    .requiredOption('--customer <id>', 'Customer ID')
    .requiredOption('--date <date>', 'Contract date (YYYY-MM-DD)')
    .action(async (opts: { customer: string; date: string }) => {
      const result = await api.post<{ data: unknown }>('/api/v1/revenue-contracts', {
        customerId: opts.customer, contractDate: opts.date, obligations: [],
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Revenue contract created');
    });

  cmd.command('recognize')
    .description('รับรู้รายได้ — Recognize revenue for an obligation')
    .argument('<id>', 'Revenue contract ID')
    .requiredOption('--obligation <oid>', 'Performance obligation ID')
    .option('--amount <satang>', 'Amount to recognize in satang')
    .option('--date <date>', 'Recognition date (YYYY-MM-DD)')
    .action(async (id: string, opts: { obligation: string; amount?: string; date?: string }) => {
      const body: Record<string, unknown> = { obligationId: opts.obligation };
      if (opts.amount) body['amountSatang'] = opts.amount;
      if (opts.date) body['recognitionDate'] = opts.date;
      const result = await api.post<{ data: unknown }>(`/api/v1/revenue-contracts/${id}/recognize`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Revenue recognized');
    });

  return cmd;
}
