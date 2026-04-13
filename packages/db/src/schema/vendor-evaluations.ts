import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const vendor_evaluations = pgTable('vendor_evaluations', {
  id: text('id').primaryKey(),
  vendor_id: text('vendor_id').notNull(),
  period: text('period').notNull(),
  delivery_score: numeric('delivery_score', { precision: 5, scale: 2 }).notNull().default('0'),
  quality_score: numeric('quality_score', { precision: 5, scale: 2 }).notNull().default('0'),
  price_score: numeric('price_score', { precision: 5, scale: 2 }).notNull().default('0'),
  service_score: numeric('service_score', { precision: 5, scale: 2 }).notNull().default('0'),
  overall_score: numeric('overall_score', { precision: 5, scale: 2 }).notNull().default('0'),
  evaluator_id: text('evaluator_id').notNull(),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VendorEvaluation = typeof vendor_evaluations.$inferSelect;
export type NewVendorEvaluation = typeof vendor_evaluations.$inferInsert;
