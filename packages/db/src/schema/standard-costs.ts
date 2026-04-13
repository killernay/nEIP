import { pgTable, text, integer, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const standard_costs = pgTable('standard_costs', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull(),
  fiscal_year: integer('fiscal_year').notNull(),
  material_cost_satang: bigint('material_cost_satang', { mode: 'bigint' }).notNull().default(0n),
  labor_cost_satang: bigint('labor_cost_satang', { mode: 'bigint' }).notNull().default(0n),
  overhead_cost_satang: bigint('overhead_cost_satang', { mode: 'bigint' }).notNull().default(0n),
  total_standard_cost_satang: bigint('total_standard_cost_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StandardCost = typeof standard_costs.$inferSelect;
export type NewStandardCost = typeof standard_costs.$inferInsert;
