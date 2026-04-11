/**
 * neip attendance — Attendance management commands.
 *
 * Commands:
 *   neip attendance clock-in       — POST /api/v1/attendance/clock-in
 *   neip attendance clock-out      — POST /api/v1/attendance/clock-out
 *   neip attendance summary        — GET  /api/v1/attendance/summary
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildAttendanceCommand(): Command {
  const cmd = new Command('attendance')
    .description('จัดการการเข้างาน — Attendance management')
    .addHelpText('after', `
Examples:
  $ neip attendance clock-in                   # ลงเวลาเข้างาน
  $ neip attendance clock-out                  # ลงเวลาออกงาน
  $ neip attendance summary --month 3 --year 2026  # สรุปการเข้างาน
  `);

  cmd.command('clock-in')
    .description('ลงเวลาเข้างาน — Clock in')
    .option('--employee <employeeId>', 'รหัสพนักงาน — Employee ID (defaults to self)')
    .option('--note <note>', 'หมายเหตุ — Note')
    .action(async (opts: { employee?: string; note?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.employee) body['employeeId'] = opts.employee;
      if (opts.note) body['note'] = opts.note;
      const result = await api.post<{ data: unknown }>('/api/v1/attendance/clock-in', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Clocked in successfully.');
    });

  cmd.command('clock-out')
    .description('ลงเวลาออกงาน — Clock out')
    .option('--employee <employeeId>', 'รหัสพนักงาน — Employee ID (defaults to self)')
    .option('--note <note>', 'หมายเหตุ — Note')
    .action(async (opts: { employee?: string; note?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.employee) body['employeeId'] = opts.employee;
      if (opts.note) body['note'] = opts.note;
      const result = await api.post<{ data: unknown }>('/api/v1/attendance/clock-out', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Clocked out successfully.');
    });

  cmd.command('summary')
    .description('สรุปการเข้างาน — Attendance summary')
    .option('--employee <employeeId>', 'รหัสพนักงาน — Employee ID')
    .option('--month <month>', 'เดือน (1-12) — Month')
    .option('--year <year>', 'ปี — Year')
    .action(async (opts: { employee?: string; month?: string; year?: string }) => {
      const params: Record<string, string> = {};
      if (opts.employee) params['employeeId'] = opts.employee;
      if (opts.month) params['month'] = opts.month;
      if (opts.year) params['year'] = opts.year;
      const result = await api.get<{ data: unknown }>('/api/v1/attendance/summary', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Attendance summary:');
    });

  return cmd;
}
