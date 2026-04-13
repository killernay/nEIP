/**
 * neip performance — Performance Management commands (HR-PA).
 *
 * Commands:
 *   neip performance reviews list       — GET  /api/v1/performance-reviews
 *   neip performance reviews get <id>   — GET  /api/v1/performance-reviews/:id
 *   neip performance goals list         — GET  /api/v1/performance-goals
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildPerformanceCommand(): Command {
  const cmd = new Command('performance')
    .description('การประเมินผล — Performance Management (HR-PA)')
    .addHelpText('after', `
Examples:
  $ neip performance reviews list                  # ดูการประเมินผล
  $ neip performance reviews list --period 2026-Q1 # เฉพาะ Q1
  $ neip performance goals list                    # ดูเป้าหมาย
  `);

  const reviews = cmd.command('reviews').description('การประเมินผล — Performance reviews');

  reviews.command('list')
    .description('ดูการประเมินผล — List performance reviews')
    .option('--employee <id>', 'Filter by employee ID')
    .option('--period <period>', 'Filter by period (e.g. 2026-Q1)')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { employee?: string; period?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.employee) params['employeeId'] = opts.employee;
      if (opts.period) params['period'] = opts.period;
      const result = await api.get<{ data: unknown[] }>('/api/v1/performance-reviews', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Performance reviews');
    });

  reviews.command('get')
    .description('ดูรายละเอียดการประเมิน — Get review detail')
    .argument('<id>', 'Review ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/performance-reviews/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Performance review detail');
    });

  const goals = cmd.command('goals').description('เป้าหมาย — Performance goals');

  goals.command('list')
    .description('ดูเป้าหมาย — List performance goals')
    .option('--employee <id>', 'Filter by employee ID')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { employee?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.employee) params['employeeId'] = opts.employee;
      const result = await api.get<{ data: unknown[] }>('/api/v1/performance-goals', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Performance goals');
    });

  return cmd;
}
