import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * ic_invoices — Intercompany billing invoice tracking.
 *
 * When Company A sells to Company B's customer:
 *   source_invoice_id = A→B invoice
 *   target_invoice_id = B→A mirror
 *   customer_invoice_id = B→customer invoice
 */
export const ic_invoices = pgTable('ic_invoices', {
  id: text('id').primaryKey(),
  source_company_id: text('source_company_id').notNull(),
  target_company_id: text('target_company_id').notNull(),
  source_invoice_id: text('source_invoice_id'),
  target_invoice_id: text('target_invoice_id'),
  customer_invoice_id: text('customer_invoice_id'),
  amount_satang: bigint('amount_satang', { mode: 'bigint' }).notNull().default(0n),
  status: text('status').notNull().default('draft').$type<'draft' | 'posted' | 'settled'>(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type IcInvoice = typeof ic_invoices.$inferSelect;
export type NewIcInvoice = typeof ic_invoices.$inferInsert;
