/**
 * GL (General Ledger) barrel export — Stories 2.4, 2.5, 2.6, 2.7.
 */

export { createChartOfAccountsTools } from './chart-of-accounts.js';
export type { AccountOutput } from './chart-of-accounts.js';

export { createJournalEntryTools } from './journal-entry.js';
export type { JournalEntryOutput, JournalEntryLineOutput } from './journal-entry.js';

export { DocumentNumberingService, formatDocumentNumber, nextDocNumber } from './document-numbering.js';
export type { DocType } from './document-numbering.js';

export { createFiscalPeriodTools } from './fiscal-period.js';
export type { FiscalYearOutput, FiscalPeriodOutput } from './fiscal-period.js';
