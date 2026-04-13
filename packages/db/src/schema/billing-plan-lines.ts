import { pgTable, text, integer, bigint, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { billing_plans } from './billing-plans.js';

/**
 * billing_plan_lines — Individual milestones within a billing plan.
 *
 * Status: planned → billed
 */
export const billing_plan_lines = pgTable('billing_plan_lines', {
  id: text('id').primaryKey(),
  plan_id: text('plan_id')
    .notNull()
    .references(() => billing_plans.id, { onDelete: 'cascade' }),
  milestone_name: text('milestone_name').notNull(),
  billing_date: date('billing_date').notNull(),
  percentage: integer('percentage').notNull().default(0),
  amount_satang: bigint('amount_satang', { mode: 'bigint' }).notNull().default(0n),
  status: text('status').notNull().default('planned').$type<'planned' | 'billed'>(),
  invoice_id: text('invoice_id'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BillingPlanLine = typeof billing_plan_lines.$inferSelect;
export type NewBillingPlanLine = typeof billing_plan_lines.$inferInsert;
