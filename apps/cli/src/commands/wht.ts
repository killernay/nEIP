/**
 * neip wht — WHT Certificate commands (ใบหัก ณ ที่จ่าย).
 *
 * Commands:
 *   neip wht list             — list certificates
 *   neip wht create           — create a certificate interactively
 *   neip wht get <id>         — get certificate detail
 *   neip wht issue <id>       — issue a draft certificate
 *   neip wht void <id>        — void a certificate
 *   neip wht file <id>        — mark as filed
 *   neip wht summary          — summary by month for ภ.ง.ด.3/53
 */

import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
  });
}

function today(): string { return new Date().toISOString().slice(0, 10); }

interface WhtCert {
  id: string;
  documentNumber: string;
  certificateType: string;
  payeeName: string;
  whtAmountSatang: string;
  status: string;
}

interface ListOptions {
  status?: string;
  month?: string;
  year?: string;
}

async function whtList(options: ListOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.status) params['status'] = options.status;
  if (options.month) params['taxMonth'] = options.month;
  if (options.year) params['taxYear'] = options.year;

  const result = await api.get<{ items: WhtCert[]; total: number }>('/api/v1/wht-certificates', params);
  if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
  printSuccess(result.data.items, `${result.data.total} WHT certificates`);
}

async function whtCreate(): Promise<void> {
  process.stdout.write('Create a new WHT certificate (ใบหัก ณ ที่จ่าย).\n');

  const certType = await prompt('Type (pnd3/pnd53) [pnd53]: ');
  const payerName = await prompt('Payer company name: ');
  const payerTaxId = await prompt('Payer tax ID (13 digits): ');
  const payeeName = await prompt('Payee name: ');
  const payeeTaxId = await prompt('Payee tax ID (13 digits): ');
  const payeeAddress = await prompt('Payee address: ');
  const incomeType = await prompt('Income type (1-7) [2]: ');
  const incomeDesc = await prompt('Income description: ');
  const paymentDate = await prompt(`Payment date [${today()}]: `);
  const incomeAmountThb = await prompt('Income amount (THB): ');
  const whtRatePct = await prompt('WHT rate (%) [3]: ');
  const taxMonth = await prompt(`Tax month [${String(new Date().getMonth() + 1)}]: `);
  const taxYear = await prompt(`Tax year [${String(new Date().getFullYear())}]: `);

  const incomeSatang = String(Math.round(parseFloat(incomeAmountThb || '0') * 100));
  const rateBp = Math.round(parseFloat(whtRatePct || '3') * 100);

  const result = await api.post<{ documentNumber: string }>('/api/v1/wht-certificates', {
    certificateType: certType || 'pnd53',
    payerName,
    payerTaxId,
    payeeName,
    payeeTaxId,
    payeeAddress,
    incomeType: incomeType || '2',
    incomeDescription: incomeDesc,
    paymentDate: paymentDate || today(),
    incomeAmountSatang: incomeSatang,
    whtRateBasisPoints: rateBp,
    taxMonth: parseInt(taxMonth || String(new Date().getMonth() + 1), 10),
    taxYear: parseInt(taxYear || String(new Date().getFullYear()), 10),
  });

  if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
  printSuccess(result.data, `Certificate ${result.data.documentNumber} created.`);
}

async function whtGet(id: string): Promise<void> {
  const result = await api.get<WhtCert>(`/api/v1/wht-certificates/${id}`);
  if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
  printSuccess(result.data, `Certificate ${id}:`);
}

async function whtAction(id: string, action: 'issue' | 'void' | 'file'): Promise<void> {
  const result = await api.post<WhtCert>(`/api/v1/wht-certificates/${id}/${action}`);
  if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
  printSuccess(result.data, `Certificate ${id} ${action}d.`);
}

async function whtSummary(options: { year?: string; month?: string }): Promise<void> {
  const params: Record<string, string> = {};
  if (options.year) params['taxYear'] = options.year;
  if (options.month) params['taxMonth'] = options.month;

  const result = await api.get<{
    summaries: { taxYear: number; taxMonth: number; certificateType: string; totalWhtSatang: string }[];
    totalWhtSatang: string;
  }>('/api/v1/wht-certificates/summary', params);

  if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
  const total = (parseInt(result.data.totalWhtSatang, 10) / 100).toFixed(2);
  printSuccess(result.data.summaries, `WHT Summary — Total: ฿${total}`);
}

export function buildWhtCommand(): Command {
  const cmd = new Command('wht')
    .description('จัดการใบหัก ณ ที่จ่าย (ภ.ง.ด.3/53) — Withholding Tax Certificate management')
    .addHelpText('after', `
Examples:
  $ neip wht list                               # แสดงใบหัก ณ ที่จ่ายทั้งหมด
  $ neip wht list --status draft                # เฉพาะ draft
  $ neip wht list --year 2026 --month 3         # กรองตามเดือน/ปี
  $ neip wht create                             # สร้างใบหัก ณ ที่จ่าย (interactive)
  $ neip wht get <id>                           # ดูรายละเอียด
  $ neip wht issue <id>                         # ออกใบรับรอง
  $ neip wht void <id>                          # ยกเลิก
  $ neip wht file <id>                          # ยื่นแบบแล้ว
  $ neip wht summary --year 2026                # สรุปสำหรับ ภ.ง.ด.3/53
  `);

  cmd.command('list')
    .description('แสดงรายการใบหัก ณ ที่จ่าย — List WHT certificates')
    .option('--status <status>', 'กรองตามสถานะ: draft/issued/filed/voided — Filter by status')
    .option('--month <month>', 'กรองตามเดือนภาษี (1-12) — Filter by tax month')
    .option('--year <year>', 'กรองตามปีภาษี — Filter by tax year')
    .action(async (opts: ListOptions) => { await whtList(opts); });

  cmd.command('create')
    .description('สร้างใบหัก ณ ที่จ่าย (interactive) — Create a WHT certificate interactively')
    .action(async () => { await whtCreate(); });

  cmd.command('get <id>')
    .description('ดูรายละเอียดใบหัก ณ ที่จ่าย — Get WHT certificate detail')
    .action(async (id: string) => { await whtGet(id); });

  cmd.command('issue <id>')
    .description('ออกใบรับรอง (draft → issued) — Issue a WHT certificate')
    .action(async (id: string) => { await whtAction(id, 'issue'); });

  cmd.command('void <id>')
    .description('ยกเลิกใบหัก ณ ที่จ่าย — Void a WHT certificate')
    .action(async (id: string) => { await whtAction(id, 'void'); });

  cmd.command('file <id>')
    .description('ทำเครื่องหมายว่ายื่นแบบแล้ว — Mark a WHT certificate as filed')
    .action(async (id: string) => { await whtAction(id, 'file'); });

  cmd.command('summary')
    .description('สรุป WHT รายเดือนสำหรับ ภ.ง.ด.3/53 — WHT summary by month for ภ.ง.ด.3/53 filing')
    .option('--year <year>', 'ปีภาษี — Tax year')
    .option('--month <month>', 'เดือนภาษี — Tax month')
    .action(async (opts: { year?: string; month?: string }) => { await whtSummary(opts); });

  cmd.command('annual-cert')
    .description('ออก 50 ทวิ — Generate annual WHT certificate (50 ทวิ) for an employee')
    .requiredOption('--employee <employeeId>', 'รหัสพนักงาน — Employee ID')
    .requiredOption('--year <year>', 'ปีภาษี — Tax year')
    .action(async (opts: { employee: string; year: string }) => {
      const result = await api.get<{ data: unknown }>(`/api/v1/wht-certificates/annual-cert`, {
        employeeId: opts.employee,
        taxYear: opts.year,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Annual WHT certificate (50 ทวิ) — Employee ${opts.employee}, Year ${opts.year}:`);
    });

  return cmd;
}
