/**
 * neip dunning — Dunning (debt collection) management commands.
 *
 * Commands:
 *   neip dunning run              — POST /api/v1/dunning/run
 *   neip dunning list             — GET  /api/v1/dunning/notices
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildDunningCommand(): Command {
  const cmd = new Command('dunning')
    .description('จัดการการติดตามหนี้ — Dunning / debt collection management')
    .addHelpText('after', `
Examples:
  $ neip dunning run                           # รัน dunning process
  $ neip dunning run --as-of 2026-03-31        # รัน ณ วันที่กำหนด
  $ neip dunning list                          # แสดง dunning notices
  $ neip dunning list --level 2                # กรองตาม dunning level
  `);

  cmd.command('run')
    .description('รัน dunning process สร้างหนังสือแจ้งเตือน — Run dunning process to generate notices')
    .option('--as-of <date>', 'วันที่อ้างอิง (YYYY-MM-DD) — Reference date, defaults to today')
    .action(async (opts: { asOf?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.asOf) body['asOfDate'] = opts.asOf;
      const result = await api.post<{ data: unknown }>('/api/v1/dunning/run', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Dunning process completed.');
    });

  cmd.command('list')
    .description('แสดง dunning notices ทั้งหมด — List dunning notices')
    .option('--level <level>', 'กรองตาม dunning level (1-3) — Filter by dunning level')
    .option('--status <status>', 'กรองตามสถานะ: pending/sent/resolved — Filter by status')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { level?: string; status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.level) params['level'] = opts.level;
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/dunning/notices', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} dunning notices`);
    });

  return cmd;
}
