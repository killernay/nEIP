import { pgTable, text, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { warehouses } from './warehouses.js';

/**
 * stock_counts — Physical inventory count headers.
 */
export const stock_counts = pgTable('stock_counts', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  warehouse_id: text('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  count_date: date('count_date').notNull(),
  status: text('status').notNull().default('open'),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  posted_at: timestamp('posted_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StockCount = typeof stock_counts.$inferSelect;
export type NewStockCount = typeof stock_counts.$inferInsert;
