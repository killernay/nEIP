import { pgTable, text, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * price_lists — Named price lists with validity periods.
 */
export const price_lists = pgTable('price_lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('THB'),
  valid_from: date('valid_from'),
  valid_to: date('valid_to'),
  is_active: boolean('is_active').notNull().default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PriceList = typeof price_lists.$inferSelect;
export type NewPriceList = typeof price_lists.$inferInsert;
