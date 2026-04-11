/**
 * neip approval — Approval workflow commands.
 *
 * Commands:
 *   neip approval list              — GET  /api/v1/approvals
 *   neip approval approve <id>      — POST /api/v1/approvals/:id/approve
 *   neip approval reject <id>       — POST /api/v1/approvals/:id/reject
 *   neip approval delegate <id>     — POST /api/v1/approvals/:id/delegate
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildApprovalCommand(): Command {
  const cmd = new Command('approval')
    .description('จัดการการอนุมัติ — Approval workflow management')
    .addHelpText('after', `
Examples:
  $ neip approval list                         # แสดงรายการรออนุมัติ
  $ neip approval list --status pending        # เฉพาะที่รออนุมัติ
  $ neip approval approve <id>                 # อนุมัติ
  $ neip approval reject <id> --reason "..."   # ปฏิเสธ
  $ neip approval delegate <id> --to <userId>  # มอบหมายให้คนอื่น
  `);

  cmd.command('list')
    .description('แสดงรายการอนุมัติ — List approval requests')
    .option('--status <status>', 'กรองตามสถานะ: pending/approved/rejected — Filter by status')
    .option('--type <type>', 'กรองตามประเภท: po/pr/expense/leave — Filter by document type')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { status?: string; type?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      if (opts.type) params['documentType'] = opts.type;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/approvals', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} approval requests`);
    });

  cmd.command('approve <id>')
    .description('อนุมัติ — Approve a request')
    .option('--comment <comment>', 'ความเห็น — Approval comment')
    .action(async (id: string, opts: { comment?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.comment) body['comment'] = opts.comment;
      const result = await api.post<{ data: unknown }>(`/api/v1/approvals/${id}/approve`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Approval ${id} approved.`);
    });

  cmd.command('reject <id>')
    .description('ปฏิเสธ — Reject a request')
    .option('--reason <reason>', 'เหตุผล — Rejection reason')
    .action(async (id: string, opts: { reason?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.reason) body['reason'] = opts.reason;
      const result = await api.post<{ data: unknown }>(`/api/v1/approvals/${id}/reject`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Approval ${id} rejected.`);
    });

  cmd.command('delegate <id>')
    .description('มอบหมายให้คนอื่น — Delegate approval to another user')
    .requiredOption('--to <userId>', 'มอบหมายให้ — User ID to delegate to')
    .option('--comment <comment>', 'ความเห็น — Comment')
    .action(async (id: string, opts: { to: string; comment?: string }) => {
      const body: Record<string, unknown> = { delegateToUserId: opts.to };
      if (opts.comment) body['comment'] = opts.comment;
      const result = await api.post<{ data: unknown }>(`/api/v1/approvals/${id}/delegate`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Approval ${id} delegated to ${opts.to}.`);
    });

  return cmd;
}
