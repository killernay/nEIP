import { pgTable, text, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';

export const batches = pgTable('batches', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  batch_number: text('batch_number').notNull(),
  manufacture_date: date('manufacture_date'),
  expiry_date: date('expiry_date'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueBatch: unique().on(table.product_id, table.batch_number, table.tenant_id),
}));

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
