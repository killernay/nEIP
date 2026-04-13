import { pgTable, text, numeric, timestamp, date } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { bom_headers } from './bom-headers.js';
import { work_centers } from './work-centers.js';
import { warehouses } from './warehouses.js';

/**
 * production_orders — Manufacturing production orders linked to a BOM.
 */
export const production_orders = pgTable('production_orders', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  bom_id: text('bom_id')
    .notNull()
    .references(() => bom_headers.id),
  planned_quantity: numeric('planned_quantity', { precision: 18, scale: 4 }).notNull(),
  completed_quantity: numeric('completed_quantity', { precision: 18, scale: 4 }).default('0'),
  scrap_quantity: numeric('scrap_quantity', { precision: 18, scale: 4 }).default('0'),
  status: text('status')
    .notNull()
    .default('planned')
    .$type<'planned' | 'released' | 'in_progress' | 'completed' | 'closed' | 'cancelled'>(),
  planned_start: date('planned_start'),
  planned_end: date('planned_end'),
  actual_start: timestamp('actual_start', { withTimezone: true }),
  actual_end: timestamp('actual_end', { withTimezone: true }),
  work_center_id: text('work_center_id')
    .references(() => work_centers.id),
  warehouse_id: text('warehouse_id')
    .references(() => warehouses.id),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type ProductionOrder = typeof production_orders.$inferSelect;
export type NewProductionOrder = typeof production_orders.$inferInsert;
