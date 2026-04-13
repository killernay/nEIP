/**
 * neip maintenance — Plant Maintenance commands (PM).
 *
 * Commands:
 *   neip maintenance equipment list           — GET  /api/v1/equipment
 *   neip maintenance equipment get <id>       — GET  /api/v1/equipment/:id
 *   neip maintenance equipment create         — POST /api/v1/equipment
 *   neip maintenance plans list               — GET  /api/v1/maintenance-plans
 *   neip maintenance plans create             — POST /api/v1/maintenance-plans
 *   neip maintenance plans generate           — POST /api/v1/maintenance-plans/generate-orders
 *   neip maintenance orders list              — GET  /api/v1/maintenance-orders
 *   neip maintenance orders get <id>          — GET  /api/v1/maintenance-orders/:id
 *   neip maintenance orders create            — POST /api/v1/maintenance-orders
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildMaintenanceCommand(): Command {
  const cmd = new Command('maintenance')
    .description('บำรุงรักษา — Plant Maintenance (PM)')
    .addHelpText('after', `
Examples:
  $ neip maintenance equipment list                # ดูเครื่องจักร
  $ neip maintenance plans list                    # ดูแผนบำรุงรักษา
  $ neip maintenance plans generate                # สร้างใบสั่งซ่อมจากแผน
  $ neip maintenance orders list                   # ดูใบสั่งซ่อม
  `);

  // Equipment
  const equip = cmd.command('equipment').description('เครื่องจักร/อุปกรณ์ — Equipment master');

  equip.command('list')
    .description('ดูเครื่องจักร — List equipment')
    .option('--status <status>', 'Filter: active, inactive, under_maintenance')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      const result = await api.get<{ data: unknown[] }>('/api/v1/equipment', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Equipment');
    });

  equip.command('get')
    .description('ดูรายละเอียดเครื่องจักร — Get equipment detail')
    .argument('<id>', 'Equipment ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/equipment/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Equipment detail');
    });

  equip.command('create')
    .description('สร้างเครื่องจักร — Create equipment')
    .requiredOption('--code <code>', 'Equipment code')
    .requiredOption('--name <name>', 'Equipment name')
    .option('--category <cat>', 'Category: machine, vehicle, tool, building')
    .option('--location <loc>', 'Location')
    .action(async (opts: { code: string; name: string; category?: string; location?: string }) => {
      const result = await api.post<{ data: unknown }>('/api/v1/equipment', opts);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Equipment created');
    });

  // Maintenance Plans
  const plans = cmd.command('plans').description('แผนบำรุงรักษา — Maintenance plans');

  plans.command('list')
    .description('ดูแผนบำรุงรักษา — List maintenance plans')
    .option('--equipment <id>', 'Filter by equipment ID')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { equipment?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.equipment) params['equipmentId'] = opts.equipment;
      const result = await api.get<{ data: unknown[] }>('/api/v1/maintenance-plans', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Maintenance plans');
    });

  plans.command('create')
    .description('สร้างแผนบำรุงรักษา — Create a maintenance plan')
    .requiredOption('--equipment <id>', 'Equipment ID')
    .requiredOption('--name <name>', 'Plan name')
    .requiredOption('--frequency <freq>', 'Frequency: daily, weekly, monthly, quarterly, yearly')
    .requiredOption('--next-due <date>', 'Next due date (YYYY-MM-DD)')
    .action(async (opts: { equipment: string; name: string; frequency: string; nextDue: string }) => {
      const result = await api.post<{ data: unknown }>('/api/v1/maintenance-plans', {
        equipmentId: opts.equipment, name: opts.name, frequency: opts.frequency, nextDueDate: opts.nextDue,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Maintenance plan created');
    });

  plans.command('generate')
    .description('สร้างใบสั่งซ่อมจากแผน — Generate maintenance orders from plans')
    .option('--equipment <id>', 'Specific equipment ID')
    .option('--as-of <date>', 'As-of date (YYYY-MM-DD)')
    .action(async (opts: { equipment?: string; asOf?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.equipment) body['equipmentId'] = opts.equipment;
      if (opts.asOf) body['asOfDate'] = opts.asOf;
      const result = await api.post<{ data: unknown }>('/api/v1/maintenance-plans/generate-orders', body);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Maintenance orders generated');
    });

  // Maintenance Orders
  const orders = cmd.command('orders').description('ใบสั่งซ่อม — Maintenance orders');

  orders.command('list')
    .description('ดูใบสั่งซ่อม — List maintenance orders')
    .option('--status <status>', 'Filter: planned, in_progress, completed')
    .option('--equipment <id>', 'Filter by equipment ID')
    .option('--limit <n>', 'Max results', '20')
    .action(async (opts: { status?: string; equipment?: string; limit: string }) => {
      const params: Record<string, string> = { limit: opts.limit };
      if (opts.status) params['status'] = opts.status;
      if (opts.equipment) params['equipmentId'] = opts.equipment;
      const result = await api.get<{ data: unknown[] }>('/api/v1/maintenance-orders', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Maintenance orders');
    });

  orders.command('get')
    .description('ดูรายละเอียดใบสั่งซ่อม — Get maintenance order detail')
    .argument('<id>', 'Maintenance order ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/maintenance-orders/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Maintenance order detail');
    });

  orders.command('create')
    .description('สร้างใบสั่งซ่อม — Create a maintenance order')
    .requiredOption('--equipment <id>', 'Equipment ID')
    .requiredOption('--type <type>', 'Type: preventive, corrective, predictive')
    .requiredOption('--description <desc>', 'Work description')
    .option('--priority <p>', 'Priority: low, medium, high, critical', 'medium')
    .action(async (opts: { equipment: string; type: string; description: string; priority: string }) => {
      const result = await api.post<{ data: unknown }>('/api/v1/maintenance-orders', {
        equipmentId: opts.equipment, type: opts.type, description: opts.description, priority: opts.priority,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Maintenance order created');
    });

  return cmd;
}
