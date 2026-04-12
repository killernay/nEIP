/**
 * neip gl journal — General Ledger journal entry commands.
 *
 * Commands:
 *   neip gl journal create              — create a new journal entry interactively
 *   neip gl journal list                — list journal entries (paginated)
 *   neip gl journal post <id>           — post a draft journal entry
 *
 * API notes:
 *   - POST /api/v1/journal-entries requires:
 *       { description, fiscalYear (int), fiscalPeriod (int), lines[] }
 *     where each line has { accountId, debitSatang (string), creditSatang (string) }
 *     Amounts are in satang (1 THB = 100 satang), stored as numeric strings.
 *   - GET  /api/v1/journal-entries returns { items, total, limit, offset, hasMore }
 *   - POST /api/v1/journal-entries/:id/post (no body, no Content-Type needed)
 *
 * Story 6.3 flags (inherited from root program via optsWithGlobals):
 *   --dry-run   Show what would be sent without making any API call.
 *   --explain   Print a double-entry debit/credit breakdown before executing.
 */

import { createInterface } from 'node:readline';
import { type Command, createCommand } from 'commander';
import { getConfigValue } from '../../lib/config-store.js';
import { type MutationFlags, printDoubleEntryBreakdown } from '../../lib/mutation-flags.js';
import { printError, printSuccess } from '../../output/formatter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single line item within a journal entry (API format). */
interface JournalLine {
  accountId: string;
  /** Amount in satang as a numeric string (100 satang = 1 THB). */
  debitSatang: string;
  /** Amount in satang as a numeric string. */
  creditSatang: string;
}

/** An interactive journal line with human-entered THB amounts. */
interface JournalLineInput {
  accountId: string;
  description: string;
  debitTHB: number;
  creditTHB: number;
}

/** Payload sent to create a journal entry. */
interface CreateJournalEntryPayload {
  description: string;
  fiscalYear: number;
  fiscalPeriod: number;
  lines: JournalLine[];
}

/** Response shape for a journal entry resource from the API. */
interface JournalEntry {
  id: string;
  documentNumber: string;
  description: string;
  status: 'draft' | 'posted' | 'voided';
  fiscalYear: number;
  fiscalPeriod: number;
  lines: unknown[];
  createdBy: string;
  postedAt: string | null;
  createdAt: string;
}

/** Paginated list response returned by the API. */
interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Options accepted by `gl journal list`. */
interface JournalListOptions {
  limit: string;
  offset: string;
  status?: string;
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

/**
 * Convert a THB amount (float) to satang string.
 * 1 THB = 100 satang. We round to avoid floating-point issues.
 */
function thbToSatang(thb: number): string {
  return String(Math.round(thb * 100));
}

/**
 * Perform an unauthenticated-style POST with no body (no Content-Type header).
 * Used for the journal post action where sending Content-Type: application/json
 * with an empty body causes a FastifyError.
 */
async function postNoBody(pathname: string, token: string, baseUrl: string): Promise<Response> {
  const url = new URL(pathname, baseUrl);
  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function journalCreate(flags: MutationFlags): Promise<void> {
  process.stdout.write('Creating a new journal entry. Enter details below.\n');

  const description = await promptLine('Description: ');
  const fiscalYearStr = await promptLine('Fiscal year (e.g. 2026): ');
  const fiscalPeriodStr = await promptLine('Fiscal period number (e.g. 1): ');

  if (description === '') {
    printError('Description is required.');
    process.exit(1);
  }

  const fiscalYear = parseInt(fiscalYearStr, 10);
  const fiscalPeriod = parseInt(fiscalPeriodStr, 10);

  if (Number.isNaN(fiscalYear) || fiscalYear < 1000) {
    printError('Fiscal year must be a valid 4-digit year.');
    process.exit(1);
  }
  if (Number.isNaN(fiscalPeriod) || fiscalPeriod < 1) {
    printError('Fiscal period must be a positive integer.');
    process.exit(1);
  }

  // Collect at least one line
  const linesInput: JournalLineInput[] = [];
  process.stdout.write('\nEnter line items (leave Account ID blank to finish):\n');

  for (;;) {
    const accountId = await promptLine(`  Line ${String(linesInput.length + 1)} — Account ID: `);
    if (accountId === '') break;

    const lineDescription = await promptLine('  Description (optional): ');
    const debitStr = await promptLine('  Debit amount in THB (0 if none): ');
    const creditStr = await promptLine('  Credit amount in THB (0 if none): ');

    const debitTHB = Number(debitStr === '' ? '0' : debitStr);
    const creditTHB = Number(creditStr === '' ? '0' : creditStr);

    if (Number.isNaN(debitTHB) || Number.isNaN(creditTHB)) {
      printError('Debit and credit must be numeric values.');
      process.exit(1);
    }

    linesInput.push({ accountId, description: lineDescription, debitTHB, creditTHB });
  }

  if (linesInput.length === 0) {
    printError('At least one line item is required.');
    process.exit(1);
  }

  // --explain: print double-entry breakdown before any API call
  if (flags.explain) {
    const breakdownLines = linesInput.map((l) => ({
      accountId: l.accountId,
      description: l.description,
      debit: l.debitTHB,
      credit: l.creditTHB,
    }));
    printDoubleEntryBreakdown(
      description,
      `FY ${String(fiscalYear)} Period ${String(fiscalPeriod)}`,
      '',
      breakdownLines,
    );
  }

  const apiLines: JournalLine[] = linesInput.map((l) => ({
    accountId: l.accountId,
    debitSatang: thbToSatang(l.debitTHB),
    creditSatang: thbToSatang(l.creditTHB),
  }));

  const payload: CreateJournalEntryPayload = {
    description,
    fiscalYear,
    fiscalPeriod,
    lines: apiLines,
  };

  // --dry-run: skip the API call and print the sentinel
  if (flags.dryRun) {
    process.stdout.write('DRY RUN — no changes made\n');
    printSuccess(payload, 'Preview of journal entry that would be created:');
    return;
  }

  const token = getConfigValue('accessToken') ?? '';
  const baseUrl = getConfigValue('apiUrl') ?? 'http://localhost:5400';

  const response = await fetch(new URL('/api/v1/journal-entries', baseUrl).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { detail?: string };
      errorDetail = errorBody.detail ?? errorDetail;
    } catch { /* ignore */ }
    printError(errorDetail, response.status);
    process.exit(1);
  }

  const entry = (await response.json()) as JournalEntry;
  printSuccess(entry, `Journal entry ${entry.documentNumber} created (id: ${entry.id}).`);
}

async function journalList(options: JournalListOptions): Promise<void> {
  // Only pass explicit overrides to avoid Fastify integer-coercion issues
  const params: Record<string, string> = {};
  if (options.limit !== '20') params['limit'] = options.limit;
  if (options.offset !== '0') params['offset'] = options.offset;
  if (options.status !== undefined && options.status !== '') {
    params['status'] = options.status;
  }

  const token = getConfigValue('accessToken') ?? '';
  const baseUrl = getConfigValue('apiUrl') ?? 'http://localhost:5400';
  const url = new URL('/api/v1/journal-entries', baseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { detail?: string };
      errorDetail = errorBody.detail ?? errorDetail;
    } catch { /* ignore */ }
    printError(errorDetail, response.status);
    process.exit(1);
  }

  const result = (await response.json()) as ListResponse<JournalEntry>;
  const { items, total, limit, offset } = result;

  const display = items.map((e) => ({
    id: e.id,
    documentNumber: e.documentNumber,
    description: e.description,
    status: e.status,
    fiscalYear: String(e.fiscalYear),
    fiscalPeriod: String(e.fiscalPeriod),
    createdAt: e.createdAt,
    postedAt: e.postedAt ?? '',
  }));

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  printSuccess(
    display,
    `Showing ${String(items.length)} of ${String(total)} entries (page ${String(page)}/${String(totalPages)})`,
  );
}

async function journalPost(id: string): Promise<void> {
  if (id === '') {
    printError('Journal entry ID is required.');
    process.exit(1);
  }

  const token = getConfigValue('accessToken') ?? '';
  const baseUrl = getConfigValue('apiUrl') ?? 'http://localhost:5400';

  // Must NOT send Content-Type: application/json with an empty body — Fastify rejects it.
  const response = await postNoBody(`/api/v1/journal-entries/${id}/post`, token, baseUrl);

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { detail?: string };
      errorDetail = errorBody.detail ?? errorDetail;
    } catch { /* ignore */ }
    printError(errorDetail, response.status);
    process.exit(1);
  }

  const entry = (await response.json()) as JournalEntry;
  printSuccess(entry, `Journal entry ${entry.documentNumber} posted successfully.`);
}

// ---------------------------------------------------------------------------
// Command builder
// ---------------------------------------------------------------------------

/**
 * Build the `gl journal` sub-command group.
 */
export function buildJournalCommand(): Command {
  const journal = createCommand('journal')
    .description('จัดการรายการบัญชี (Journal Entries) — General Ledger journal entry operations')
    .addHelpText('after', `
Examples:
  $ neip gl journal create                       # สร้างรายการบัญชีใหม่ (interactive)
  $ neip gl journal create --dry-run             # ดูตัวอย่างโดยไม่บันทึก
  $ neip gl journal create --explain             # แสดง debit/credit breakdown
  $ neip gl journal list                         # แสดงรายการบัญชีทั้งหมด
  $ neip gl journal list --status posted         # เฉพาะที่ post แล้ว
  $ neip gl journal post <id>                    # post รายการบัญชี draft

Note: Amounts are entered in THB (Thai Baht). The system stores as satang.
  `);

  journal
    .command('create')
    .description('สร้างรายการบัญชีใหม่ (interactive) — Create a new journal entry interactively')
    .action(async function (this: Command) {
      // Read --dry-run / --explain from the global option chain
      const globals = this.optsWithGlobals<MutationFlags>();
      await journalCreate({
        dryRun: globals.dryRun === true,
        explain: globals.explain === true,
        nonInteractive: globals.nonInteractive === true,
      });
    });

  journal
    .command('list')
    .description('แสดงรายการบัญชี — List journal entries with optional pagination and status filter')
    .option('--limit <number>', 'จำนวนสูงสุด — Maximum number of entries to return', '20')
    .option('--offset <number>', 'ข้าม N รายการแรก — Number of entries to skip', '0')
    .option('--status <status>', 'กรองตามสถานะ: draft, posted, voided — Filter by status')
    .action(async (options: JournalListOptions) => {
      await journalList(options);
    });

  journal
    .command('post <id>')
    .description('Post รายการบัญชี draft ให้เป็น permanent — Post a draft journal entry, making it permanent')
    .action(async (id: string) => {
      await journalPost(id);
    });

  return journal;
}
