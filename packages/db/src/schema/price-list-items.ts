import { pgTable, text, bigint, real, timestamp } from 'drizzle-orm/pg-core';
import { price_lists } from './price-lists.js';
import { products } from './products.js';

/**
 * price_list_items — Line items in a price list (product-specific pricing).
 */
export const price_list_items = pgTable('price_list_items', {
  id: text('id').primaryKey(),
  price_list_id: text('price_list_id')
    .notNull()
    .references(() => price_lists.id, { onDelete: 'cascade' }),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  unit_price_satang: bigint('unit_price_satang', { mode: 'bigint' }).notNull().default(0n),
  min_quantity: real('min_quantity').notNull().default(1),
  discount_percent: real('discount_percent').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PriceListItem = typeof price_list_items.$inferSelect;
export type NewPriceListItem = typeof price_list_items.$inferInsert;
