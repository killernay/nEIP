import { pgTable, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { leave_types } from './leave-types.js';

/**
 * leave_accrual_rules — Rules for automatic leave accrual.
 */
export const leave_accrual_rules = pgTable('leave_accrual_rules', {
  id: text('id').primaryKey(),
  leave_type_id: text('leave_type_id')
    .notNull()
    .references(() => leave_types.id, { onDelete: 'cascade' }),
  accrual_per_month: numeric('accrual_per_month', { precision: 5, scale: 2 }).notNull().default('0'),
  max_carry_forward: integer('max_carry_forward').notNull().default(0),
  probation_months: integer('probation_months').notNull().default(0),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LeaveAccrualRule = typeof leave_accrual_rules.$inferSelect;
export type NewLeaveAccrualRule = typeof leave_accrual_rules.$inferInsert;
