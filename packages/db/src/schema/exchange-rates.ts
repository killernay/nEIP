import { pgTable, text, numeric, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const exchange_rates = pgTable('exchange_rates', {
  id: text('id').primaryKey(),
  from_currency: text('from_currency').notNull(),
  to_currency: text('to_currency').notNull(),
  rate: numeric('rate', { precision: 18, scale: 6 }).notNull(),
  effective_date: date('effective_date').notNull(),
  source: text('source').notNull().default('manual').$type<'manual' | 'bot'>(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueRate: unique().on(table.from_currency, table.to_currency, table.effective_date, table.tenant_id),
}));

export type ExchangeRate = typeof exchange_rates.$inferSelect;
export type NewExchangeRate = typeof exchange_rates.$inferInsert;
