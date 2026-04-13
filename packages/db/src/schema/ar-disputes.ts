import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const ar_disputes = pgTable('ar_disputes', {
  id: text('id').primaryKey(),
  invoice_id: text('invoice_id').notNull(),
  customer_id: text('customer_id').notNull(),
  dispute_type: text('dispute_type').notNull(),
  amount_satang: bigint('amount_satang', { mode: 'bigint' }).notNull().default(0n),
  status: text('status', {
    enum: ['open', 'in_progress', 'resolved', 'closed'],
  }).notNull().default('open'),
  resolution: text('resolution'),
  credit_note_id: text('credit_note_id'),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ArDispute = typeof ar_disputes.$inferSelect;
export type NewArDispute = typeof ar_disputes.$inferInsert;
