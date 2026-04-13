/**
 * neip grc — Governance, Risk & Compliance commands (GRC).
 *
 * Commands:
 *   neip grc sod list              — GET  /api/v1/sod-rules
 *   neip grc sod check             — POST /api/v1/sod-rules/check
 *   neip grc violations            — GET  /api/v1/sod-violations
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildGrcCommand(): Command {
  const cmd = new Command('grc')
    .description('ธรรมาภิบาล/ความเสี่ยง — GRC (Governance, Risk & Compliance)')
    .addHelpText('after', `
Examples:
  $ neip grc sod list                              # ดูกฎ SoD
  $ neip grc sod check                             # ตรวจสอบ SoD ทั้งหมด
  $ neip grc sod check --user <id>                 # ตรวจสอบ SoD สำหรับ user
  $ neip grc violations                            # ดูการฝ่าฝืน SoD
  `);

  const sod = cmd.command('sod').description('Segregation of Duties — SoD rules');

  sod.command('list')
    .description('ดูกฎ SoD — List SoD rules')
    .option('--limit <n>', 'Max results', '50')
    .action(async (opts: { limit: string }) => {
      const result = await api.get<{ data: unknown[] }>('/api/v1/sod-rules', { limit: opts.limit });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'SoD rules');
    });

  sod.command('check')
    .description('ตรวจสอบ SoD — Run SoD compliance check')
    .option('--user <id>', 'Check specific user')
    .option('--role <id>', 'Check specific role')
    .action(async (opts: { user?: string; role?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.user) body['userId'] = opts.user;
      if (opts.role) body['roleId'] = opts.role;
      const result = await api.post<{ data: unknown }>('/api/v1/sod-rules/check', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'SoD check results');
    });

  cmd.command('violations')
    .description('ดูการฝ่าฝืน SoD — List SoD violations')
    .option('--status <status>', 'Filter: open, resolved, accepted')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/sod-violations', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'SoD violations');
    });

  return cmd;
}
