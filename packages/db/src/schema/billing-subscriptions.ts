import { pgTable, text, bigint, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * billing_subscriptions — Periodic / subscription billing (monthly, quarterly, annually).
 *
 * Status: active → paused | cancelled
 */
export const billing_subscriptions = pgTable('billing_subscriptions', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull(),
  description: text('description').notNull(),
  amount_satang: bigint('amount_satang', { mode: 'bigint' }).notNull().default(0n),
  frequency: text('frequency').notNull().default('monthly').$type<'monthly' | 'quarterly' | 'annually'>(),
  next_billing_date: date('next_billing_date').notNull(),
  end_date: date('end_date'),
  status: text('status').notNull().default('active').$type<'active' | 'paused' | 'cancelled'>(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BillingSubscription = typeof billing_subscriptions.$inferSelect;
export type NewBillingSubscription = typeof billing_subscriptions.$inferInsert;
