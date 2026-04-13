/**
 * neip manufacturing — Production Planning commands (PP).
 *
 * Commands:
 *   neip manufacturing bom list              — GET  /api/v1/bom
 *   neip manufacturing bom get <id>          — GET  /api/v1/bom/:id
 *   neip manufacturing bom create            — POST /api/v1/bom
 *   neip manufacturing work-centers list     — GET  /api/v1/work-centers
 *   neip manufacturing orders list           — GET  /api/v1/production-orders
 *   neip manufacturing orders get <id>       — GET  /api/v1/production-orders/:id
 *   neip manufacturing orders create         — POST /api/v1/production-orders
 *   neip manufacturing orders release <id>   — POST /api/v1/production-orders/:id/release
 *   neip manufacturing orders confirm <id>   — POST /api/v1/production-orders/:id/confirm
 *   neip manufacturing mrp run               — POST /api/v1/mrp/run
 *   neip manufacturing kanban list           — GET  /api/v1/kanban-cards
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildManufacturingCommand(): Command {
  const cmd = new Command('manufacturing')
    .description('การผลิต — Production Planning (PP)')
    .addHelpText('after', `
Examples:
  $ neip manufacturing bom list                    # ดู BOM
  $ neip manufacturing work-centers list           # ดูศูนย์งาน
  $ neip manufacturing orders list                 # ดูใบสั่งผลิต
  $ neip manufacturing orders release <id>         # ปล่อยใบสั่งผลิต
  $ neip manufacturing orders confirm <id>         # ยืนยันผลผลิต
  $ neip manufacturing mrp run                     # รัน MRP
  $ neip manufacturing kanban list                 # ดู Kanban cards
  `);

  // BOM sub-commands
  const bom = cmd.command('bom').description('Bill of Materials — BOM management');

  bom.command('list')
    .description('ดู BOM — List bills of materials')
    .option('--product <productId>', 'Filter by product ID')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { product?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.product) params['productId'] = opts.product;
      const result = await api.get<{ data: unknown[] }>('/api/v1/bom', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Bills of materials');
    });

  bom.command('get')
    .description('ดูรายละเอียด BOM — Get BOM detail')
    .argument('<id>', 'BOM ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/bom/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'BOM detail');
    });

  bom.command('create')
    .description('สร้าง BOM — Create a bill of materials')
    .requiredOption('--product <productId>', 'Finished product ID')
    .requiredOption('--name <name>', 'BOM name')
    .action(async (opts: { product: string; name: string }) => {
      const result = await api.post<{ data: unknown }>('/api/v1/bom', { productId: opts.product, name: opts.name, components: [] });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'BOM created');
    });

  // Work Centers
  const wc = cmd.command('work-centers').description('ศูนย์งาน — Work center management');

  wc.command('list')
    .description('ดูศูนย์งาน — List work centers')
    .option('--limit <n>', 'Max results', '50')
    .action(async (opts: { limit: string }) => {
      const result = await api.get<{ data: unknown[] }>('/api/v1/work-centers', { limit: opts.limit });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Work centers');
    });

  // Production Orders
  const orders = cmd.command('orders').description('ใบสั่งผลิต — Production order management');

  orders.command('list')
    .description('ดูใบสั่งผลิต — List production orders')
    .option('--status <status>', 'Filter: planned, released, in_progress, completed, closed')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/production-orders', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Production orders');
    });

  orders.command('get')
    .description('ดูรายละเอียดใบสั่งผลิต — Get production order detail')
    .argument('<id>', 'Production order ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/production-orders/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Production order detail');
    });

  orders.command('create')
    .description('สร้างใบสั่งผลิต — Create a production order')
    .requiredOption('--bom <bomId>', 'BOM ID')
    .requiredOption('--quantity <n>', 'Planned quantity')
    .requiredOption('--start <date>', 'Planned start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'Planned end date (YYYY-MM-DD)')
    .option('--work-center <id>', 'Work center ID')
    .action(async (opts: { bom: string; quantity: string; start: string; end: string; workCenter?: string }) => {
      const body: Record<string, unknown> = {
        bomId: opts.bom, quantity: Number(opts.quantity),
        plannedStartDate: opts.start, plannedEndDate: opts.end,
      };
      if (opts.workCenter) body['workCenterId'] = opts.workCenter;
      const result = await api.post<{ data: unknown }>('/api/v1/production-orders', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Production order created');
    });

  orders.command('release')
    .description('ปล่อยใบสั่งผลิต — Release a production order')
    .argument('<id>', 'Production order ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/production-orders/${id}/release`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Production order released');
    });

  orders.command('confirm')
    .description('ยืนยันผลผลิต — Confirm production output')
    .argument('<id>', 'Production order ID')
    .requiredOption('--quantity <n>', 'Quantity produced')
    .option('--scrap <n>', 'Scrap quantity', '0')
    .action(async (id: string, opts: { quantity: string; scrap: string }) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/production-orders/${id}/confirm`, {
        quantityProduced: Number(opts.quantity), scrapQuantity: Number(opts.scrap),
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Production confirmed');
    });

  // MRP
  cmd.command('mrp')
    .description('รัน MRP — Run material requirements planning')
    .option('--plant <id>', 'Plant/warehouse ID')
    .option('--product <id>', 'Specific product ID')
    .action(async (opts: { plant?: string; product?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.plant) body['plantId'] = opts.plant;
      if (opts.product) body['productId'] = opts.product;
      const result = await api.post<{ data: unknown }>('/api/v1/mrp/run', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'MRP run complete');
    });

  // Kanban
  const kanban = cmd.command('kanban').description('Kanban cards');

  kanban.command('list')
    .description('ดู Kanban cards — List kanban cards')
    .option('--work-center <id>', 'Filter by work center')
    .option('--status <status>', 'Filter: empty, in_transit, full')
    .action(async (opts: { workCenter?: string; status?: string }) => {
      const params: Record<string, string> = {};
      if (opts.workCenter) params['workCenterId'] = opts.workCenter;
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/kanban-cards', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Kanban cards');
    });

  return cmd;
}
