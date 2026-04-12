import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { departments } from './departments.js';

/**
 * purchase_requisitions — Purchase requisition headers.
 */
export const purchase_requisitions = pgTable('purchase_requisitions', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  requester_id: text('requester_id').notNull(),
  department_id: text('department_id').references(() => departments.id),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  approved_by: text('approved_by'),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PurchaseRequisition = typeof purchase_requisitions.$inferSelect;
export type NewPurchaseRequisition = typeof purchase_requisitions.$inferInsert;
