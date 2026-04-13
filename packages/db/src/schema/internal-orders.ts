import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const internal_orders = pgTable('internal_orders', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  order_type: text('order_type', {
    enum: ['overhead', 'investment', 'accrual'],
  }).notNull().default('overhead'),
  status: text('status', {
    enum: ['open', 'released', 'technically_complete', 'closed'],
  }).notNull().default('open'),
  budget_satang: bigint('budget_satang', { mode: 'bigint' }).notNull().default(0n),
  actual_satang: bigint('actual_satang', { mode: 'bigint' }).notNull().default(0n),
  settlement_cost_center_id: text('settlement_cost_center_id'),
  settlement_gl_account_id: text('settlement_gl_account_id'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type InternalOrder = typeof internal_orders.$inferSelect;
export type NewInternalOrder = typeof internal_orders.$inferInsert;
