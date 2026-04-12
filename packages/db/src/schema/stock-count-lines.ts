import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { stock_counts } from './stock-counts.js';

/**
 * stock_count_lines — Line items for physical inventory counts.
 */
export const stock_count_lines = pgTable('stock_count_lines', {
  id: text('id').primaryKey(),
  stock_count_id: text('stock_count_id')
    .notNull()
    .references(() => stock_counts.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull(),
  book_quantity: integer('book_quantity').notNull().default(0),
  actual_quantity: integer('actual_quantity'),
  variance: integer('variance'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StockCountLine = typeof stock_count_lines.$inferSelect;
export type NewStockCountLine = typeof stock_count_lines.$inferInsert;
