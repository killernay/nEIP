import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { warehouses } from './warehouses.js';

/**
 * stock_movements — Every inventory transaction (receive / issue / transfer / adjust / return).
 * quantity is signed: positive for inbound, negative for outbound.
 */
export const stock_movements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  warehouse_id: text('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  movement_type: text('movement_type')
    .notNull()
    .$type<'receive' | 'issue' | 'transfer' | 'adjust' | 'return'>(),
  quantity: integer('quantity').notNull(),
  reference_type: text('reference_type')
    .$type<'purchase_order' | 'sales_order' | 'delivery_note' | 'manual' | 'transfer'>(),
  reference_id: text('reference_id'),
  batch_number: text('batch_number'),
  notes: text('notes'),
  balance_after: integer('balance_after').notNull().default(0),
  unit_cost_satang: integer('unit_cost_satang').notNull().default(0),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StockMovement = typeof stock_movements.$inferSelect;
export type NewStockMovement = typeof stock_movements.$inferInsert;
