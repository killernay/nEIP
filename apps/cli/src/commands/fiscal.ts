/**
 * neip fiscal — Fiscal Year and Period management commands.
 *
 * Commands:
 *   neip fiscal years                   — GET  /api/v1/fiscal-years
 *   neip fiscal years create            — POST /api/v1/fiscal-years
 *   neip fiscal period close <id>       — POST /api/v1/fiscal-periods/:id/close
 *   neip fiscal period reopen <id>      — POST /api/v1/fiscal-periods/:id/reopen
 */

import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Response shape for a fiscal year resource. */
interface FiscalYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  periods: FiscalPeriod[];
  createdAt: string;
}

/** Response shape for a fiscal period resource. */
interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
}

/** List response wrapper (API returns { items: [...] }). */
interface ItemsResponse<T> {
  items: T[];
}

/** Options accepted by `fiscal years list` (implicit). */
interface FiscalYearsListOptions {
  limit: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a single line from stdin with a prompt. */
function promptLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function fiscalYearsList(options: FiscalYearsListOptions): Promise<void> {
  const params: Record<string, string> = {
    limit: options.limit,
  };

  const result = await api.get<ItemsResponse<FiscalYear>>('/api/v1/fiscal-years', params);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  const { items } = result.data;

  printSuccess(
    items,
    `Showing ${String(items.length)} fiscal years`,
  );
}

async function fiscalYearsCreate(): Promise<void> {
  process.stdout.write('Creating a new fiscal year. Enter details below.\n');

  const yearStr = await promptLine('Fiscal year (e.g. 2026): ');
  const startDate = await promptLine('Start date (YYYY-MM-DD): ');
  const endDate = await promptLine('End date (YYYY-MM-DD): ');

  const year = Number(yearStr);
  if (Number.isNaN(year) || year < 2000 || year > 2100) {
    printError('Fiscal year must be a valid 4-digit year.');
    process.exit(1);
  }
  if (startDate === '') {
    printError('Start date is required.');
    process.exit(1);
  }
  if (endDate === '') {
    printError('End date is required.');
    process.exit(1);
  }

  const result = await api.post<{ data: FiscalYear }>('/api/v1/fiscal-years', {
    year,
    startDate,
    endDate,
  });

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data.data, `Fiscal year ${String(year)} created.`);
}

async function fiscalPeriodClose(id: string): Promise<void> {
  if (id === '') {
    printError('Period ID is required.');
    process.exit(1);
  }

  const result = await api.post<{ data: FiscalPeriod }>(`/api/v1/fiscal-periods/${id}/close`);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data.data, `Fiscal period ${id} closed.`);
}

async function fiscalPeriodReopen(id: string): Promise<void> {
  if (id === '') {
    printError('Period ID is required.');
    process.exit(1);
  }

  const result = await api.post<{ data: FiscalPeriod }>(`/api/v1/fiscal-periods/${id}/reopen`);

  if (!result.ok) {
    printError(result.error.detail, result.error.status);
    process.exit(1);
  }

  printSuccess(result.data.data, `Fiscal period ${id} reopened.`);
}

// ---------------------------------------------------------------------------
// Command builder
// ---------------------------------------------------------------------------

/**
 * Build the `fiscal` command group.
 */
export function buildFiscalCommand(): Command {
  const fiscal = new Command('fiscal')
    .description('จัดการปีบัญชีและงวดบัญชี — Fiscal year and period management')
    .addHelpText('after', `
Examples:
  $ neip fiscal years                       # แสดงปีบัญชีทั้งหมด
  $ neip fiscal years create                # สร้างปีบัญชีใหม่ (interactive)
  $ neip fiscal period close <id>           # ปิดงวดบัญชี
  $ neip fiscal period reopen <id>          # เปิดงวดบัญชีที่ปิดแล้ว
  `);

  // neip fiscal years [list]
  const years = new Command('years')
    .description('จัดการปีบัญชี — Fiscal year operations');

  years
    .option('--limit <number>', 'จำนวนสูงสุด — Maximum number of fiscal years to return', '20')
    .action(async (options: FiscalYearsListOptions) => {
      await fiscalYearsList(options);
    });

  years
    .command('create')
    .description('สร้างปีบัญชีใหม่ (interactive) — Create a new fiscal year interactively')
    .action(async () => {
      await fiscalYearsCreate();
    });

  fiscal.addCommand(years);

  // neip fiscal period close/reopen
  const period = new Command('period')
    .description('จัดการงวดบัญชี — Fiscal period operations');

  period
    .command('close <id>')
    .description('ปิดงวดบัญชีเพื่อป้องกันการลงรายการเพิ่ม — Close a fiscal period to prevent further postings')
    .action(async (id: string) => {
      await fiscalPeriodClose(id);
    });

  period
    .command('reopen <id>')
    .description('เปิดงวดบัญชีที่ปิดแล้ว — Reopen a previously closed fiscal period')
    .action(async (id: string) => {
      await fiscalPeriodReopen(id);
    });

  fiscal.addCommand(period);

  // neip fiscal close-year / reopen-year
  fiscal
    .command('close-year <yearId>')
    .description('ปิดปีบัญชี — Close a fiscal year to prevent further postings')
    .action(async (yearId: string) => {
      const result = await api.post<{ data: FiscalYear }>(`/api/v1/fiscal-years/${yearId}/close`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Fiscal year ${yearId} closed.`);
    });

  fiscal
    .command('reopen-year <yearId>')
    .description('เปิดปีบัญชีที่ปิดแล้ว — Reopen a previously closed fiscal year')
    .action(async (yearId: string) => {
      const result = await api.post<{ data: FiscalYear }>(`/api/v1/fiscal-years/${yearId}/reopen`);
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Fiscal year ${yearId} reopened.`);
    });

  return fiscal;
}
