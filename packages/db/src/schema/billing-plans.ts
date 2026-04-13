import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * billing_plans — Milestone billing plan headers (SAP billing plans).
 */
export const billing_plans = pgTable('billing_plans', {
  id: text('id').primaryKey(),
  reference_type: text('reference_type').notNull().$type<'project' | 'sales_order'>(),
  reference_id: text('reference_id').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BillingPlan = typeof billing_plans.$inferSelect;
export type NewBillingPlan = typeof billing_plans.$inferInsert;
