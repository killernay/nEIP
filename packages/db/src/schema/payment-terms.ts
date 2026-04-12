import { pgTable, text, integer, real, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * payment_terms — Standard payment terms (NET30, COD, 2/10NET30, etc.)
 */
export const payment_terms = pgTable('payment_terms', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  days: integer('days').notNull().default(30),
  discount_percent: real('discount_percent').notNull().default(0),
  discount_days: integer('discount_days').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCodeTenant: unique().on(table.code, table.tenant_id),
}));

export type PaymentTerm = typeof payment_terms.$inferSelect;
export type NewPaymentTerm = typeof payment_terms.$inferInsert;
