import { pgTable, text, date, bigint, boolean, timestamp } from 'drizzle-orm/pg-core';
import { rfqs } from './rfqs.js';
import { vendors } from './vendors.js';

/**
 * rfq_vendors — Vendor responses to RFQs.
 */
export const rfq_vendors = pgTable('rfq_vendors', {
  id: text('id').primaryKey(),
  rfq_id: text('rfq_id')
    .notNull()
    .references(() => rfqs.id, { onDelete: 'cascade' }),
  vendor_id: text('vendor_id')
    .notNull()
    .references(() => vendors.id),
  response_date: date('response_date'),
  total_amount_satang: bigint('total_amount_satang', { mode: 'bigint' }).default(0n),
  selected: boolean('selected').notNull().default(false),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RfqVendor = typeof rfq_vendors.$inferSelect;
export type NewRfqVendor = typeof rfq_vendors.$inferInsert;
