/**
 * neip recruitment — Recruitment commands (HR-RCF).
 *
 * Commands:
 *   neip recruitment postings list            — GET  /api/v1/job-postings
 *   neip recruitment postings get <id>        — GET  /api/v1/job-postings/:id
 *   neip recruitment postings create          — POST /api/v1/job-postings
 *   neip recruitment applications list        — GET  /api/v1/job-applications
 *   neip recruitment applications get <id>    — GET  /api/v1/job-applications/:id
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildRecruitmentCommand(): Command {
  const cmd = new Command('recruitment')
    .description('สรรหาบุคลากร — Recruitment (HR-RCF)')
    .addHelpText('after', `
Examples:
  $ neip recruitment postings list                 # ดูประกาศรับสมัคร
  $ neip recruitment postings create --position <id> --title "Developer"
  $ neip recruitment applications list             # ดูใบสมัคร
  `);

  // Job Postings
  const postings = cmd.command('postings').description('ประกาศรับสมัคร — Job postings');

  postings.command('list')
    .description('ดูประกาศรับสมัครงาน — List job postings')
    .option('--status <status>', 'Filter: draft, open, closed')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/job-postings', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Job postings');
    });

  postings.command('get')
    .description('ดูรายละเอียดประกาศ — Get job posting detail')
    .argument('<id>', 'Job posting ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/job-postings/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Job posting detail');
    });

  postings.command('create')
    .description('สร้างประกาศรับสมัคร — Create a job posting')
    .requiredOption('--position <id>', 'Position ID')
    .requiredOption('--title <title>', 'Job title')
    .option('--description <desc>', 'Job description')
    .option('--closing-date <date>', 'Closing date (YYYY-MM-DD)')
    .action(async (opts: { position: string; title: string; description?: string; closingDate?: string }) => {
      const body: Record<string, unknown> = {
        positionId: opts.position, title: opts.title,
        description: opts.description ?? '', requirements: '',
      };
      if (opts.closingDate) body['closingDate'] = opts.closingDate;
      const result = await api.post<{ data: unknown }>('/api/v1/job-postings', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Job posting created');
    });

  // Applications
  const apps = cmd.command('applications').description('ใบสมัคร — Job applications');

  apps.command('list')
    .description('ดูใบสมัคร — List job applications')
    .option('--posting <id>', 'Filter by job posting ID')
    .option('--status <status>', 'Filter: applied, screening, interview, offered, hired, rejected')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { posting?: string; status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.posting) params['jobPostingId'] = opts.posting;
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/job-applications', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Job applications');
    });

  apps.command('get')
    .description('ดูรายละเอียดใบสมัคร — Get application detail')
    .argument('<id>', 'Application ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/job-applications/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Application detail');
    });

  return cmd;
}
