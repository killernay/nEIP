/**
 * neip reports — Financial Reports command group.
 *
 * Commands:
 *   neip reports balance-sheet      — GET /api/v1/reports/balance-sheet
 *   neip reports income-statement   — GET /api/v1/reports/income-statement
 *   neip reports trial-balance      — GET /api/v1/reports/trial-balance
 *   neip reports budget-variance    — GET /api/v1/reports/budget-variance
 *   neip reports equity-changes     — GET /api/v1/reports/equity-changes
 *   neip reports ar-aging           — GET /api/v1/reports/ar-aging
 *   neip reports ap-aging           — GET /api/v1/reports/ap-aging
 *   neip reports pnl                — GET /api/v1/reports/pnl-comparison
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';
import { getFormat } from '../output/formatter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Common date-range options shared by most report commands. */
interface DateRangeOptions {
  startDate?: string;
  endDate?: string;
  asOf?: string;
}

/** Options for period-based reports. */
interface PeriodOptions {
  year?: string;
  period?: string;
}

/** Options for the pnl comparison command. */
interface PnlOptions {
  mode: 'monthly' | 'ytd' | 'yoy' | 'mom';
  fiscalYear: string;
  period?: string;
  compareYear?: string;
}

// ---------------------------------------------------------------------------
// PNL Comparison types (subset of API response for rendering)
// ---------------------------------------------------------------------------

interface PnlMonthlyAccount {
  code: string;
  nameTh: string;
  type: string;
  months: string[];
  total: string;
}

interface PnlMonthlyResponse {
  mode: 'monthly' | 'ytd';
  fiscalYear: number;
  accounts: PnlMonthlyAccount[];
  summary: {
    totalRevenue: string[];
    totalExpenses: string[];
    netIncome: string[];
  };
}

interface PnlComparisonAccount {
  code: string;
  nameTh: string;
  type: string;
  current: string;
  previous: string;
  changeSatang: string;
  changePercent: number | null;
}

interface PnlYoyResponse {
  mode: 'yoy';
  currentYear: number;
  previousYear: number;
  accounts: PnlComparisonAccount[];
  summary: {
    currentRevenue: string;
    previousRevenue: string;
    currentExpenses: string;
    previousExpenses: string;
    currentNet: string;
    previousNet: string;
  };
}

interface PnlMomResponse {
  mode: 'mom';
  currentPeriod: { year: number; month: number };
  previousPeriod: { year: number; month: number };
  accounts: PnlComparisonAccount[];
  summary: {
    currentRevenue: string;
    previousRevenue: string;
    currentExpenses: string;
    previousExpenses: string;
    currentNet: string;
    previousNet: string;
  };
}

type PnlResponse = PnlMonthlyResponse | PnlYoyResponse | PnlMomResponse;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function balanceSheet(options: DateRangeOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.asOf !== undefined && options.asOf !== '') params['asOf'] = options.asOf;

  const result = await api.get<unknown>('/api/v1/reports/balance-sheet', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Balance Sheet:');
}

async function incomeStatement(options: DateRangeOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.startDate !== undefined && options.startDate !== '') params['startDate'] = options.startDate;
  if (options.endDate !== undefined && options.endDate !== '') params['endDate'] = options.endDate;

  const result = await api.get<unknown>('/api/v1/reports/income-statement', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Income Statement:');
}

async function trialBalance(options: DateRangeOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.asOf !== undefined && options.asOf !== '') params['asOf'] = options.asOf;

  const result = await api.get<unknown>('/api/v1/reports/trial-balance', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Trial Balance:');
}

async function budgetVariance(options: PeriodOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.year !== undefined && options.year !== '') params['year'] = options.year;
  if (options.period !== undefined && options.period !== '') params['period'] = options.period;

  const result = await api.get<unknown>('/api/v1/reports/budget-variance', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Budget Variance Report:');
}

async function equityChanges(options: DateRangeOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.startDate !== undefined && options.startDate !== '') params['startDate'] = options.startDate;
  if (options.endDate !== undefined && options.endDate !== '') params['endDate'] = options.endDate;

  const result = await api.get<unknown>('/api/v1/reports/equity-changes', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Statement of Changes in Equity:');
}

async function arAging(options: DateRangeOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.asOf !== undefined && options.asOf !== '') params['asOf'] = options.asOf;

  const result = await api.get<unknown>('/api/v1/reports/ar-aging', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Accounts Receivable Aging Report:');
}

async function apAging(options: DateRangeOptions): Promise<void> {
  const params: Record<string, string> = {};
  if (options.asOf !== undefined && options.asOf !== '') params['asOf'] = options.asOf;

  const result = await api.get<unknown>('/api/v1/reports/ap-aging', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data, 'Accounts Payable Aging Report:');
}

// ---------------------------------------------------------------------------
// PNL comparison helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convert satang string to a human-readable Thai Baht string (e.g. ฿1,234.56). */
function satangToDisplay(satang: string): string {
  const n = BigInt(satang);
  const abs = n < 0n ? -n : n;
  const baht = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, '0');
  const bahtFormatted = baht.toLocaleString('en-US');
  const sign = n < 0n ? '-' : '';
  return `${sign}฿${bahtFormatted}.${cents}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Render monthly/YTD table to stdout. */
function renderMonthlyTable(data: PnlMonthlyResponse): void {
  const modeLabel = data.mode === 'ytd' ? 'YTD' : 'Monthly';
  process.stdout.write(`\n${modeLabel} P&L — FY ${data.fiscalYear}\n`);
  process.stdout.write(`${'='.repeat(60)}\n`);

  const revenueAccounts = data.accounts.filter((a) => a.type === 'revenue');
  const expenseAccounts = data.accounts.filter((a) => a.type === 'expense');

  function printSection(label: string, accounts: PnlMonthlyAccount[]): void {
    process.stdout.write(`\n--- ${label} ---\n`);
    if (accounts.length === 0) {
      process.stdout.write('  (no accounts)\n');
      return;
    }
    // Header
    const monthHeaders = MONTH_LABELS.join('         ');
    process.stdout.write(`${'Code'.padEnd(8)}${'Name'.padEnd(30)}  ${monthHeaders}  ${'Total'.padStart(14)}\n`);
    process.stdout.write(`${'-'.repeat(8)}${'-'.repeat(30)}  ${'-'.repeat(MONTH_LABELS.length * 9)}  ${'-'.repeat(14)}\n`);

    for (const account of accounts) {
      const monthVals = account.months
        .map((m) => satangToDisplay(m).padStart(9))
        .join(' ');
      process.stdout.write(
        `${account.code.padEnd(8)}${account.nameTh.slice(0, 29).padEnd(30)}  ${monthVals}  ${satangToDisplay(account.total).padStart(14)}\n`,
      );
    }
  }

  printSection('Revenue', revenueAccounts);
  process.stdout.write(`\nTotal Revenue: ${satangToDisplay(data.summary.totalRevenue.reduce((s, v) => (BigInt(s) + BigInt(v)).toString(), '0'))}\n`);

  printSection('Expenses', expenseAccounts);
  process.stdout.write(`\nTotal Expenses: ${satangToDisplay(data.summary.totalExpenses.reduce((s, v) => (BigInt(s) + BigInt(v)).toString(), '0'))}\n`);

  process.stdout.write(`\nNet Income: ${satangToDisplay(data.summary.netIncome.reduce((s, v) => (BigInt(s) + BigInt(v)).toString(), '0'))}\n`);
}

/** Render YoY / MoM comparison table to stdout. */
function renderComparisonTable(
  accounts: PnlComparisonAccount[],
  currentLabel: string,
  previousLabel: string,
  summary: {
    currentRevenue: string;
    previousRevenue: string;
    currentExpenses: string;
    previousExpenses: string;
    currentNet: string;
    previousNet: string;
  },
): void {
  const colW = { code: 8, name: 30, cur: 16, prev: 16, chg: 16, pct: 8 };

  const header =
    'Code'.padEnd(colW.code) +
    'Account'.padEnd(colW.name) +
    currentLabel.padStart(colW.cur) +
    previousLabel.padStart(colW.prev) +
    'Change'.padStart(colW.chg) +
    'Change%'.padStart(colW.pct);
  const separator = '-'.repeat(header.length);

  process.stdout.write(`\n${header}\n${separator}\n`);

  const revenueAccounts = accounts.filter((a) => a.type === 'revenue');
  const expenseAccounts = accounts.filter((a) => a.type === 'expense');

  function printSection(label: string, rows: PnlComparisonAccount[]): void {
    process.stdout.write(`\n[${label}]\n`);
    for (const a of rows) {
      const line =
        a.code.padEnd(colW.code) +
        a.nameTh.slice(0, colW.name - 1).padEnd(colW.name) +
        satangToDisplay(a.current).padStart(colW.cur) +
        satangToDisplay(a.previous).padStart(colW.prev) +
        satangToDisplay(a.changeSatang).padStart(colW.chg) +
        formatPercent(a.changePercent).padStart(colW.pct);
      process.stdout.write(`${line}\n`);
    }
  }

  printSection('Revenue', revenueAccounts);
  const revChangeSatang = (BigInt(summary.currentRevenue) - BigInt(summary.previousRevenue)).toString();
  const revPct = BigInt(summary.previousRevenue) === 0n ? null : Number((BigInt(revChangeSatang) * 10000n) / BigInt(summary.previousRevenue)) / 100;
  process.stdout.write(
    `${'Total Revenue'.padEnd(colW.code + colW.name)}${satangToDisplay(summary.currentRevenue).padStart(colW.cur)}${satangToDisplay(summary.previousRevenue).padStart(colW.prev)}${satangToDisplay(revChangeSatang).padStart(colW.chg)}${formatPercent(revPct).padStart(colW.pct)}\n`,
  );

  printSection('Expenses', expenseAccounts);
  const expChangeSatang = (BigInt(summary.currentExpenses) - BigInt(summary.previousExpenses)).toString();
  const expPct = BigInt(summary.previousExpenses) === 0n ? null : Number((BigInt(expChangeSatang) * 10000n) / BigInt(summary.previousExpenses)) / 100;
  process.stdout.write(
    `${'Total Expenses'.padEnd(colW.code + colW.name)}${satangToDisplay(summary.currentExpenses).padStart(colW.cur)}${satangToDisplay(summary.previousExpenses).padStart(colW.prev)}${satangToDisplay(expChangeSatang).padStart(colW.chg)}${formatPercent(expPct).padStart(colW.pct)}\n`,
  );

  process.stdout.write(`\n${separator}\n`);
  const netChangeSatang = (BigInt(summary.currentNet) - BigInt(summary.previousNet)).toString();
  const netPct = BigInt(summary.previousNet) === 0n ? null : Number((BigInt(netChangeSatang) * 10000n) / BigInt(summary.previousNet)) / 100;
  process.stdout.write(
    `${'Net Income'.padEnd(colW.code + colW.name)}${satangToDisplay(summary.currentNet).padStart(colW.cur)}${satangToDisplay(summary.previousNet).padStart(colW.prev)}${satangToDisplay(netChangeSatang).padStart(colW.chg)}${formatPercent(netPct).padStart(colW.pct)}\n`,
  );
}

async function pnlComparison(options: PnlOptions): Promise<void> {
  const params: Record<string, string> = {
    mode: options.mode,
    fiscalYear: options.fiscalYear,
  };

  if (options.period !== undefined && options.period !== '') {
    params['fiscalPeriod'] = options.period;
  }
  if (options.compareYear !== undefined && options.compareYear !== '') {
    params['compareYear'] = options.compareYear;
  }

  const result = await api.get<PnlResponse>('/api/v1/reports/pnl-comparison', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  // For JSON output, delegate to printSuccess
  if (getFormat() === 'json') {
    printSuccess(result.data, 'P&L Comparison:');
    return;
  }

  // Table rendering — hand-crafted for P&L structure
  const data = result.data;

  if (data.mode === 'monthly' || data.mode === 'ytd') {
    renderMonthlyTable(data);
  } else if (data.mode === 'yoy') {
    process.stdout.write(`\nYear-over-Year P&L — FY ${data.currentYear} vs FY ${data.previousYear}\n`);
    renderComparisonTable(
      data.accounts,
      `FY ${data.currentYear}`,
      `FY ${data.previousYear}`,
      data.summary,
    );
  } else if (data.mode === 'mom') {
    const curLabel = `${MONTH_LABELS[(data.currentPeriod.month - 1) % 12]} ${data.currentPeriod.year}`;
    const prevLabel = `${MONTH_LABELS[(data.previousPeriod.month - 1) % 12]} ${data.previousPeriod.year}`;
    process.stdout.write(`\nMonth-over-Month P&L — ${curLabel} vs ${prevLabel}\n`);
    renderComparisonTable(data.accounts, curLabel, prevLabel, data.summary);
  }
}

// ---------------------------------------------------------------------------
// Command builder
// ---------------------------------------------------------------------------

/**
 * Build the `reports` command group.
 */
export function buildReportsCommand(): Command {
  const reports = new Command('reports')
    .description('สร้างรายงานการเงิน — Financial report generation')
    .addHelpText('after', `
Examples:
  $ neip reports balance-sheet                          # งบดุล ณ วันนี้
  $ neip reports balance-sheet --as-of 2026-03-31       # งบดุล ณ วันที่กำหนด
  $ neip reports income-statement --start-date 2026-01-01 --end-date 2026-03-31
  $ neip reports trial-balance                          # งบทดลอง
  $ neip reports budget-variance --year 2026 --period 3
  $ neip reports ar-aging                               # ลูกหนี้ค้างชำระ
  $ neip reports ap-aging                               # เจ้าหนี้ค้างชำระ
  $ neip reports pnl --mode monthly --fiscal-year 2026  # กำไรขาดทุนรายเดือน
  $ neip reports pnl --mode yoy --fiscal-year 2026      # เปรียบเทียบปีต่อปี
  `);

  reports
    .command('balance-sheet')
    .description('งบดุล — Generate a balance sheet as of a given date')
    .option('--as-of <date>', 'วันที่รายงาน (YYYY-MM-DD) — Report date, defaults to today')
    .action(async (options: DateRangeOptions) => {
      await balanceSheet(options);
    });

  reports
    .command('income-statement')
    .description('งบกำไรขาดทุน — Generate an income statement for a date range')
    .option('--start-date <date>', 'วันเริ่มต้น (YYYY-MM-DD) — Start of reporting period')
    .option('--end-date <date>', 'วันสิ้นสุด (YYYY-MM-DD) — End of reporting period')
    .action(async (options: DateRangeOptions) => {
      await incomeStatement(options);
    });

  reports
    .command('trial-balance')
    .description('งบทดลอง — Generate a trial balance as of a given date')
    .option('--as-of <date>', 'วันที่รายงาน (YYYY-MM-DD) — Report date, defaults to today')
    .action(async (options: DateRangeOptions) => {
      await trialBalance(options);
    });

  reports
    .command('budget-variance')
    .description('รายงานงบประมาณเทียบจริง — Generate a budget vs actual variance report')
    .option('--year <year>', 'ปีบัญชี (เช่น 2026) — Fiscal year')
    .option('--period <period>', 'งวดบัญชี (1-13) — Fiscal period number within the year')
    .action(async (options: PeriodOptions) => {
      await budgetVariance(options);
    });

  reports
    .command('equity-changes')
    .description('งบแสดงการเปลี่ยนแปลงส่วนของผู้ถือหุ้น — Generate a statement of changes in equity')
    .option('--start-date <date>', 'วันเริ่มต้น (YYYY-MM-DD) — Start of reporting period')
    .option('--end-date <date>', 'วันสิ้นสุด (YYYY-MM-DD) — End of reporting period')
    .action(async (options: DateRangeOptions) => {
      await equityChanges(options);
    });

  reports
    .command('ar-aging')
    .description('รายงานอายุลูกหนี้ — Generate an accounts receivable aging report')
    .option('--as-of <date>', 'วันที่รายงาน (YYYY-MM-DD) — Report date, defaults to today')
    .action(async (options: DateRangeOptions) => {
      await arAging(options);
    });

  reports
    .command('ap-aging')
    .description('รายงานอายุเจ้าหนี้ — Generate an accounts payable aging report')
    .option('--as-of <date>', 'วันที่รายงาน (YYYY-MM-DD) — Report date, defaults to today')
    .action(async (options: DateRangeOptions) => {
      await apAging(options);
    });

  reports
    .command('pnl')
    .description('รายงานกำไรขาดทุนเปรียบเทียบ — Generate a P&L comparison report (monthly, YTD, YoY, or MoM)')
    .requiredOption('--mode <mode>', 'รูปแบบเปรียบเทียบ: monthly (รายเดือน) | ytd (สะสม) | yoy (ปีต่อปี) | mom (เดือนต่อเดือน)')
    .requiredOption('--fiscal-year <year>', 'ปีบัญชี (เช่น 2026) — Fiscal year')
    .option('--period <period>', 'งวดบัญชี 1-12 (จำเป็นสำหรับ mom) — Fiscal period, required for mom mode')
    .option('--compare-year <year>', 'ปีเปรียบเทียบสำหรับ yoy (ค่าเริ่มต้น: fiscalYear-1) — Year to compare for yoy')
    .addHelpText('after', `
Examples:
  $ neip reports pnl --mode monthly --fiscal-year 2026
  $ neip reports pnl --mode ytd --fiscal-year 2026
  $ neip reports pnl --mode yoy --fiscal-year 2026
  $ neip reports pnl --mode mom --fiscal-year 2026 --period 3
  `)
    .action(async (options: PnlOptions) => {
      await pnlComparison(options);
    });

  // --- Compliance reports ---

  reports
    .command('vat-return')
    .description('รายงาน ภ.พ.30 — VAT return report (ภ.พ.30)')
    .requiredOption('--year <year>', 'ปีภาษี — Tax year')
    .requiredOption('--month <month>', 'เดือนภาษี (1-12) — Tax month')
    .action(async (opts: { year: string; month: string }) => {
      const result = await api.get<{ data: unknown }>('/api/v1/reports/vat-return', {
        year: opts.year,
        month: opts.month,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `VAT Return (ภ.พ.30) — ${opts.month}/${opts.year}:`);
    });

  reports
    .command('ssc-filing')
    .description('รายงานประกันสังคม — Social Security contribution filing')
    .requiredOption('--year <year>', 'ปี — Year')
    .requiredOption('--month <month>', 'เดือน (1-12) — Month')
    .action(async (opts: { year: string; month: string }) => {
      const result = await api.get<{ data: unknown }>('/api/v1/reports/ssc-filing', {
        year: opts.year,
        month: opts.month,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `SSC Filing — ${opts.month}/${opts.year}:`);
    });

  reports
    .command('cash-flow')
    .description('งบกระแสเงินสด — Cash flow statement')
    .requiredOption('--year <year>', 'ปีบัญชี — Fiscal year')
    .option('--period <period>', 'งวดบัญชี (1-12) — Fiscal period')
    .action(async (opts: { year: string; period?: string }) => {
      const params: Record<string, string> = { year: opts.year };
      if (opts.period) params['period'] = opts.period;
      const result = await api.get<{ data: unknown }>('/api/v1/reports/cash-flow', params);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Cash Flow Statement — FY ${opts.year}:`);
    });

  return reports;
}
