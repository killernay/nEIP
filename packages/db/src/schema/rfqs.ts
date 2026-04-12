import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { purchase_requisitions } from './purchase-requisitions.js';

/**
 * rfqs — Request for Quotation headers.
 */
export const rfqs = pgTable('rfqs', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  pr_id: text('pr_id').references(() => purchase_requisitions.id),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Rfq = typeof rfqs.$inferSelect;
export type NewRfq = typeof rfqs.$inferInsert;
