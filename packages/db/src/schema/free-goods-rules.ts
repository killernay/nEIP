import { pgTable, text, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * free_goods_rules — Buy X get Y free promotions (SAP VBN1).
 */
export const free_goods_rules = pgTable('free_goods_rules', {
  id: text('id').primaryKey(),
  buy_product_id: text('buy_product_id').notNull(),
  buy_quantity: integer('buy_quantity').notNull().default(1),
  free_product_id: text('free_product_id').notNull(),
  free_quantity: integer('free_quantity').notNull().default(1),
  valid_from: date('valid_from').notNull(),
  valid_to: date('valid_to').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type FreeGoodsRule = typeof free_goods_rules.$inferSelect;
export type NewFreeGoodsRule = typeof free_goods_rules.$inferInsert;
