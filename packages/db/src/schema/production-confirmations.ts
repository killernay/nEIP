import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { production_orders } from './production-orders.js';

/**
 * production_confirmations — Records of completed production quantities,
 * labor hours, and machine hours against a production order.
 */
export const production_confirmations = pgTable('production_confirmations', {
  id: text('id').primaryKey(),
  production_order_id: text('production_order_id')
    .notNull()
    .references(() => production_orders.id),
  confirmed_quantity: numeric('confirmed_quantity', { precision: 18, scale: 4 }).notNull(),
  scrap_quantity: numeric('scrap_quantity', { precision: 18, scale: 4 }).default('0'),
  labor_hours: numeric('labor_hours', { precision: 10, scale: 2 }).default('0'),
  machine_hours: numeric('machine_hours', { precision: 10, scale: 2 }).default('0'),
  notes: text('notes'),
  confirmed_by: text('confirmed_by'),
  confirmed_at: timestamp('confirmed_at', { withTimezone: true }).defaultNow(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
});

export type ProductionConfirmation = typeof production_confirmations.$inferSelect;
export type NewProductionConfirmation = typeof production_confirmations.$inferInsert;
