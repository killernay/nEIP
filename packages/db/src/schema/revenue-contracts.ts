import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const revenue_contracts = pgTable('revenue_contracts', {
  id: text('id').primaryKey(),
  contract_number: text('contract_number').notNull(),
  customer_id: text('customer_id').notNull(),
  contract_date: text('contract_date').notNull(),
  total_price_satang: bigint('total_price_satang', { mode: 'bigint' }).notNull().default(0n),
  status: text('status', { enum: ['draft', 'active', 'completed', 'cancelled'] }).notNull().default('draft'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RevenueContract = typeof revenue_contracts.$inferSelect;
export type NewRevenueContract = typeof revenue_contracts.$inferInsert;
