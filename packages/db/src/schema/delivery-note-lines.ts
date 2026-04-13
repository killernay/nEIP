import { pgTable, text, real, timestamp } from 'drizzle-orm/pg-core';
import { delivery_notes } from './delivery-notes.js';
import { products } from './products.js';
import { warehouses } from './warehouses.js';

/**
 * delivery_note_lines — Line items for a delivery note.
 *
 * Each line references a sales_order_line_id so the system can update
 * the SO line's delivered_quantity when the DO is marked as delivered.
 */
export const delivery_note_lines = pgTable('delivery_note_lines', {
  id: text('id').primaryKey(),
  delivery_note_id: text('delivery_note_id')
    .notNull()
    .references(() => delivery_notes.id, { onDelete: 'cascade' }),
  sales_order_line_id: text('sales_order_line_id').notNull(), // FK to sales_order_lines
  description: text('description').notNull(),
  quantity_delivered: real('quantity_delivered').notNull(),
  product_id: text('product_id').references(() => products.id),
  warehouse_id: text('warehouse_id').references(() => warehouses.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DeliveryNoteLine = typeof delivery_note_lines.$inferSelect;
export type NewDeliveryNoteLine = typeof delivery_note_lines.$inferInsert;
