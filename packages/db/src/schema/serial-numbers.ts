import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { batches } from './batches.js';

export const serial_numbers = pgTable('serial_numbers', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  serial_number: text('serial_number').notNull(),
  batch_id: text('batch_id')
    .references(() => batches.id),
  status: text('status').notNull().default('available').$type<'available' | 'sold' | 'returned'>(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueSerial: unique().on(table.product_id, table.serial_number, table.tenant_id),
}));

export type SerialNumber = typeof serial_numbers.$inferSelect;
export type NewSerialNumber = typeof serial_numbers.$inferInsert;
