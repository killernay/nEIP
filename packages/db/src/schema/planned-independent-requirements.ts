import { pgTable, text, numeric, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';

export const planned_independent_requirements = pgTable('planned_independent_requirements', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id),
  period_date: date('period_date').notNull(),
  planned_quantity: numeric('planned_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  actual_quantity: numeric('actual_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  source: text('source').notNull().default('manual').$type<'forecast' | 'manual' | 'ai_prediction'>(),
  version: integer('version').notNull().default(1),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlannedIndependentRequirement = typeof planned_independent_requirements.$inferSelect;
export type NewPlannedIndependentRequirement = typeof planned_independent_requirements.$inferInsert;
