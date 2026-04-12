/**
 * Shared mutation-flag types used by every command that writes data.
 *
 * Story 6.3 — --dry-run + --explain
 *
 * These flags are declared as global options on the root Commander program
 * (src/index.ts) so that every sub-command inherits them through
 * `Command.optsWithGlobals()`.  The types below are re-exported so each
 * handler can consume them without re-declaring the same shape.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Global mutation-control flags injected by the Commander preAction hook.
 * Commands read these via `command.optsWithGlobals<MutationFlags>()`.
 */
export interface MutationFlags {
  /**
   * When true the command must NOT call any write API.  It should print a
   * preview of what would happen, then emit the "DRY RUN — no changes made"
   * sentinel line.
   */
  dryRun: boolean;

  /**
   * When true the command should print a human-readable double-entry
   * breakdown (debit / credit accounts + amounts) before (or instead of)
   * executing the write.  Can be combined with --dry-run.
   */
  explain: boolean;

  /**
   * When true, interactive prompts (readline, inquirer) must not be used.
   * Commands should fail with a clear error if required arguments are missing
   * instead of prompting. Intended for CI pipelines and scripted usage.
   */
  nonInteractive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Print the standard double-entry breakdown for a journal entry payload.
 *
 * Lines are written to stdout so they appear in `--format json` as plain
 * text before the JSON envelope.  This is intentional: the explain output
 * is always human-readable diagnostic text, not structured data.
 */
export function printDoubleEntryBreakdown(
  description: string,
  date: string,
  reference: string,
  lines: ReadonlyArray<{
    accountId: string;
    description: string;
    debit: number;
    credit: number;
  }>,
): void {
  process.stdout.write('\n--- Double-Entry Breakdown ---\n');
  process.stdout.write(`  Description : ${description}\n`);
  process.stdout.write(`  Date        : ${date}\n`);
  process.stdout.write(`  Reference   : ${reference}\n`);
  process.stdout.write('\n');

  // Header row
  const colAccount = 'Account ID';
  const colDesc = 'Description';
  const colDebit = 'Debit';
  const colCredit = 'Credit';

  // Determine column widths
  const accountWidth = Math.max(
    colAccount.length,
    ...lines.map((l) => l.accountId.length),
  );
  const descWidth = Math.max(
    colDesc.length,
    ...lines.map((l) => l.description.length),
  );
  const amountWidth = 12;

  const pad = (s: string, w: number): string => s.padEnd(w);
  const padR = (s: string, w: number): string => s.padStart(w);

  const header = [
    pad(colAccount, accountWidth),
    pad(colDesc, descWidth),
    padR(colDebit, amountWidth),
    padR(colCredit, amountWidth),
  ].join('  ');

  const separator = [
    '-'.repeat(accountWidth),
    '-'.repeat(descWidth),
    '-'.repeat(amountWidth),
    '-'.repeat(amountWidth),
  ].join('  ');

  process.stdout.write(`  ${header}\n`);
  process.stdout.write(`  ${separator}\n`);

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const debitStr = line.debit !== 0 ? line.debit.toFixed(2) : '';
    const creditStr = line.credit !== 0 ? line.credit.toFixed(2) : '';
    const row = [
      pad(line.accountId, accountWidth),
      pad(line.description, descWidth),
      padR(debitStr, amountWidth),
      padR(creditStr, amountWidth),
    ].join('  ');
    process.stdout.write(`  ${row}\n`);
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  process.stdout.write(`  ${separator}\n`);
  const totalsRow = [
    pad('TOTAL', accountWidth),
    pad('', descWidth),
    padR(totalDebit.toFixed(2), amountWidth),
    padR(totalCredit.toFixed(2), amountWidth),
  ].join('  ');
  process.stdout.write(`  ${totalsRow}\n`);

  const balanced = Math.abs(totalDebit - totalCredit) < 0.001;
  process.stdout.write(
    `\n  Balance check: ${balanced ? 'BALANCED' : `OUT OF BALANCE by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}\n`,
  );
  process.stdout.write('------------------------------\n\n');
}
