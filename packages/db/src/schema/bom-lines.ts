import { pgTable, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { bom_headers } from './bom-headers.js';

/**
 * bom_lines — Components that make up a BOM.
 */
export const bom_lines = pgTable('bom_lines', {
  id: text('id').primaryKey(),
  bom_id: text('bom_id')
    .notNull()
    .references(() => bom_headers.id, { onDelete: 'cascade' }),
  component_product_id: text('component_product_id')
    .notNull()
    .references(() => products.id),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('1'),
  unit: text('unit').notNull().default('EA'),
  scrap_percent: numeric('scrap_percent', { precision: 5, scale: 2 }).default('0'),
  position: integer('position').notNull().default(0),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type BomLine = typeof bom_lines.$inferSelect;
export type NewBomLine = typeof bom_lines.$inferInsert;
