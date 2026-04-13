import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { production_orders } from './production-orders.js';
import { products } from './products.js';
import { warehouses } from './warehouses.js';

export const production_outputs = pgTable('production_outputs', {
  id: text('id').primaryKey(),
  production_order_id: text('production_order_id').notNull().references(() => production_orders.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id),
  output_type: text('output_type').notNull().default('main').$type<'main' | 'co_product' | 'by_product'>(),
  planned_quantity: numeric('planned_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  actual_quantity: numeric('actual_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  cost_allocation_percent: numeric('cost_allocation_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  warehouse_id: text('warehouse_id').references(() => warehouses.id),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProductionOutput = typeof production_outputs.$inferSelect;
export type NewProductionOutput = typeof production_outputs.$inferInsert;
