import { pgTable, text, integer, bigint, timestamp } from 'drizzle-orm/pg-core';
import { vendor_returns } from './vendor-returns.js';
import { products } from './products.js';

export const vendor_return_lines = pgTable('vendor_return_lines', {
  id: text('id').primaryKey(),
  vendor_return_id: text('vendor_return_id')
    .notNull()
    .references(() => vendor_returns.id, { onDelete: 'cascade' }),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  unit_price_satang: bigint('unit_price_satang', { mode: 'bigint' }).notNull().default(0n),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VendorReturnLine = typeof vendor_return_lines.$inferSelect;
export type NewVendorReturnLine = typeof vendor_return_lines.$inferInsert;
