/**
 * neip rfq — Request for Quotation commands.
 *
 * Commands:
 *   neip rfq list              — GET  /api/v1/rfqs
 *   neip rfq create            — POST /api/v1/rfqs (interactive)
 *   neip rfq send <id>         — POST /api/v1/rfqs/:id/send
 *   neip rfq compare <id>      — GET  /api/v1/rfqs/:id/compare
 *   neip rfq select <id>       — POST /api/v1/rfqs/:id/select
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

export function buildRfqCommand(): Command {
  const cmd = new Command('rfq')
    .description('จัดการใบขอเสนอราคา — Request for quotation management')
    .addHelpText('after', `
Examples:
  $ neip rfq list                              # แสดง RFQ ทั้งหมด
  $ neip rfq create                            # สร้าง RFQ (interactive)
  $ neip rfq send <id>                         # ส่ง RFQ ให้ผู้ขาย
  $ neip rfq compare <id>                      # เปรียบเทียบราคาที่ได้รับ
  $ neip rfq select <id> --vendor <vendorId>   # เลือกผู้ขาย
  `);

  cmd.command('list')
    .description('แสดง RFQ ทั้งหมด — List RFQs')
    .option('--status <status>', 'กรองตามสถานะ: draft/sent/received/closed — Filter by status')
    .option('--limit <n>', 'จำนวนสูงสุด — Max results', '50')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ items: unknown[]; total: number }>('/api/v1/rfqs', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.items, `${String(result.data.total)} RFQs`);
    });

  cmd.command('create')
    .description('สร้าง RFQ (interactive) — Create a request for quotation')
    .action(async () => {
      process.stdout.write('Create a new RFQ.\n');
      const title = await prompt('Title: ');
      const deadline = await prompt('Response deadline (YYYY-MM-DD): ');
      const vendorIds = await prompt('Vendor IDs (comma-separated): ');
      const productId = await prompt('Product ID: ');
      const quantity = await prompt('Quantity: ');

      const result = await api.post<{ data: unknown }>('/api/v1/rfqs', {
        title,
        responseDeadline: deadline,
        vendorIds: vendorIds.split(',').map((v) => v.trim()),
        lines: [{ productId, quantity: parseInt(quantity || '1', 10) }],
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'RFQ created.');
    });

  cmd.command('send <id>')
    .description('ส่ง RFQ ให้ผู้ขาย — Send RFQ to vendors')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/rfqs/${id}/send`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `RFQ ${id} sent to vendors.`);
    });

  cmd.command('compare <id>')
    .description('เปรียบเทียบราคาที่ได้รับ — Compare vendor responses')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/rfqs/${id}/compare`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `RFQ ${id} comparison:`);
    });

  cmd.command('select <id>')
    .description('เลือกผู้ขาย — Select winning vendor for RFQ')
    .requiredOption('--vendor <vendorId>', 'รหัสผู้ขาย — Vendor ID to select')
    .action(async (id: string, opts: { vendor: string }) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/rfqs/${id}/select`, { vendorId: opts.vendor });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Vendor ${opts.vendor} selected for RFQ ${id}.`);
    });

  return cmd;
}
