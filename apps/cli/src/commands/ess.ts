/**
 * neip ess — Employee Self-Service commands.
 *
 * Commands:
 *   neip ess profile              — GET  /api/v1/ess/profile
 *   neip ess payslips             — GET  /api/v1/ess/payslips
 *   neip ess leave list           — GET  /api/v1/ess/leave-requests
 *   neip ess leave request        — POST /api/v1/ess/leave-requests
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildEssCommand(): Command {
  const cmd = new Command('ess')
    .description('พนักงาน Self-Service — Employee Self-Service')
    .addHelpText('after', `
Examples:
  $ neip ess profile                               # ดูโปรไฟล์พนักงาน
  $ neip ess payslips                              # ดูสลิปเงินเดือน
  $ neip ess leave list                            # ดูคำขอลา
  $ neip ess leave request --type annual --start 2026-05-01 --end 2026-05-03
  `);

  cmd.command('profile')
    .description('ดูโปรไฟล์พนักงาน — View my employee profile')
    .action(async () => {
      const result = await api.get<{ data: unknown }>('/api/v1/ess/profile');
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Employee profile');
    });

  cmd.command('payslips')
    .description('ดูสลิปเงินเดือน — View my payslips')
    .option('--year <year>', 'Filter by year')
    .option('--limit <n>', 'Max results', '12')
    .action(async (opts: { year?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.year) params['year'] = opts.year;
      const result = await api.get<{ data: unknown[] }>('/api/v1/ess/payslips', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Payslips');
    });

  const leave = cmd.command('leave').description('คำขอลา — Leave requests');

  leave.command('list')
    .description('ดูคำขอลาของตน — List my leave requests')
    .option('--status <status>', 'Filter: pending, approved, rejected')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/ess/leave-requests', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Leave requests');
    });

  leave.command('request')
    .description('ขอลางาน — Submit a leave request')
    .requiredOption('--type <type>', 'Leave type: annual, sick, personal, maternity')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .option('--reason <reason>', 'Reason for leave')
    .action(async (opts: { type: string; start: string; end: string; reason?: string }) => {
      const body: Record<string, unknown> = {
        leaveType: opts.type, startDate: opts.start, endDate: opts.end,
      };
      if (opts.reason) body['reason'] = opts.reason;
      const result = await api.post<{ data: unknown }>('/api/v1/ess/leave-requests', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Leave request submitted');
    });

  return cmd;
}
