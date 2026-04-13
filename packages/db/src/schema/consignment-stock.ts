import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { vendors } from './vendors.js';
import { products } from './products.js';
import { warehouses } from './warehouses.js';

export const consignment_stock = pgTable('consignment_stock', {
  id: text('id').primaryKey(),
  vendor_id: text('vendor_id').notNull().references(() => vendors.id),
  product_id: text('product_id').notNull().references(() => products.id),
  warehouse_id: text('warehouse_id').notNull().references(() => warehouses.id),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  consumed_quantity: numeric('consumed_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  status: text('status').notNull().default('available').$type<'available' | 'consumed' | 'returned'>(),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ConsignmentStock = typeof consignment_stock.$inferSelect;
export type NewConsignmentStock = typeof consignment_stock.$inferInsert;
