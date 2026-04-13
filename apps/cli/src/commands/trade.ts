/**
 * neip trade — Foreign Trade / Import-Export commands.
 *
 * Commands:
 *   neip trade incoterms                     — GET  /api/v1/incoterms
 *   neip trade declarations list             — GET  /api/v1/trade-declarations
 *   neip trade declarations get <id>         — GET  /api/v1/trade-declarations/:id
 *   neip trade declarations submit <id>      — POST /api/v1/trade-declarations/:id/submit
 *   neip trade declarations clear <id>       — POST /api/v1/trade-declarations/:id/clear
 *   neip trade lc list                       — GET  /api/v1/letters-of-credit
 *   neip trade lc get <id>                   — GET  /api/v1/letters-of-credit/:id
 *   neip trade lc issue <id>                 — POST /api/v1/letters-of-credit/:id/issue
 *   neip trade lc negotiate <id>             — POST /api/v1/letters-of-credit/:id/negotiate
 *   neip trade lc settle <id>                — POST /api/v1/letters-of-credit/:id/settle
 *   neip trade lc cancel <id>                — POST /api/v1/letters-of-credit/:id/cancel
 *   neip trade landed-costs <poId>           — GET  /api/v1/landed-costs/:poId
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildTradeCommand(): Command {
  const cmd = new Command('trade')
    .description('การค้าระหว่างประเทศ — Foreign Trade / Import-Export management')
    .addHelpText('after', `
Examples:
  $ neip trade incoterms                        # ดู Incoterms
  $ neip trade declarations list                # ดูใบขนสินค้า
  $ neip trade declarations list --type import  # เฉพาะนำเข้า
  $ neip trade declarations submit <id>         # ยื่นศุลกากร
  $ neip trade declarations clear <id>          # ผ่านพิธีการ
  $ neip trade lc list                          # ดู L/C
  $ neip trade lc issue <id>                    # ออก L/C
  $ neip trade lc settle <id>                   # ชำระ L/C
  $ neip trade landed-costs <poId>              # ดูต้นทุนนำเข้า
  `);

  // -------------------------------------------------------------------------
  // Incoterms
  // -------------------------------------------------------------------------

  cmd.command('incoterms')
    .description('ดู Incoterms — List international commercial terms')
    .action(async () => {
      const result = await api.get<{ data: unknown[] }>('/api/v1/incoterms');
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `${String(result.data.data.length)} incoterms`);
    });

  // -------------------------------------------------------------------------
  // Declarations
  // -------------------------------------------------------------------------

  const decl = cmd.command('declarations').description('ใบขนสินค้า — Trade declarations');

  decl.command('list')
    .description('ดูรายการใบขนสินค้า — List trade declarations')
    .option('--type <type>', 'Filter: import or export')
    .option('--status <status>', 'Filter by status')
    .action(async (opts: { type?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (opts.type) params.set('type', opts.type);
      if (opts.status) params.set('status', opts.status);
      const qs = params.toString();
      const result = await api.get<{ data: unknown[] }>(`/api/v1/trade-declarations${qs ? `?${qs}` : ''}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `${String(result.data.data.length)} declarations`);
    });

  decl.command('get')
    .description('ดูรายละเอียดใบขน — Get declaration detail')
    .argument('<id>', 'Declaration ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/trade-declarations/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Declaration detail');
    });

  decl.command('submit')
    .description('ยื่นใบขนต่อศุลกากร — Submit declaration to customs')
    .argument('<id>', 'Declaration ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/trade-declarations/${id}/submit`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Declaration submitted');
    });

  decl.command('clear')
    .description('ผ่านพิธีการศุลกากร — Clear customs declaration')
    .argument('<id>', 'Declaration ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/trade-declarations/${id}/clear`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Declaration cleared');
    });

  // -------------------------------------------------------------------------
  // Letters of Credit
  // -------------------------------------------------------------------------

  const lc = cmd.command('lc').description('Letter of Credit — L/C management');

  lc.command('list')
    .description('ดู L/C ทั้งหมด — List letters of credit')
    .option('--type <type>', 'Filter: import or export')
    .option('--status <status>', 'Filter by status')
    .action(async (opts: { type?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (opts.type) params.set('type', opts.type);
      if (opts.status) params.set('status', opts.status);
      const qs = params.toString();
      const result = await api.get<{ data: unknown[] }>(`/api/v1/letters-of-credit${qs ? `?${qs}` : ''}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `${String(result.data.data.length)} letters of credit`);
    });

  lc.command('get')
    .description('ดูรายละเอียด L/C — Get LC detail')
    .argument('<id>', 'LC ID')
    .action(async (id: string) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/letters-of-credit/${id}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Letter of Credit detail');
    });

  lc.command('issue')
    .description('ออก L/C — Issue a letter of credit')
    .argument('<id>', 'LC ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/letters-of-credit/${id}/issue`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'LC issued');
    });

  lc.command('negotiate')
    .description('เจรจา L/C — Negotiate a letter of credit')
    .argument('<id>', 'LC ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/letters-of-credit/${id}/negotiate`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'LC negotiated');
    });

  lc.command('settle')
    .description('ชำระ L/C — Settle a letter of credit')
    .argument('<id>', 'LC ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/letters-of-credit/${id}/settle`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'LC settled');
    });

  lc.command('cancel')
    .description('ยกเลิก L/C — Cancel a letter of credit')
    .argument('<id>', 'LC ID')
    .action(async (id: string) => {
      const result = await api.post<{ data: unknown }>(`/api/v1/letters-of-credit/${id}/cancel`, {});
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'LC cancelled');
    });

  // -------------------------------------------------------------------------
  // Landed Costs
  // -------------------------------------------------------------------------

  cmd.command('landed-costs')
    .description('ดูต้นทุนนำเข้าตาม PO — View landed costs for a purchase order')
    .argument('<poId>', 'Purchase Order ID')
    .action(async (poId: string) => {
      const result = await api.get<{ data: unknown[] }>(`/api/v1/landed-costs/${poId}`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `${String(result.data.data.length)} landed cost entries`);
    });

  return cmd;
}
