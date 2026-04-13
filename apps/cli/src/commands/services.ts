/**
 * neip services — Service Entry Sheet commands (MM-SRV).
 *
 * Commands:
 *   neip services list              — GET  /api/v1/service-entries
 *   neip services get <id>          — GET  /api/v1/service-entries/:id
 *   neip services approve <id>      — POST /api/v1/service-entries/:id/approve
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildServicesCommand(): Command {
  const cmd = new Command('services')
    .description('ใบรับบริการ — Service Entry Sheets (MM-SRV)')
    .addHelpText('after', `
Examples:
  $ neip services list                             # ดูใบรับบริการ
  $ neip services list --status submitted          # เฉพาะรอนุมัติ
  $ neip services approve <id>                     # อนุมัติใบรับบริการ
  `);

  cmd.command('list')
    .description('ดูใบรับบริการ — List service entry sheets')
    .option('--status <status>', 'Filter: draft, submitted, approved, rejected')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/service-entries', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Service entries');
    });

  cmd.command('get')
    .description('ดูรายละเอียดใบรับบริการ — Get service entry detail')
    .argument('<id>', 'Service entry ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/service-entries/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Service entry detail');
    });

  cmd.command('approve')
    .description('อนุมัติใบรับบริการ — Approve a service entry sheet')
    .argument('<id>', 'Service entry ID')
    .option('--notes <notes>', 'Approval notes')
    .action(async (id: string, opts: { notes?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.notes) body['notes'] = opts.notes;
      const result = await api.post<{ data: unknown }>(`/api/v1/service-entries/${id}/approve`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Service entry approved');
    });

  return cmd;
}
