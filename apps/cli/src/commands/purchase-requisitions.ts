/**
 * neip pr — Purchase Requisition commands.
 *
 * Commands:
 *   neip pr list                — GET  /api/v1/purchase-requisitions
 *   neip pr create              — POST /api/v1/purchase-requisitions (interactive)
 *   neip pr approve <id>        — POST /api/v1/purchase-requisitions/:id/approve
 *   neip pr reject <id>         — POST /api/v1/purchase-requisitions/:id/reject
 *   neip pr convert <id>        — POST /api/v1/purchase-requisitions/:id/convert
 */

import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

export function buildPurchaseRequisitionsCommand(): Command {
  const cmd = new Command('pr')
    .description('จัดการใบขอซื้อ — Purchase requisition management')
    .addHelpText('after', `
Examples:
  $ neip pr list                               # แสดงใบขอซื้อทั้งหมด
  $ neip pr list --status pending              # เฉพาะที่รออนุมัติ
  $ neip pr create                             # สร้างใบขอซื้อ (interactive)
  $ neip pr approve <id>                       # อนุมัติใบขอซื้อ
  $ neip pr reject <id>                        # ปฏิเสธใบขอซื้อ
  $ neip pr convert <id>                       # แปลงเป็น PO
  `);

  cmd.command('list')
    .description('แสดงใบขอซื้อทั้งหมด — List purchase requisitions')
    .option('--status <status>', 'กรองตามสถานะ: draft/pending/approved/rejected — Filter by status')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/purchase-requisitions', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} purchase requisitions`);
    });

  cmd.command('create')
    .description('สร้างใบขอซื้อ (interactive) — Create a purchase requisition')
    .action(async () => {
      process.stdout.write('Create a new purchase requisition.\n');
      const description = await prompt('Description: ');
      const requiredDate = await prompt('Required by date (YYYY-MM-DD): ');
      const productId = await prompt('Product ID: ');
      const quantity = await prompt('Quantity: ');

      const result = await api.post<{ data: unknown }>('/api/v1/purchase-requisitions', {
        description,
        requiredDate,
        lines: [{ productId, quantity: parseInt(quantity || '1', 10) }],
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Purchase requisition created.');
    });

  cmd.command('approve <id>')
    .description('อนุมัติใบขอซื้อ — Approve a purchase requisition')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/purchase-requisitions/${id}/approve`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Purchase requisition ${id} approved.`);
    });

  cmd.command('reject <id>')
    .description('ปฏิเสธใบขอซื้อ — Reject a purchase requisition')
    .option('--reason <reason>', 'เหตุผล — Rejection reason')
    .action(async (id: string, opts: { reason?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.reason) body['reason'] = opts.reason;
      const result = await api.post<{ data: unknown }>(`/api/v1/purchase-requisitions/${id}/reject`, body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Purchase requisition ${id} rejected.`);
    });

  cmd.command('convert <id>')
    .description('แปลงใบขอซื้อเป็น PO — Convert purchase requisition to purchase order')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/purchase-requisitions/${id}/convert`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Purchase requisition ${id} converted to PO.`);
    });

  return cmd;
}
