import { pgTable, text, numeric, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { bom_headers } from './bom-headers.js';
import { batches } from './batches.js';
import { work_centers } from './work-centers.js';
import { warehouses } from './warehouses.js';

export const process_orders = pgTable('process_orders', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  product_id: text('product_id').notNull().references(() => products.id),
  recipe_id: text('recipe_id').references(() => bom_headers.id),
  batch_id: text('batch_id').references(() => batches.id),
  planned_quantity: numeric('planned_quantity', { precision: 18, scale: 4 }).notNull(),
  actual_quantity: numeric('actual_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  status: text('status').notNull().default('planned')
    .$type<'planned' | 'released' | 'in_progress' | 'completed' | 'closed' | 'cancelled'>(),
  planned_start: date('planned_start'),
  planned_end: date('planned_end'),
  actual_start: timestamp('actual_start', { withTimezone: true }),
  actual_end: timestamp('actual_end', { withTimezone: true }),
  work_center_id: text('work_center_id').references(() => work_centers.id),
  warehouse_id: text('warehouse_id').references(() => warehouses.id),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueDocTenant: unique().on(table.document_number, table.tenant_id),
}));

export type ProcessOrder = typeof process_orders.$inferSelect;
export type NewProcessOrder = typeof process_orders.$inferInsert;
