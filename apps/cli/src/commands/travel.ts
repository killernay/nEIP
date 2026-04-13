/**
 * neip travel — Travel & Expense commands (HR-TRV).
 *
 * Commands:
 *   neip travel requests list           — GET  /api/v1/travel-requests
 *   neip travel requests get <id>       — GET  /api/v1/travel-requests/:id
 *   neip travel requests create         — POST /api/v1/travel-requests
 *   neip travel claims list             — GET  /api/v1/expense-claims
 *   neip travel claims get <id>         — GET  /api/v1/expense-claims/:id
 *   neip travel claims create           — POST /api/v1/expense-claims
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildTravelCommand(): Command {
  const cmd = new Command('travel')
    .description('การเดินทาง/ค่าใช้จ่าย — Travel & Expense Management (HR-TRV)')
    .addHelpText('after', `
Examples:
  $ neip travel requests list                      # ดูคำขอเดินทาง
  $ neip travel requests create --employee <id> --destination "Bangkok" --start 2026-05-01 --end 2026-05-03 --purpose "Meeting"
  $ neip travel claims list                        # ดูเบิกค่าใช้จ่าย
  `);

  // Travel Requests
  const requests = cmd.command('requests').description('คำขอเดินทาง — Travel requests');

  requests.command('list')
    .description('ดูคำขอเดินทาง — List travel requests')
    .option('--employee <id>', 'Filter by employee ID')
    .option('--status <status>', 'Filter: draft, submitted, approved, rejected, completed')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { employee?: string; status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.employee) params['employeeId'] = opts.employee;
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/travel-requests', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Travel requests');
    });

  requests.command('get')
    .description('ดูรายละเอียดคำขอเดินทาง — Get travel request detail')
    .argument('<id>', 'Travel request ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/travel-requests/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Travel request detail');
    });

  requests.command('create')
    .description('สร้างคำขอเดินทาง — Create a travel request')
    .requiredOption('--employee <id>', 'Employee ID')
    .requiredOption('--destination <dest>', 'Travel destination')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .requiredOption('--purpose <purpose>', 'Purpose of travel')
    .option('--cost <satang>', 'Estimated cost in satang')
    .action(async (opts: { employee: string; destination: string; start: string; end: string; purpose: string; cost?: string }) => {
      const body: Record<string, unknown> = {
        employeeId: opts.employee, destination: opts.destination,
        startDate: opts.start, endDate: opts.end, purpose: opts.purpose,
      };
      if (opts.cost) body['estimatedCostSatang'] = opts.cost;
      const result = await api.post<{ data: unknown }>('/api/v1/travel-requests', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Travel request created');
    });

  // Expense Claims
  const claims = cmd.command('claims').description('เบิกค่าใช้จ่าย — Expense claims');

  claims.command('list')
    .description('ดูเบิกค่าใช้จ่าย — List expense claims')
    .option('--employee <id>', 'Filter by employee ID')
    .option('--status <status>', 'Filter: draft, submitted, approved, rejected, paid')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { employee?: string; status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.employee) params['employeeId'] = opts.employee;
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/expense-claims', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Expense claims');
    });

  claims.command('get')
    .description('ดูรายละเอียดเบิกค่าใช้จ่าย — Get expense claim detail')
    .argument('<id>', 'Expense claim ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/expense-claims/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Expense claim detail');
    });

  claims.command('create')
    .description('สร้างเบิกค่าใช้จ่าย — Create an expense claim')
    .requiredOption('--employee <id>', 'Employee ID')
    .requiredOption('--description <desc>', 'Claim description')
    .option('--travel-request <id>', 'Related travel request ID')
    .action(async (opts: { employee: string; description: string; travelRequest?: string }) => {
      const body: Record<string, unknown> = {
        employeeId: opts.employee, description: opts.description, lines: [],
      };
      if (opts.travelRequest) body['travelRequestId'] = opts.travelRequest;
      const result = await api.post<{ data: unknown }>('/api/v1/expense-claims', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Expense claim created');
    });

  return cmd;
}
