import { pgTable, text, integer, numeric, bigint, timestamp } from 'drizzle-orm/pg-core';
import { purchase_requisitions } from './purchase-requisitions.js';

/**
 * pr_lines — Line items for purchase requisitions.
 */
export const pr_lines = pgTable('pr_lines', {
  id: text('id').primaryKey(),
  purchase_requisition_id: text('purchase_requisition_id')
    .notNull()
    .references(() => purchase_requisitions.id, { onDelete: 'cascade' }),
  line_number: integer('line_number').notNull(),
  product_id: text('product_id'),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  estimated_price_satang: bigint('estimated_price_satang', { mode: 'bigint' }).notNull().default(0n),
  amount_satang: bigint('amount_satang', { mode: 'bigint' }).notNull().default(0n),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PrLine = typeof pr_lines.$inferSelect;
export type NewPrLine = typeof pr_lines.$inferInsert;
