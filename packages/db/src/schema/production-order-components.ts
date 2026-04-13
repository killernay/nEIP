import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { production_orders } from './production-orders.js';
import { warehouses } from './warehouses.js';

/**
 * production_order_components — BOM components exploded into a production order.
 */
export const production_order_components = pgTable('production_order_components', {
  id: text('id').primaryKey(),
  production_order_id: text('production_order_id')
    .notNull()
    .references(() => production_orders.id, { onDelete: 'cascade' }),
  component_product_id: text('component_product_id')
    .notNull()
    .references(() => products.id),
  required_quantity: numeric('required_quantity', { precision: 18, scale: 4 }).notNull(),
  issued_quantity: numeric('issued_quantity', { precision: 18, scale: 4 }).default('0'),
  scrap_quantity: numeric('scrap_quantity', { precision: 18, scale: 4 }).default('0'),
  warehouse_id: text('warehouse_id')
    .references(() => warehouses.id),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type ProductionOrderComponent = typeof production_order_components.$inferSelect;
export type NewProductionOrderComponent = typeof production_order_components.$inferInsert;
