import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { vendors } from './vendors.js';
import { purchase_orders } from './purchase-orders.js';

export const vendor_returns = pgTable('vendor_returns', {
  id: text('id').primaryKey(),
  vendor_id: text('vendor_id')
    .notNull()
    .references(() => vendors.id),
  po_id: text('po_id')
    .references(() => purchase_orders.id),
  status: text('status').notNull().default('draft').$type<'draft' | 'shipped' | 'received_credit'>(),
  reason: text('reason'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VendorReturn = typeof vendor_returns.$inferSelect;
export type NewVendorReturn = typeof vendor_returns.$inferInsert;
