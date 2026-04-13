import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { journal_entries } from './journal-entries.js';
import { accounting_standards } from './accounting-standards.js';

export const parallel_ledger_entries = pgTable('parallel_ledger_entries', {
  id: text('id').primaryKey(),
  journal_entry_id: text('journal_entry_id').notNull().references(() => journal_entries.id, { onDelete: 'cascade' }),
  standard_code: text('standard_code').notNull().references(() => accounting_standards.code),
  account_id: text('account_id').notNull(),
  description: text('description'),
  debit_satang: bigint('debit_satang', { mode: 'bigint' }).notNull().default(0n),
  credit_satang: bigint('credit_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ParallelLedgerEntry = typeof parallel_ledger_entries.$inferSelect;
export type NewParallelLedgerEntry = typeof parallel_ledger_entries.$inferInsert;
