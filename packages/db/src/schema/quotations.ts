import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * quotations — Accounts Receivable quotation headers (ใบเสนอราคา).
 *
 * Status transitions:
 *   draft  → sent      (via quotations/:id/send)
 *   sent   → approved  (via quotations/:id/approve)
 *   sent   → rejected  (via quotations/:id/reject)
 *   approved → converted (via quotations/:id/convert — creates an invoice)
 *   any    → expired   (when valid_until date has passed, checked on read)
 */
export const quotations = pgTable('quotations', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  customer_id: text('customer_id').notNull(),
  customer_name: text('customer_name').notNull(),
  subject: text('subject').notNull(),
  notes: text('notes'),
  status: text('status', {
    enum: ['draft', 'sent', 'approved', 'rejected', 'converted', 'expired'],
  })
    .notNull()
    .default('draft'),
  valid_until: text('valid_until').notNull(), // YYYY-MM-DD
  total_satang: bigint('total_satang', { mode: 'bigint' }).notNull().default(0n),
  converted_invoice_id: text('converted_invoice_id'), // FK to invoices — set on convert (QT→INV)
  converted_sales_order_id: text('converted_sales_order_id'), // FK to sales_orders — set on convert-to-order (QT→SO)
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  rejected_at: timestamp('rejected_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
