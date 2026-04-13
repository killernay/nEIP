/**
 * neip leases — Lease Management commands (RE-FX / IFRS 16).
 *
 * Commands:
 *   neip leases list                — GET  /api/v1/lease-contracts
 *   neip leases get <id>            — GET  /api/v1/lease-contracts/:id
 *   neip leases create              — POST /api/v1/lease-contracts
 *   neip leases activate <id>       — POST /api/v1/lease-contracts/:id/activate
 *   neip leases post-monthly <id>   — POST /api/v1/lease-contracts/:id/post-monthly
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildLeasesCommand(): Command {
  const cmd = new Command('leases')
    .description('สัญญาเช่า — Lease Management (RE-FX / IFRS 16)')
    .addHelpText('after', `
Examples:
  $ neip leases list                               # ดูสัญญาเช่า
  $ neip leases create --lessor "ABC" --asset "Office" --start 2026-01-01 --end 2028-12-31 --rent 5000000
  $ neip leases activate <id>                      # เปิดใช้สัญญา
  $ neip leases post-monthly <id>                  # บันทึกค่าเช่ารายเดือน
  `);

  cmd.command('list')
    .description('ดูสัญญาเช่า — List lease contracts')
    .option('--status <status>', 'Filter: draft, active, expired, terminated')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/lease-contracts', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Lease contracts');
    });

  cmd.command('get')
    .description('ดูรายละเอียดสัญญาเช่า — Get lease contract detail')
    .argument('<id>', 'Lease contract ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/lease-contracts/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Lease contract detail');
    });

  cmd.command('create')
    .description('สร้างสัญญาเช่า — Create a lease contract')
    .requiredOption('--lessor <name>', 'Lessor name')
    .requiredOption('--asset <desc>', 'Leased asset description')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .requiredOption('--rent <satang>', 'Monthly rent in satang')
    .option('--rate <percent>', 'Incremental borrowing rate (%)')
    .action(async (opts: { lessor: string; asset: string; start: string; end: string; rent: string; rate?: string }) => {
      const body: Record<string, unknown> = {
        lessorName: opts.lessor, assetDescription: opts.asset,
        startDate: opts.start, endDate: opts.end, monthlyRentSatang: opts.rent,
      };
      if (opts.rate) body['discountRate'] = Number(opts.rate);
      const result = await api.post<{ data: unknown }>('/api/v1/lease-contracts', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Lease contract created');
    });

  cmd.command('activate')
    .description('เปิดใช้สัญญาเช่า — Activate a lease contract')
    .argument('<id>', 'Lease contract ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/lease-contracts/${id}/activate`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Lease activated');
    });

  cmd.command('post-monthly')
    .description('บันทึกค่าเช่ารายเดือน — Post monthly lease entries')
    .argument('<id>', 'Lease contract ID')
    .option('--date <date>', 'Posting date (YYYY-MM-DD)')
    .action(async (id: string, opts: { date?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.date) body['postingDate'] = opts.date;
      const result = await api.post<{ data: unknown }>(`/api/v1/lease-contracts/${id}/post-monthly`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Monthly lease posted');
    });

  return cmd;
}
