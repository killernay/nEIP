import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const cost_allocation_rules = pgTable('cost_allocation_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  source_cost_center_id: text('source_cost_center_id').notNull(),
  target_cost_center_ids: text('target_cost_center_ids').array().notNull(),
  allocation_basis: text('allocation_basis', {
    enum: ['fixed_percent', 'headcount', 'area'],
  }).notNull().default('fixed_percent'),
  percentages: numeric('percentages', { precision: 10, scale: 4 }).array().notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CostAllocationRule = typeof cost_allocation_rules.$inferSelect;
export type NewCostAllocationRule = typeof cost_allocation_rules.$inferInsert;
