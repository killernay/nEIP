import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { branches } from './branches.js';
import { warehouses } from './warehouses.js';

export const stock_transport_orders = pgTable('stock_transport_orders', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  from_branch_id: text('from_branch_id').notNull().references(() => branches.id),
  to_branch_id: text('to_branch_id').notNull().references(() => branches.id),
  from_warehouse_id: text('from_warehouse_id').references(() => warehouses.id),
  to_warehouse_id: text('to_warehouse_id').references(() => warehouses.id),
  status: text('status').notNull().default('created')
    .$type<'created' | 'shipped' | 'in_transit' | 'received' | 'cancelled'>(),
  shipped_at: timestamp('shipped_at', { withTimezone: true }),
  received_at: timestamp('received_at', { withTimezone: true }),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueDocTenant: unique().on(table.document_number, table.tenant_id),
}));

export type StockTransportOrder = typeof stock_transport_orders.$inferSelect;
export type NewStockTransportOrder = typeof stock_transport_orders.$inferInsert;
